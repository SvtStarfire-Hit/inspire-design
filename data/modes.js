/**
 * 模式（Mode）—— 结构定义见 docs/03-数据契约.md §2
 *
 * stageOverrides：对通用阶段内容的"字段级覆盖"（只写要改的字段，其余继承 data/stages.js）。
 * 覆盖策略：差异集中在术语、产物与提示词；通用规则不重复。
 * 当前首发模式为 wpf（primary）；其余模式为 planned（可调用，返回通用内容）。
 */
export const modes = [
  {
    id: "wpf",
    name: "WPF 启发流",
    description: "面向 .NET WPF 桌面应用，适合工业 / 管理类桌面软件",
    techStack: [".NET", "XAML", "MVVM"],
    status: "primary",
    notes: "设计稿窗口尺寸 = 目标 WPF 窗口尺寸；工程操作细则以目标项目内的 WPF-README.md 为准",
    stageOverrides: {
      tokens: {
        deliverables: [
          { name: "tokens.css", path: "design/tokens.css", description: "颜色 / 圆角 / 间距 / 字号 / 尺寸基准（唯一取值来源）" },
          { name: "WPF 资源字典", path: "design/tokens.xaml", description: "ResourceDictionary 版本：Color + SolidColorBrush 两层资源，CornerRadius / Thickness" },
          { name: "令牌预览页", path: "design/token-preview.html", description: "直接引用 tokens.css 的独立 HTML 预览页，支持实时调整主色、圆角、行高等关键令牌并观察组件效果" },
        ],
        guidance: [
          "把选定方向交给 AI，要求同时输出 tokens.css 与 tokens.xaml",
          "要求按类别分组、每个变量带用途注释",
          "同步生成 token-preview.html，直接加载 tokens.css，并提供主色、radius、行高等控件做实时预览",
          "与用户逐组过一遍（色彩组 / 间距组 / …）",
        ],
        aiPromptTemplate: `根据我们选定的视觉方向，为【xxx 项目】生成设计令牌。

要求：
1. 产出 tokens.css（颜色 / 圆角 / 间距 / 字号 / 尺寸基准，按类别分组，每个令牌带用途注释）
2. 同时产出 WPF ResourceDictionary 版本 tokens.xaml：
   - 颜色用 Color + SolidColorBrush 两层资源
   - 注意 WPF 颜色串是 #AARRGGBB，与 CSS 的 #RRGGBBAA 顺序相反
3. 同步创建 design/token-preview.html：直接引用 tokens.css，提供主色、radius、行高等实时调节控件，右侧展示按钮 / 卡片 / 表格 / 长文本等预览效果
4. 名字描述用途而非长相（--color-danger 而不是 --color-red）
5. 不要包含任何组件样式

我的选定方向：【粘贴阶段 1 的选定结果】`,
      },
      main: {
        rules: [
          "窗口壳层必须固定尺寸 + 左上角绝对定位（不要用 100% / vh，不要居中）",
          "只引用令牌与组件",
          "本阶段结束前不碰规格页",
          "窗口尺寸对齐目标 WPF 窗口的实际尺寸（先在目标机上确认，不要拍脑袋）",
        ],
      },
      mapping: {
        deliverables: [
          { name: "wpf-mapping.md", path: "design/wpf-mapping.md", description: "七部分：布局 / 尺寸 / 颜色 / 组件 / 速查表 / 反向清单 / 坑清单；生成模板与验收标准见 WPF-README.md §6.2 / §6.3" },
        ],
        guidance: [
          "用 WPF-README.md §6.2 的提示词模板生成",
          "让它自己核对\u201cclass 是否都能在速查表查到\u201d（§6.3 检验 2）",
          "重点审视\u201c找不到落点\u201d与\u201c坑清单\u201d两节",
        ],
        aiPromptTemplate: `读 design/ 下的 tokens.css、app.css 和全部 fig*.html，按 WPF-README.md §6.2 的模板产出 design/wpf-mapping.md（七部分：布局 / 尺寸 / 颜色令牌 / 组件 / 速查表 / 反向清单 / 坑清单）。

关键要求：
1. 每个结论指向具体 class 或令牌名；"找不到落点"的必须单独列清单
2. 坑清单必须具体到 WPF 特性（如 BorderThickness 从 0 变 2 引起内容位移、可滚动容器缺 MinHeight=0 会撑爆窗口）
3. 这是设计文档，不是实现代码：不碰 src/，不写完整 XAML

完成后自己核对一遍：所有 class 名是否都能在速查表里查到，列出"对不上"的项。`,
      },
    },
  },
  {
    id: "vue",
    name: "Vue 启发流",
    description: "面向 Vue 3 + 组件库的 Web 应用，适合中后台管理系统",
    techStack: ["Vue 3", "Vite", "CSS"],
    status: "planned",
    notes: "内容规划中——当前返回通用阶段内容；术语适配（SFC / CSS 变量 / 组件库）待补充",
    stageOverrides: {},
  },
  {
    id: "react",
    name: "React 启发流",
    description: "面向 React + 组件库的 Web 应用",
    techStack: ["React", "JSX"],
    status: "planned",
    notes: "内容规划中——当前返回通用阶段内容；术语适配待补充",
    stageOverrides: {},
  },
  {
    id: "generic",
    name: "通用启发流",
    description: "不限定技术栈，聚焦程序 UI 设计的通用方法论；适合先梳理思路、暂不确定实现方式的场景",
    techStack: ["通用"],
    status: "planned",
    notes: "与通用阶段内容一致",
    stageOverrides: {},
  },
];
