#!/usr/bin/env node
/**
 * InspireDesign MCP 服务（原型阶段）
 *
 * 提供两个工具：
 *   - list_modes         列出模式（开场确认用）
 *   - get_stage_guidance 获取阶段约束包 / 9 阶段总览（核心工具）
 *
 * 传输：stdio —— 在 AI IDE 的 MCP 配置中注册后即用
 *   （Qoder / Trae / Codex / Cursor / 带 AI 插件的 VS Code、Visual Studio）
 *
 * 设计约束：
 *   - 无状态：不记录进展；进展由 AI 依据 dependencies 与实际文件判断
 *   - 信息提供者：不执行系统操作、不装环境、不运行脚本
 *   - stdout 是协议通道：日志一律走 console.error
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { stages } from "./data/stages.js";
import { modes } from "./data/modes.js";
import { capabilities } from "./data/capabilities.js";

const primaryMode = modes.find((m) => m.status === "primary") ?? modes[0];
const stageMap = new Map(stages.map((s) => [s.id, s]));

/** 把能力包引用解析为环境要求清单（数据契约 §5） */
function resolveEnvironment(capabilityIds = []) {
  return capabilityIds.flatMap((id) => capabilities[id]?.requirements ?? []);
}

/** 组装某模式某阶段的完整约束包（字段级覆盖：模式覆盖 > 通用内容）
 *  注意：覆盖是字段级浅合并——数组字段（如 deliverables / rules / guidance）
 *  为整体替换而非逐项合并，模式覆盖需包含该字段的完整内容。 */
function buildStageContract(mode, stage, notice) {
  const override = mode.stageOverrides?.[stage.id] ?? {};
  const merged = { ...stage, ...override };
  const contract = {
    modeId: mode.id,
    ...merged,
    environment: resolveEnvironment(merged.capabilities),
  };
  if (notice) contract.notice = notice;
  return contract;
}

/** 9 阶段总览（开场建立全景用） */
function buildOverview(mode, notice) {
  const overview = {
    mode: {
      id: mode.id,
      name: mode.name,
      status: mode.status,
      techStack: mode.techStack,
      notes: mode.notes,
    },
    stages: stages.map((s) => ({ id: s.id, number: s.number, name: s.name, goal: s.goal })),
    suggestedEntry: "blueprint",
    howToUse: [
      "开场先与用户确认模式；然后进入阶段 0（blueprint）开始引导",
      "每个阶段：先按 guidance 引导，产出后停下来等用户确认（humanCheckpoint）",
      "推进与新阶段的触发词来自用户（\u201c行 / 下一步 / 可以了\u201d）——本工具不判断满意度",
      "用户提出改动时：按 revisionImpact 判断回退范围，用 stage 参数重新获取对应约束包",
      "取具体阶段：以 stages[].id 作为 stage 参数再次调用本工具",
    ],
  };
  if (notice) overview.notice = notice;
  return overview;
}

function textResult(obj) {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

const server = new McpServer({
  name: "inspire-design",
  version: "0.1.0",
  instructions:
    "把\u201c从灵感到 UI\u201d的设计方法论按 9 阶段流程引导用户。使用方式：开场先 list_modes 与用户确认模式，再 get_stage_guidance 取 9 阶段总览建立全景，然后逐阶段获取约束包并按 guidance 引导。每个阶段结束必须停下来等用户确认（humanCheckpoint）；用户想改上游内容时，按 revisionImpact 判断回退范围。本服务无状态、不判断进展——进展由你依据 dependencies 与实际文件是否存在来判断。",
});

server.registerTool(
  "list_modes",
  {
    title: "列出设计模式",
    description:
      "列出 InspireDesign 支持的设计模式（WPF / Vue / React / 通用）及各自状态。开场时用于与用户确认使用哪个模式；用户已明确指定时可跳过。",
  },
  async () =>
    textResult({
      modes: modes.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        techStack: m.techStack,
        status: m.status,
      })),
      primary: primaryMode.id,
      hints: [
        "primary = 首发模式（内容最完整，含模式专属覆盖）",
        "planned = 规划中，可选用：当前返回通用阶段内容",
      ],
    })
);

server.registerTool(
  "get_stage_guidance",
  {
    title: "获取阶段引导（核心工具）",
    description:
      "获取某个模式某个阶段的完整约束包：目标、产物、出口条件、前置依赖、硬规则、引导步骤、提示词模板、常见坑、回退影响面、人确认点、环境要求（如有）。" +
      "不传 stage 时返回 9 阶段总览（开场先取总览与用户建立全景）。任何阶段可随时获取，支持回退修正；工具无状态、不做流程门禁。",
    inputSchema: {
      mode: z
        .string()
        .optional()
        .describe("模式 id，见 list_modes；缺省使用 primary 模式（wpf）"),
      stage: z
        .string()
        .optional()
        .describe(
          "阶段 id，见总览返回的 stages[].id（如 blueprint / tokens / checkup）；缺省返回 9 阶段总览"
        ),
    },
  },
  async ({ mode, stage }) => {
    // 模式解析：缺省用 primary；传入未知模式时回退并说明
    const requested = mode ? modes.find((m) => m.id === mode) : undefined;
    const m = requested ?? primaryMode;
    let notice;
    if (mode && !requested) {
      notice = `未找到模式 "${mode}"（可选：${modes.map((x) => x.id).join(" / ")}），已回退到 "${m.id}"。`;
    } else if (m.status !== "primary") {
      notice = `模式 "${m.id}" 内容规划中（planned），当前返回通用阶段内容。`;
    }

    if (!stage) {
      return textResult(buildOverview(m, notice));
    }

    const s = stageMap.get(stage);
    if (!s) {
      return textResult({
        error: `未知阶段 "${stage}"`,
        validStages: stages.map((x) => ({ number: x.number, id: x.id, name: x.name })),
        hint: "不传 stage 参数可获取 9 阶段总览",
      });
    }

    return textResult(buildStageContract(m, s, notice));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[inspire-design] MCP 服务已启动（stdio）");
