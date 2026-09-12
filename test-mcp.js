/**
 * MCP 服务冒烟测试 —— 运行：node test-mcp.js
 *
 * 用 SDK 的 Client 通过 stdio 连接 mcp-server.js，验证：
 *   - 工具注册（tools/list）
 *   - list_modes 返回结构
 *   - get_stage_guidance：总览 / 环境透传 / WPF 覆盖 / planned 提示 / 未知参数
 * 修改 data/ 或 mcp-server.js 后重跑本脚本即可回归。
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({ name: "inspire-design-test", version: "0.1.0" });
const transport = new StdioClientTransport({
  command: process.execPath, // 当前 node
  args: [path.join(__dirname, "mcp-server.js")],
  cwd: __dirname,
});

await client.connect(transport);

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}
const parse = (r) => JSON.parse(r.content[0].text);
// 产物中是否含某文件：文件名可能落在 name 或 path 字段
const hasFile = (deliverables, file) =>
  deliverables.some((d) => `${d.name ?? ""}${d.path ?? ""}`.includes(file));

// 1. 工具注册
const tools = await client.listTools();
check("tools/list 含 list_modes", tools.tools.some((t) => t.name === "list_modes"));
check("tools/list 含 get_stage_guidance", tools.tools.some((t) => t.name === "get_stage_guidance"));

// 2. list_modes
const rm = parse(await client.callTool({ name: "list_modes", arguments: {} }));
check("list_modes 返回 4 个模式", rm.modes.length === 4, JSON.stringify(rm.modes?.length));
check("primary = wpf", rm.primary === "wpf");
check("wpf 状态为 primary", rm.modes.find((m) => m.id === "wpf")?.status === "primary");

// 3. 总览（stage 缺省）
const ov = parse(await client.callTool({ name: "get_stage_guidance", arguments: {} }));
check("总览返回 9 个阶段", ov.stages.length === 9);
check("总览 suggestedEntry = blueprint", ov.suggestedEntry === "blueprint");
check("总览带 mode 信息", ov.mode?.id === "wpf");

// 4. checkup：环境透传
const ck = parse(
  await client.callTool({ name: "get_stage_guidance", arguments: { mode: "wpf", stage: "checkup" } })
);
check("checkup environment 展开 4 条", ck.environment.length === 4, String(ck.environment?.length));
check("Node.js minVersion = 22.4", ck.environment.find((e) => e.name === "Node.js")?.minVersion === "22.4");
check("Pillow 标记 optional", ck.environment.find((e) => e.name === "Pillow")?.optional === true);
check("checkup 带 capabilities", ck.capabilities?.includes("design-toolkit"));

// 5. tokens：WPF 字段级覆盖生效
const bp = parse(
  await client.callTool({ name: "get_stage_guidance", arguments: { mode: "wpf", stage: "blueprint" } })
);
check("blueprint 产物含独立 flow HTML", hasFile(bp.deliverables, "flow-页面流转.html"));
const tk = parse(
  await client.callTool({ name: "get_stage_guidance", arguments: { mode: "wpf", stage: "tokens" } })
);
check("WPF tokens 覆盖含 tokens.xaml", hasFile(tk.deliverables, "tokens.xaml"));
check("WPF tokens 覆盖含 token-preview.html", hasFile(tk.deliverables, "token-preview.html"));
check("WPF tokens 覆盖含模式提示词", typeof tk.aiPromptTemplate === "string" && tk.aiPromptTemplate.includes("AARRGGBB"));

// 6. generic：planned 提示 + 通用内容（无 WPF 覆盖）
const gn = parse(
  await client.callTool({ name: "get_stage_guidance", arguments: { mode: "generic", stage: "tokens" } })
);
check("generic 带 planned notice", typeof gn.notice === "string" && gn.notice.includes("planned"));
check("generic tokens 为通用版（无 tokens.xaml）", !hasFile(gn.deliverables, "tokens.xaml"));
check("generic tokens 含 token-preview.html", hasFile(gn.deliverables, "token-preview.html"));

// 7. 未知 stage：错误 + 合法清单
const un = parse(
  await client.callTool({ name: "get_stage_guidance", arguments: { stage: "nope" } })
);
check("未知 stage 返回 error", typeof un.error === "string");
check("未知 stage 附合法清单", Array.isArray(un.validStages) && un.validStages.length === 9);

// 8. 未知 mode：回退 primary 且说明
const um = parse(
  await client.callTool({ name: "get_stage_guidance", arguments: { mode: "nope", stage: "tokens" } })
);
check("未知 mode 回退到 wpf", um.modeId === "wpf");
check("未知 mode 带 notice 说明", typeof um.notice === "string" && um.notice.includes("回退"));

// 9. handoff 阶段完整性抽查（收尾阶段字段齐全）
const hd = parse(
  await client.callTool({ name: "get_stage_guidance", arguments: { mode: "wpf", stage: "handoff" } })
);
check("handoff 字段齐全", Boolean(hd.goal && hd.exitCriteria && hd.guidance && hd.humanCheckpoint && hd.revisionImpact));

console.log(`\n结果：通过 ${pass}，失败 ${fail}`);
await client.close();
process.exit(fail > 0 ? 1 : 0);
