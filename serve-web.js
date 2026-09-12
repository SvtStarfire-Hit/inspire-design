#!/usr/bin/env node
/**
 * InspireDesign 页面端 · 本地静态服务器（零依赖，原型阶段形态）
 *
 * 用途：为 web/ 页面端提供静态文件服务。
 *   - 页面端通过 <script type="module"> 直接加载 ../data/*.js（单一事实来源）
 *   - file:// 协议下浏览器会拦截 ESM 跨目录加载，故需要一个 http 服务
 *
 * 用法：npm run web   （或 node serve-web.js）
 *   默认 http://localhost:4173/web/    端口可用环境变量 PORT 覆盖
 *   环境变量 NO_OPEN=1 时不自动打开浏览器（无头 / 脚本验证用）
 *
 * 边界：仅供本机浏览使用；不做缓存、不做日志聚合（原型阶段：先固化、不过度设计）。
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url))); // 项目根目录
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname === "/" || pathname === "") {
      res.writeHead(302, { Location: "/web/" });
      return res.end();
    }
    if (pathname === "/web") {
      res.writeHead(302, { Location: "/web/" });
      return res.end();
    }
    const rel = pathname.endsWith("/") ? pathname + "index.html" : pathname;
    const filePath = normalize(join(ROOT, rel));
    // 路径穿越防护：解析后的路径必须在项目根之内
    if (!filePath.startsWith(ROOT + sep)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("403 Forbidden");
    }
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/web/`;
  console.log(`[inspire-design] 页面端已启动：${url}`);
  console.log("[inspire-design] Ctrl+C 停止服务");
  // 自动打开浏览器（失败不影响服务本身；沙箱/受限环境下 start 可能不可用）
  if (process.platform === "win32" && !process.env.NO_OPEN) {
    execFile("cmd", ["/c", "start", "", url], () => { /* 忽略：能打开则开，打不开也罢 */ });
  }
});
