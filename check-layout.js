/* ============================================================================
   check-layout.js —— 设计稿"体检"工具（诊断溢出 / 越界 / 遮挡）
   ----------------------------------------------------------------------------
   PNG 草图时代的教训：浅色小圆点错位、文字跨栏这类问题肉眼看不出来。
   HTML 时代可以量化检查 —— 用 CDP 打开页面，把所有"内容超出容器"的元素
   全部列出来。每次改完样式跑一遍，比盯图可靠。

   用法： node check-layout.js fig1-overview.html 1680 1046
   ========================================================================== */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

const file = process.argv[2];
const W = +(process.argv[3] || 1680);
const H = +(process.argv[4] || 1046);
const PORT = 9333 + (process.pid % 400);

if (!file) { console.error('用法: node check-layout.js <html> [w] [h]'); process.exit(2); }

const exe = BROWSERS.find(p => fs.existsSync(p));
if (!exe) { console.error('找不到 Edge/Chrome'); process.exit(2); }

const url = 'file:///' + path.resolve(__dirname, file).replace(/\\/g, '/');

const EXPR = `JSON.stringify((function () {
  function box(el) { var r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }
  function desc(el) {
	var c = typeof el.className === 'string' ? el.className : '';
	return (el.tagName.toLowerCase() + (c ? '.' + c.trim().split(/\\s+/).slice(0, 2).join('.') : '')).slice(0, 46);
  }
  var all = Array.prototype.slice.call(document.querySelectorAll('*')).filter(function (e) {
	var r = e.getBoundingClientRect();
	return r.width > 0 && r.height > 0;
  });

  var vOver = [], hOver = [];
  all.forEach(function (e) {
	var cs = getComputedStyle(e);
	if (cs.overflowY !== 'visible' && e.clientHeight > 0 && e.scrollHeight > e.clientHeight + 1)
	  vOver.push({ el: desc(e), over: e.scrollHeight - e.clientHeight, box: box(e) });
	if (cs.overflowX !== 'visible' && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1)
	  hOver.push({ el: desc(e), over: e.scrollWidth - e.clientWidth, box: box(e) });
  });

  /* 文字越出最近的"有边框祖先"（≈ 卡片出框） */
  var leaks = [];
  var anchored = all.filter(function (e) {
	return e.children.length === 0 && e.textContent.trim().length > 0;
  });
  anchored.forEach(function (e) {
	var t = e.getBoundingClientRect();
	var p = e.parentElement;
	while (p && p !== document.body) {
	  var cs = getComputedStyle(p);
	  var hasFrame = cs.borderTopWidth !== '0px' || cs.borderRadius !== '0px' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
	  if (hasFrame && p.getBoundingClientRect().height > 24) break;
	  p = p.parentElement;
	}
	if (!p || p === document.body) return;
	var pb = p.getBoundingClientRect();
	if (t.right > pb.right + 1 || t.left < pb.left - 1 || t.bottom > pb.bottom + 1 || t.top < pb.top - 1) {
	  leaks.push({ text: e.textContent.trim().slice(0, 28), el: desc(e), out: box(e), frame: desc(p), frameBox: box(p) });
	}
  });

  return {
	doc: { w: document.documentElement.scrollWidth, h: document.body.scrollHeight },
	vOverflow: vOver.slice(0, 14),
	hOverflow: hOver.slice(0, 14),
	textLeak: leaks.slice(0, 14)
  };
})())`;

(async () => {
  const child = spawn(exe, [
	'--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
	'--force-device-scale-factor=1',
	'--remote-debugging-port=' + PORT,
	'--window-size=' + W + ',' + H,
	url,
  ], { stdio: 'ignore' });

  try {
	let targets = null;
	for (let i = 0; i < 60; i++) {
	  await new Promise(r => setTimeout(r, 250));
	  try {
		const r = await fetch('http://127.0.0.1:' + PORT + '/json/list');
		const list = await r.json();
		const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
		if (page) { targets = page; break; }
	  } catch (_) { /* 还没起来 */ }
	}
	if (!targets) throw new Error('CDP 未就绪');

	const ws = new WebSocket(targets.webSocketDebuggerUrl);
	await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

	let id = 0;
	const call = (method, params) => new Promise((res, rej) => {
	  const mid = ++id;
	  const onMsg = ev => {
		const m = JSON.parse(ev.data);
		if (m.id === mid) { ws.removeEventListener('message', onMsg); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
	  };
	  ws.addEventListener('message', onMsg);
	  ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
	});

	await call('Runtime.enable');
	await new Promise(r => setTimeout(r, 4500));   // 等 JS / 字体 / mermaid 稳定
	const out = await call('Runtime.evaluate', { expression: EXPR, returnByValue: true });
	console.log('=== ' + file + '  (' + W + '×' + H + ')');
	console.log(JSON.stringify(JSON.parse(out.result.value), null, 1));
	ws.close();
  } catch (e) {
	console.error('测量失败：' + e.message);
	process.exitCode = 1;
  } finally {
	child.kill();
  }
})();
