/**
 * 9 阶段流程模型（通用层）—— 结构定义见 docs/03-数据契约.md §3
 * 内容权威来源：docs/02-流程模型.md（本文件是其机器可读版本）
 *
 * 说明：
 * - 本文件是"通用版"内容；模式差异（如 WPF 的 XAML 术语）在 data/modes.js
 *   的 stageOverrides 里做"字段级覆盖"（只写要改的字段，其余继承本文件）。
 * - 不包含 environment 字段 —— 由 mcp-server.js 返回时根据 capabilities 展开。
 */
export const stages = [
  {
    id: "blueprint",
    number: 0,
    name: "功能蓝图（微立项）",
    goal: "把模糊的想法变成结构化的功能清单和页面流转图；同时完成'微立项'——用最小代价明确目标/边界/角色/验收，确保后续灵感→UI 的转化不跑偏",
    deliverables: [
      { name: "项目定位", description: "一句话说清：这是什么工具、给谁用、解决什么问题、不做什么（非目标）" },
      { name: "角色与主操作路径", description: "核心角色（1-3 个）+ 每个角色的典型操作路径（一句话级别）" },
      { name: "功能清单", description: "编号化的功能点，每条带验收要点（产出为对话结论，人确认后作为后续阶段的输入）" },
      { name: "页面/窗口清单", description: "页面一行一个，写明职责" },
      { name: "Mermaid 独立 HTML 流转图", path: "design/flow-页面流转.html", description: "专门的 HTML 文档：内嵌 Mermaid 源码并可直接浏览；语言版设计文档只放结论与链接" },
      { name: "里程碑骨架", description: "M1/M2/M3 粗粒度阶段划分（一句话级别，不是详细排期）" },
      { name: "裁定记录", description: "初始为空；后续每轮确认的设计决定按轮次追加（格式见 WPF-README.md §5.4）" },
    ],
    exitCriteria: [
      "目标/非目标明确（能一句话说清'这是什么'和'这不是什么'）",
      "每个页面有明确职责",
      "主操作路径清晰",
      "Mermaid 流转图已有独立 HTML 文档，不只埋在设计文档里",
      "常见遗漏被检查过（有列表必有详情、有编辑必有取消、有提交必有结果反馈…）",
    ],
    dependencies: [],
    rules: [
      "先列全再排序",
      "不纠结控件细节",
      "暂不考虑技术限制",
      "每轮确认的决定必须写进语言版设计文档的'历次裁定'章节，后续每一稿必须遵守",
      "凡输出 Mermaid 流程图，必须同步落成独立 HTML 文档（如 design/flow-页面流转.html），不能只写在 Markdown 设计文档里",
      "微立项 ≠ 完整项目章程：不做排期/预算/团队分工，只做到'UI 设计不跑偏'所需的最小立项量",
    ],
    guidance: [
      "先问清：这是什么工具、给谁用、解决什么问题、不做什么（非目标）",
      "问清核心角色（1-3 个）和每个角色的典型操作路径",
      "引导用户列全功能点（编号化，每条带验收要点）",
      "从功能清单推导页面/窗口清单（宁多勿漏）",
      "问页面之间的跳转关系，输出 Mermaid 页面流转图，并同步生成可直接打开的独立 HTML 流程图文档",
      "主动检查遗漏项（对照常见遗漏清单）",
      "问清里程碑骨架（M1 先做什么、M2 做什么、M3 做什么）",
      "语言版设计文档建议分层：项目设计文档（功能/边界/角色）与设计决策文档（裁定记录/待确认/视觉论证）分开维护",
    ],
    aiPromptTemplate: `作为 UI 设计引导师，请帮我完成应用设计的第一步——功能蓝图与微立项。

【我的想法】我想做一个 xxx 工具，核心功能：
1. …
2. …

请帮我：
1. 明确项目定位：一句话说清“这是什么”和“这不是什么”（非目标）
2. 列出核心角色（1-3 个）和每个角色的典型操作路径
3. 列出编号化的功能清单（每条带验收要点）
4. 列出这个应用需要的所有页面/视图
5. 用 Mermaid 画出页面跳转流程图，并同步创建 design/flow-页面流转.html（独立 HTML，可直接浏览；内含 Mermaid 源码与降级文本）
6. 给出里程碑骨架（M1/M2/M3 粗粒度）`,
    pitfalls: [
      "一开始就纠结控件细节",
      "把视觉问题混进来",
      "页面职责重叠",
      "跳过微立项直接画页面（后续必然返工）",
      "微立项做得太重（变成完整项目章程，偏离 UI 设计焦点）",
    ],
    revisionImpact: ["改页面清单 → 下游所有阶段受影响（这是最上游的结构决策，尽早确认）"],
    humanCheckpoint: "页面清单没有多余、没有遗漏？主操作路径认同？",
    capabilities: [],
  },
  {
    id: "explore",
    number: 1,
    name: "风格探索",
    goal: "通过参考图与 AI 生成，确定视觉风格方向",
    deliverables: [
      { name: "2-3 个视觉方向", description: "每个方向含：配色 / 字体 / 圆角 / 间距 / 风格关键词，配一张 HTML 演示页" },
      { name: "选定结果", description: "选定方向 + 选定理由（记入语言版设计文档）" },
    ],
    exitCriteria: ["人明确选定一个方向", "选定理由已记录"],
    dependencies: [
      { stageId: "blueprint", deliverable: "页面清单", hint: "AI 需要知道有哪些界面要覆盖；未完成先回阶段 0" },
    ],
    rules: [
      "参考图不超过 3 张（给太多会混淆 AI）",
      "先出多方向再选，不要一次只出一个方案",
      "用\u201c情绪词\u201d描述期望感觉，而非技术词",
    ],
    guidance: [
      "请用户提供参考图 / 参考产品 / 配色锚点（参考来源：应用截图、Tailwind 色板、Radix Colors、Open Color、优秀产品官网）",
      "用情绪词问清期望感觉（冷静？专业？活泼？）",
      "让 AI 生成 2-3 个完整方向（各含配色/字体/风格参数 + 一张 HTML 演示）",
      "用户选定后，把方向固化为书面描述",
    ],
    aiPromptTemplate: `我要给【xxx 工具】确定视觉风格。期望的感觉：【用情绪词描述，如“冷静、专业、不花哨”】。

参考：【我提供的 N 张截图 / 参考的某产品风格】

请给我 2-3 个完整的视觉方向，每个方向包含：
1. 配色方案（主色 / 辅色 / 状态色，给出具体色值）
2. 字体方案
3. 圆角 / 间距 / 阴影的风格参数
4. 每个方向做一张 HTML 演示页（同一张界面示意，便于对比）

注意：多个方向要拉开差异，不要做微调变体。`,
    pitfalls: ["跳过探索直接微调（“把蓝色换成绿色”）会错过更好的方向", "参考图给太多会混淆 AI"],
    revisionImpact: ["改选定方向 → 令牌 / 组件 / 全部稿件受影响（这是最上游的视觉决策）"],
    humanCheckpoint: "几个方向并排看过？选定理由是明确的？",
    capabilities: [],
  },
  {
    id: "tokens",
    number: 2,
    name: "定令牌",
    goal: "把选定风格固化为唯一取值来源（设计令牌）",
    deliverables: [
      { name: "tokens.css", path: "design/tokens.css", description: "颜色 / 圆角 / 间距 / 字号 / 尺寸基准，每个值有语义化名字" },
      { name: "令牌预览页", path: "design/token-preview.html", description: "直接引用 tokens.css 的独立 HTML 预览页，支持实时调整主色、圆角、行高等关键令牌并观察组件效果" },
    ],
    exitCriteria: ["每个令牌都有语义化名字", "后续任何文件不许出现魔法数字和手写色值", "token-preview.html 可打开并能实时预览主色 / radius / 行高变化"],
    dependencies: [
      { stageId: "explore", deliverable: "选定风格方向", hint: "若尚未选定视觉方向，先回阶段 1 完成风格探索" },
    ],
    rules: [
      "令牌与组件必须分文件（换皮只改令牌）",
      "名字描述用途而非长相（--color-danger 而非 --color-red）",
      "生成令牌时必须同时生成 token-preview.html；预览页只引用 tokens.css，不把令牌值复制成第二份事实来源",
    ],
    guidance: [
      "把选定方向交给 AI，要求输出令牌文件",
      "要求按类别分组、每个变量带用途注释",
      "同步生成 token-preview.html，直接加载 tokens.css，并提供主色、radius、行高等控件做实时预览",
      "与用户逐组过一遍（色彩组 / 间距组 / …）",
      "如果项目涉及分类/标签/类型区分，建立索引色板（`--cat-1` 到 `--cat-N`），要求相邻色相区分度够、白底上都能看清",
    ],
    aiPromptTemplate: `根据我们选定的视觉方向，为【xxx 项目】生成设计令牌文件 design/tokens.css。

要求：
1. 按类别分组：颜色 / 圆角 / 间距 / 字号 / 尺寸基准
2. 每个令牌带用途注释
3. 名字描述用途而非长相（--color-danger 而不是 --color-red）
4. 不要包含任何组件样式（那是下一步的事）
5. 同步创建 design/token-preview.html：直接引用 tokens.css，提供主色、radius、行高等实时调节控件，右侧展示按钮 / 卡片 / 表格 / 长文本等预览效果
6. 如果项目涉及分类/标签/类型区分，加上索引色板（--cat-1 到 --cat-N，相邻色相区分度够）

我的选定方向：【粘贴阶段 1 的选定结果】`,
    pitfalls: ["令牌数量过多或过少", "名字无语义", "与组件样式混在一个文件", "只产出 tokens.css 没有预览页，导致主色 / 圆角 / 行高是否合适只能靠想象"],
    revisionImpact: ["改 tokens.css → app.css 需核对引用；所有 fig*.html 需复查视觉"],
    humanCheckpoint: "颜色 / 尺寸过目一遍，视觉方向确认无误",
    capabilities: [],
  },
  {
    id: "components",
    number: 3,
    name: "搭组件库",
    goal: "建立可复用的组件样式库，覆盖全部交互状态",
    deliverables: [
      { name: "app.css", path: "design/app.css", description: "按钮 / 输入 / 卡片 / 树 / 弹层…每块顶部注明对应的目标控件" },
    ],
    exitCriteria: [
      "每个组件有全部状态：默认 / hover / 按下 / 禁用 / 选中 / 加载 / 错误 / 空",
    ],
    dependencies: [
      { stageId: "tokens", deliverable: "tokens.css", hint: "令牌未定先回阶段 2" },
    ],
    rules: [
      "组件只引用令牌，不写死值",
      "允许\u201c核心组件先行、增量补齐\u201d，但已做的组件必须全状态",
    ],
    guidance: [
      "从页面清单推导需要哪些组件，列清单给用户确认",
      "让 AI 逐个输出组件及其全状态",
      "用一张组件展示页（或直接在主界面里看）验证",
    ],
    aiPromptTemplate: `根据页面清单，先推导这个应用需要哪些组件，列成清单给我确认。

然后为每个组件写样式（design/app.css），要求：
1. 只引用 tokens.css 里的令牌，不写死颜色和像素
2. 每个组件必须覆盖全部 8 种状态：默认 / hover / 按下 / 禁用 / 选中 / 加载 / 错误 / 空
3. 每块顶部注明对应的目标控件（如 Button / TextBox）

页面清单：【粘贴阶段 0 的清单】`,
    pitfalls: ["组件只画默认态（实现时 hover / 禁用 / 加载 / 空态靠猜）", "重复发明已有组件"],
    revisionImpact: ["显著改组件 → 使用该组件的所有 fig 页需复查"],
    humanCheckpoint: "组件清单有无缺少？状态表完整？",
    capabilities: [],
  },
  {
    id: "main",
    number: 4,
    name: "画主界面",
    goal: "画出产品的主界面，说清信息架构与主操作路径",
    deliverables: [
      { name: "fig1-*.html", path: "design/fig1-主界面.html", description: "窗口壳层稿：固定尺寸 = 目标窗口尺寸，左上角绝对定位" },
    ],
    exitCriteria: ["一张图能说清：信息分几区、每区放什么、主操作路径是哪一条"],
    dependencies: [
      { stageId: "components", deliverable: "app.css", hint: "组件库未就绪先回阶段 3" },
    ],
    rules: [
      "窗口壳层必须固定尺寸 + 左上角绝对定位（不要用 100% / vh，不要居中）",
      "只引用令牌与组件",
      "本阶段结束前不碰规格页",
      "同一界面有多种运行模式/状态时，用 URL 查询参数（?mode=xxx）切换，不要为每个状态另存一份 HTML",
    ],
    guidance: [
      "先与用户对齐\u201c分几区、主路径\u201d再让 AI 动手",
      "生成后一起看，用自然语言迭代",
      "此阶段结束前不碰规格页",
    ],
    aiPromptTemplate: `现在画【xxx 工具】的主界面（design/fig1-主界面.html）。

参照 design/ 目录里的 tokens.css 与 app.css（只允许引用其中的令牌与组件）。
窗口尺寸：【1942×1046（按目标窗口实际尺寸修改）】；左上角绝对定位，不要响应式。

结构：【先在此写清分几区、每区放什么、主操作路径是哪一条】
不要：【列出不要的东西，如“不要仪表盘式大数字卡片、不要模态框”】

只画这一张，画完停下来给我看。`,
    pitfalls: ["结构没对齐就让 AI 铺开画", "用响应式 / 百分比做壳层导致截图尺寸不可控"],
    revisionImpact: ["改布局结构 → 规格页需同步；若动到组件 → 回阶段 3"],
    humanCheckpoint: "分区合理？主路径清楚？没有多余装饰干扰？",
    capabilities: [],
  },
  {
    id: "spec",
    number: 5,
    name: "画规格页",
    goal: "把关键部件逐项展开：状态色、尺寸、交互入口、边界情况",
    deliverables: [
      { name: "fig2..N-*.html", path: "design/fig2-xxx.html", description: "规格稿：一个文件 = 一组\u201c面向部件\u201d的规格；高度随内容，自动裁剪" },
    ],
    exitCriteria: [
      "主操作路径上的每个交互入口，都有视觉定义",
      "组件库里所有非默认状态，都有视觉定义",
    ],
    dependencies: [
      { stageId: "main", deliverable: "fig1（结构与主路径已确认）", hint: "主界面未确认先回阶段 4" },
    ],
    rules: [
      "一个文件 = 一组\u201c面向部件\u201d的规格",
      "规格稿同样只引用令牌与组件",
      "同一界面有多种运行模式/状态时，用 URL 查询参数（?mode=xxx）切换，不要为每个状态另存一份 HTML",
    ],
    guidance: [
      "从主界面上圈出关键部件",
      "逐个让 AI 展开规格",
      "对照组件状态表检查覆盖度",
      "规格稿分三种类型，不要只画界面规格：① 组件规格（展开某个组件的结构与全部状态）② 流程规格（用 Mermaid 画操作流转与责任分工，并同步生成可独立打开的 HTML；可按业务特征一页容纳多个流程图，不强制每张图一个文件）③ 数据/结构规格（展开数据模型、映射规则、配置 token 表）",
    ],
    aiPromptTemplate: `从 fig1 主界面圈出的关键部件开始，逐个展开规格页（design/fig2..N-*.html）。

本轮先做：【部件名】。要求：
1. 状态色 / 尺寸 / 所有交互入口 / 边界情况
2. 只引用 tokens.css 与 app.css 里的样式
3. 不要发明新样式；如果发现缺组件状态，停下来告诉我，先回组件库补完再继续`,
    pitfalls: [
      "\u201c关键\u201d没有定义导致漏项（按出口条件逐项点名可避免）",
      "规格页里重新发明新样式",
      "只画了界面规格，漏了流程和数据规格",
      "Mermaid 只埋在 Markdown 里，评审时缺少可独立打开的流程图 HTML；或把强相关流程拆成过多文件，导致业务上下文割裂",
    ],
    revisionImpact: ["改规格 → 若有新组件状态，回阶段 3 补齐后重跑体检"],
    humanCheckpoint: "对照出口条件逐项点名，确认无漏",
    capabilities: [],
  },
  {
    id: "checkup",
    number: 6,
    name: "体检出图",
    goal: "用工具查出肉眼看不见的问题，并产出交付图",
    deliverables: [
      { name: "体检报告", description: "check-layout.js 输出：三类问题清单，全为 [] 才通过" },
      { name: "归档 PNG", description: "export-png.py 产出（派生物，永远不手改）" },
    ],
    exitCriteria: [
      "三类问题全为 []（vOverflow / hOverflow / textLeak）",
      "稿子里刻意塞过\u201c故意很长\u201d的样例文字并撞过墙",
    ],
    dependencies: [
      { stageId: "spec", deliverable: "全部 fig*.html", hint: "规格页尚未完成先回阶段 5" },
    ],
    rules: [
      "先塞长文案再体检（否则是虚假数据下的虚假通过）",
      "PNG 是派生物，永远不手改",
    ],
    guidance: [
      "检查环境（见 environment 字段：逐项运行 check 命令）",
      "报告缺失项与安装方式，与用户确认后安装、复检",
      "提醒用户先塞\u201c故意很长\u201d的样例文字",
      "运行 check-layout.js 逐张体检",
      "有问题 → 回对应 fig 修 → 重跑",
      "通过后运行 export-png.py 出图",
    ],
    aiPromptTemplate: `进入设计体检阶段。请按顺序执行：

1. 逐项检查环境（见下方清单），缺失项报告给我确认后再安装
2. 提醒我确认每张 fig 稿里已塞入“故意很长”的样例文字
3. 逐张运行：node check-layout.js <file.html> <w> <h>
4. 三类问题（vOverflow / hOverflow / textLeak）有任何一个非空 → 回到对应 fig 修复 → 重跑
5. 全部通过后运行 python export-png.py 出图

环境清单：【见工具返回的 environment 字段】`,
    pitfalls: ["跳过体检直接出图", "体检后手动改 PNG", "没塞长文案就宣告通过"],
    revisionImpact: ["体检发现的问题按所在文件回退（fig → 可能牵动 app.css → 可能牵动 tokens）"],
    humanCheckpoint: "看过体检报告；PNG 归档完整",
    capabilities: ["design-toolkit"],
  },
  {
    id: "mapping",
    number: 7,
    name: "写映射",
    goal: "产出\u201c设计 → 实现\u201d的翻译表，验证设计在目标框架里做得出来",
    deliverables: [
      { name: "设计→实现映射表", path: "design/mapping.md", description: "七部分：布局 / 尺寸 / 颜色 / 组件 / 速查表 / 反向清单 / 坑清单；文件名随模式而异（如 WPF 模式为 wpf-mapping.md）" },
    ],
    exitCriteria: ["\u201c找不到落点\u201d的清单为空或已确认可接受"],
    dependencies: [
      { stageId: "spec", deliverable: "阶段 2-5 的全部设计文件", hint: "设计资产不齐先回对应阶段补齐" },
    ],
    rules: [
      "这是设计文档，不是实现代码（不写完整实现文件，不碰 src/）",
      "每个结论必须指向具体 class 或令牌名，不许空泛",
    ],
    guidance: [
      "用提示词模板（见 aiPromptTemplate）生成映射表",
      "让它自己核对\u201cclass 是否都能在速查表查到\u201d",
      "重点审视\u201c找不到落点\u201d和\u201c坑清单\u201d两节",
    ],
    aiPromptTemplate: `读 design/ 下的 tokens.css、app.css 和全部 fig*.html，产出一份 design/mapping.md（设计 → 实现的翻译表；文件名随目标框架调整，如 WPF 项目用 wpf-mapping.md）。

包含七部分：
1) 布局：CSS 的 flex / grid / gap / padding / … 各对应目标框架的什么；没有对应物的必须点名说清楚
2) 尺寸：每个尺寸 / 间距 / 字号令牌落到哪里
3) 颜色令牌：每个变量 → 目标框架资源体系的建议键名
4) 组件：逐个组件给出目标控件与状态表达方式
5) 速查表：设计稿里每一个 class 名 → 落点；找不到落点的单独列一节
6) 反向清单：目标框架有、而 CSS 没有的能力
7) 坑清单：必须在设计阶段就处理的坑，每条按“现象 → 原因 → 设计调整”写

约束：这是设计文档，不是实现代码。不要创建 / 修改任何 src/ 下的文件；
不要写完整实现文件；每个结论指向具体 class 或令牌名，不要空泛。`,
    pitfalls: [
      "满篇\u201c完美对应\u201d（多半是没认真查）；伪造的对应关系比缺失的更危险",
      "坑清单写空泛的\u201c注意性能\u201d",
    ],
    revisionImpact: ["发现\u201c做不出来\u201d的落点 → 回对应设计阶段修改设计 → 重跑体检"],
    humanCheckpoint: "\u201c找不到落点\u201d清零或逐条确认接受",
    capabilities: [],
  },
  {
    id: "handoff",
    number: 8,
    name: "交接开发",
    goal: "把全部设计资产整理成交接包，进入 AI 编码阶段",
    deliverables: [
      { name: "项目级提示词", description: "技术约束 + 设计资产位置 + 令牌引用要求" },
      { name: "实现顺序", description: "按页面 / 模块排出建议顺序：逐页实现、每页检查" },
    ],
    exitCriteria: [
      "设计资产完备（令牌 / 组件 / 主界面 / 规格 / 映射齐全）",
      "可交给 AI 编码助手逐页实现",
    ],
    dependencies: [
      { stageId: "mapping", deliverable: "映射表", hint: "映射未完成先回阶段 7" },
    ],
    rules: [
      "不把所有页面一次性丢给 AI；逐页实现、每页检查",
      "令牌定型后不再随意改设计方向",
    ],
    guidance: [
      "汇总资产清单（令牌 / 组件 / 主界面 / 规格 / 映射）",
      "生成\u201c项目级系统提示词\u201d（技术约束 + 资产位置 + 令牌引用要求）",
      "给出实现顺序建议（按主操作路径优先）",
      "生成第一个页面的实现提示词",
    ],
    aiPromptTemplate: `设计资产已齐（tokens.css / app.css / fig*.html / 映射表）。

请产出交接包：
1. 一份“项目级系统提示词”：技术约束 + 设计资产位置 + 引用要求（一律走令牌，不许写死色值）
2. 实现顺序建议（按主操作路径优先，逐页实现、每页检查）
3. 第一个页面的实现提示词（只做这一个页面的实现）

注意：不要一次性实现全部页面。`,
    pitfalls: ["交接时丢掉令牌与映射（AI 会重新发明样式）", "一次性要求实现全部页面"],
    revisionImpact: ["实现阶段若发现设计问题 → 回对应设计阶段修正 → 重跑体检 / 映射 → 再继续"],
    humanCheckpoint: "资产清单核对完毕；开始编码",
    capabilities: [],
  },
];
