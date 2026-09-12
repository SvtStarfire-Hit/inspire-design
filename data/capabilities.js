/**
 * 能力包（CapabilityPack）—— 数据契约见 docs/03-数据契约.md §4 / §5
 *
 * 能力包是跨模式共享的（操作对象是 HTML 与浏览器，与目标框架无关）。
 * MCP 服务在返回阶段约束包时，把 stage.capabilities 引用的能力包解析为
 * environment 字段透出（见 mcp-server.js 的 resolveEnvironment）。
 */
export const capabilities = {
  "design-toolkit": {
    id: "design-toolkit",
    name: "设计工具链",
    description: "跨模式共享的设计工程脚本：体检与出图",
    scripts: [
      {
        file: "check-layout.js",
        purpose: "设计稿体检：溢出 / 越界 / 文字出框",
        usage: "node check-layout.js <file.html> <w> <h>",
        pass: "输出 vOverflow / hOverflow / textLeak 三类均为 []",
      },
      {
        file: "export-png.py",
        purpose: "HTML → PNG 出图（无头浏览器截图）",
        usage: "python export-png.py [fig1]",
        pass: "PNG 生成且尺寸正确",
      },
    ],
    requirements: [
      {
        name: "Node.js",
        minVersion: "22.4",
        optional: false,
        why: "check-layout.js 依赖全局 WebSocket（22.4+ 默认可用）",
        check: "node --version",
        install: "https://nodejs.org 或 winget install OpenJS.NodeJS",
      },
      {
        name: "Python",
        minVersion: "3.9",
        optional: false,
        why: "export-png.py 运行环境",
        check: "python --version",
        install: "https://python.org",
      },
      {
        name: "Pillow",
        minVersion: null,
        optional: true,
        why: "export-png.py 自动裁剪空白；缺失只影响裁剪，截图照常生成",
        check: 'python -c "import PIL"',
        install: "pip install pillow",
      },
      {
        name: "Edge / Chrome",
        minVersion: null,
        optional: false,
        why: "无头浏览器截图（两个工具共用）",
        check: "检查常见安装路径（Program Files 下 Edge / Chrome）",
        install: "系统通常自带 Edge",
      },
    ],
  },
};
