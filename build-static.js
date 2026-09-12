#!/usr/bin/env node
/**
 * InspireDesign 页面端 · 静态打包脚本（零依赖）
 *
 * 用途：把页面端所需文件复制到 dist/，产出可直接上传到静态服务器（nginx / OSS /
 *   GitHub Pages 等）的目录。
 *
 * 为什么保留原有层级（dist/web/ + dist/data/）：
 *   web/assets/app.js 以 "../../data/*.js" 引用仓库根 data/，故 dist 必须保持
 *   web/ 与 data/ 的相对位置；部署后服务器根目录指向 dist，访问路径为 /web/。
 *
 * 用法：npm run build   （或 node build-static.js）
 *   OUT_DIR 可覆盖输出目录（默认 dist）
 *
 * 边界：只做复制，不做压缩 / 哈希 / 转译（原型阶段：先固化、不过度设计）。
 */
import { cp, mkdir, rm, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const OUT = resolve(ROOT, process.env.OUT_DIR || "dist");

/** 需要进入 dist 的条目（保持相对层级不变） */
const ENTRIES = [
  "web", // 页面端：index.html / assets / vendor(mermaid)
  "data", // 单一事实来源：stages / modes / capabilities
  "docs", // 页脚与关于页引用的 .md
  "README.md",
  "WPF-README.md",
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

await rm(OUT, { recursive: true, force: true }); // 先清空，避免残留旧文件
await mkdir(OUT, { recursive: true });

for (const entry of ENTRIES) {
  const src = join(ROOT, entry);
  if (!(await exists(src))) {
    console.warn(`[inspire-design] 跳过（不存在）：${entry}`);
    continue;
  }
  await cp(src, join(OUT, entry), { recursive: true });
  console.log(`[inspire-design] 已复制：${entry}`);
}

if (!(await exists(join(OUT, "web", "index.html")))) {
  console.error("[inspire-design] 打包失败：dist/web/index.html 缺失");
  process.exit(1);
}

console.log(`[inspire-design] 打包完成 → ${OUT}`);
console.log("[inspire-design] 将服务器根目录指向 dist，访问路径：/web/");
