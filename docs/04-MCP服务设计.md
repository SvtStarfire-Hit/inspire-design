# 04 · MCP 服务设计

> InspireDesign 的 MCP 端：让 AI 编码助手（Qoder / Trae / Codex / Cursor…）按流程约束引导用户。
> 本文定义工具的接口与语义。数据结构的定义见 03-数据契约.md。

---

## 1. 设计原则

| 原则 | 含义 |
|---|---|
| **粗粒度** | 一个核心工具返回完整阶段约束包；不拆成十几个细碎工具 |
| **无状态** | 工具不记进展；约束包带 `dependencies`，AI 据文件是否存在判断进度 |
| **信息提供者** | 不执行系统操作、不装环境、不运行脚本、不替人做决定 |
| **环境声明式** | 需要工具链时，随约束包返回环境要求清单；检查/确认/安装由 AI 执行 |
| **任意跳转** | 任何阶段都可取，支持回退修正；工具不做流程门禁 |

---

## 2. 工具清单

### 2.1 `get_stage_guidance`（核心工具）

获取某个模式某个阶段的完整约束包。

```jsonc
// 输入
{
  "mode": "wpf",        // 模式 id；可选，缺省用 primary 模式
  "stage": "tokens"     // 阶段 id；可选，缺省返回概览（阶段列表 + 当前建议）
}

// 输出（内容为 §3 阶段约束包全字段 + 解析后的 environment）
```

设计要点：

- `stage` 缺省时返回**阶段总览**（9 个阶段的 id/name/goal + 建议入口），让 AI 在开场时先与用户建立全景
- 返回的 `environment` 已从能力包解析展开（不是 id 引用），AI 拿到即可执行检查
- 返回带 `revisionImpact`（回退影响面），供用户说"想改 XX"时使用

### 2.2 `list_modes`（辅助工具）

列出所有模式及其状态（primary / planned），供开场时与用户确认选择。

```jsonc
// 输出
[
  { "id": "wpf", "name": "WPF 启发流", "status": "primary",
    "techStack": [".NET", "XAML", "MVVM"] },
  { "id": "vue", "name": "Vue 启发流", "status": "planned", "…": "…" }
]
```

### 2.3 原型阶段的实现范围

**先实现 `get_stage_guidance` 一个工具即可跑通完整流程**（stage 缺省即概览）。
`list_modes` 一并实现（成本极低）。其余工具（如未来的 `run_design_check`）在试用后再评估。

---

## 3. 返回示例（节选：环境透传）

```jsonc
// get_stage_guidance(mode="wpf", stage="checkup") 的返回节选
{
  "id": "checkup",
  "number": 6,
  "name": "体检出图",
  "goal": "用工具查出肉眼看不见的问题，并产出交付图",
  "dependencies": [
    { "stageId": "spec", "deliverable": "全部 fig*.html",
      "hint": "若规格页尚未完成，先回阶段 5" }
  ],
  "guidance": [
    "检查环境（见 environment 字段）",
    "提醒用户先塞长文案",
    "运行 check-layout.js",
    "有问题 → 回对应 fig 修 → 重跑",
    "通过后运行 export-png.py 出图"
  ],
  "environment": [
    { "name": "Node.js", "minVersion": "22.4", "optional": false,
      "why": "check-layout.js 依赖全局 WebSocket",
      "check": "node --version", "install": "https://nodejs.org" },
    { "name": "Pillow", "minVersion": null, "optional": true,
      "why": "export-png.py 自动裁剪空白；缺失只影响裁剪",
      "check": "python -c \"import PIL\"", "install": "pip install pillow" }
    // … Python / Edge-Chrome 同构
  ]
}
```

---

## 4. 调用时序

### 4.1 开场

```
用户：我想做一个 WPF 工具…
AI  → list_modes()                     // 与用户确认模式（若用户已明确，可跳过）
AI  → get_stage_guidance(mode)         // 无 stage：拿到 9 阶段全景
AI  → get_stage_guidance(mode, stage="blueprint")   // 进入阶段 0
AI  → 按 guidance 引导用户，产出页面清单 + Mermaid 图
AI  → 停下来："页面清单和流转图这样，你看有什么要改的？"
```

### 4.2 阶段推进

```
人：行，下一步
AI  → 快速自检依赖（如页面清单已确认）
AI  → get_stage_guidance(mode, stage="explore")
AI  → 继续引导…
```

### 4.3 环境检查（约束包含 environment 时）

```
AI  → 逐项运行 check 命令（终端）
AI  → 报告："缺失 Pillow（用于 export-png.py 自动裁剪）。是否安装？命令：pip install pillow"
人：装吧
AI  → 执行安装 → 复检 → 继续流程
```

### 4.4 回退修正

```
人：我想把主色换成更冷的蓝
AI  → get_stage_guidance(mode, stage="tokens")   // 或回风格探索
AI  → 查 revisionImpact："改 tokens.css → app.css 需核对、所有 fig 需复查"
AI  → 与用户确认回退范围 → 修改 → 重跑体检
```

**关键约定**：推进阶段的触发词是人说的（"行 / 下一步 / 可以了"），**工具不判断满意度**。

---

## 5. 执行边界

| 工具做 | 工具不做 |
|---|---|
| 返回阶段约束、环境要求、通过标准 | 执行安装、运行脚本、改动用户文件 |
| 提供提示词模板 | 直接向用户对话（对话是 AI 的事） |
| 提供回退影响面 | 判断"做得对不对/好不好" |

**后续增强（暂不实现）**：

- `run_design_check`：工具直接执行 check-layout.js 并返回结构化结果。
  目前判定：AI IDE 已有终端能力，可直接运行脚本（约束包里有 usage 与 pass 标准）；
  此工具的增量价值主要是减少 AI 拼命令的错误，留待试用后评估。

---

## 6. 与 AI IDE 的配合

支持的宿主（均支持 MCP）：

- Qoder、Trae、Codex、Cursor、带 AI 插件的 VS Code / Visual Studio

接入方式（已实现，stdio 本地服务）：

- 在 AI IDE 的 MCP 配置中注册，指向本仓库的 `mcp-server.js`。通用格式：

  ```json
  {
    "mcpServers": {
      "inspire-design": {
        "command": "node",
        "args": ["D:\\path\\to\\InspireDesign\\mcp-server.js"]
      }
    }
  }
  ```

- 冒烟验证：在本仓库运行 `npm test`（全部断言通过即服务正常）
- 配置入口因宿主而异：Qoder / Trae / Cursor 在设置面板的 MCP 区域添加；`args` 路径换成本机仓库实际位置

**使用话术示例**（用户对 AI 说）：

```
用 InspireDesign 的 WPF 模式引导我做一个设备巡检管理工具。
按它给的流程走，每个阶段结束停下来等我确认。
```

这句话包含三个关键指令：用哪个工具（InspireDesign）、哪个模式（WPF）、交互约定（每阶段等人确认）。
