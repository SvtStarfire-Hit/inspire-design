/* ============================================================================
   InspireDesign 页面端 · 交互脚本
   ----------------------------------------------------------------------------
   约束：零框架、零构建；数据与 MCP 端同源（data/*.js，ESM 直接加载）。
   职责：hash 路由 / 渲染视图 / 一键复制 / 折叠 / Mermaid 流程图（含降级）。
   不追踪进度（与无状态原则一致），不做阶段门禁（门禁在人）。
   ========================================================================== */
import { stages } from "../../data/stages.js";
import { modes } from "../../data/modes.js";
import { capabilities } from "../../data/capabilities.js";

/* ---------- 基础工具 ---------- */
const view = document.getElementById("view");
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name, cls = "icon") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

const primaryMode = modes.find((m) => m.status === "primary") ?? modes[0];

/** 组装某阶段的完整约束包（与 mcp-server.js 同一合并逻辑：模式覆盖 > 通用内容） */
function contractOf(stage) {
  const override = primaryMode.stageOverrides?.[stage.id] ?? {};
  return { ...stage, ...override };
}
/** 解析环境要求（透传自能力包） */
function environmentOf(contract) {
  return (contract.capabilities ?? []).flatMap((id) => capabilities[id]?.requirements ?? []);
}

let cbSeq = 0;
function codeblock(label, text) {
  const id = `cb-${++cbSeq}`;
  return `<div class="codeblock">
    <div class="codeblock-head">
      <span class="codeblock-label">${esc(label)}</span>
      <button class="btn-copy" type="button" data-copy-el="#${id}">${icon("copy")}<span>复制</span></button>
    </div>
    <pre><code id="${id}">${esc(text)}</code></pre>
  </div>`;
}
function cmd(text) {
  return `<span class="cmd"><code>${esc(text)}</code><button class="btn-copy" type="button" data-copy="${esc(text)}" title="复制命令">${icon("copy")}</button></span>`;
}

/* ---------- 一键复制 ---------- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* 降级：file:// 或旧环境走 execCommand */ }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { /* 忽略 */ }
  ta.remove();
  return ok;
}
function flashCopied(btn) {
  if (btn.dataset.original == null) btn.dataset.original = btn.innerHTML;
  btn.classList.add("copied");
  btn.innerHTML = `${icon("check")}<span>已复制</span>`;
  clearTimeout(btn._t);
  btn._t = setTimeout(() => {
    btn.classList.remove("copied");
    btn.innerHTML = btn.dataset.original;
  }, 1400);
}
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy], [data-copy-el]");
  if (!btn) return;
  let text = btn.dataset.copy ?? "";
  if (btn.dataset.copyEl) text = document.querySelector(btn.dataset.copyEl)?.textContent ?? "";
  if (await copyText(text)) flashCopied(btn);
});

/* ---------- 渲染片段 ---------- */
const notice = (kind, iconName, body) =>
  `<div class="notice notice-${kind}">${icon(iconName)}<div class="notice-body">${body}</div></div>`;

const section = (iconName, title, body, extra = "") =>
  `<section class="section">
    <h2 class="section-title">${icon(iconName)}${title}${extra}</h2>
    ${body}
  </section>`;

function deliverableCards(items) {
  return `<div class="deliverable-grid">${items
    .map(
      (d) => `<div class="card deliverable">
        <div class="name">${icon("file")}${esc(d.name)}</div>
        ${d.path ? `<code class="path">${esc(d.path)}</code>` : ""}
        <div class="desc">${esc(d.description)}</div>
      </div>`
    )
    .join("")}</div>`;
}
function checklist(items) {
  return `<ul class="checklist">${items.map((t) => `<li><span class="box"></span><span>${esc(t)}</span></li>`).join("")}</ul>`;
}
function plainList(items, cls = "") {
  return `<ul class="plain-list ${cls}">${items.map((t) => `<li><span>${esc(t)}</span></li>`).join("")}</ul>`;
}
function steps(items) {
  return `<ol class="steps">${items.map((t) => `<li><span>${esc(t)}</span></li>`).join("")}</ol>`;
}
function envTable(reqs) {
  return `<div class="table-wrap"><div class="table-scroll"><table class="env-table">
    <thead><tr><th>组件</th><th>为什么需要</th><th>检查 / 安装</th></tr></thead>
    <tbody>${reqs
      .map(
        (r) => `<tr>
        <td><div class="req-name">${esc(r.name)}</div>
          <div>${r.minVersion ? `<span class="badge badge-planned">≥ ${esc(r.minVersion)}</span> ` : ""}${
          r.optional ? `<span class="badge badge-planned">可选</span>` : `<span class="badge badge-brand">必装</span>`
        }</div></td>
        <td class="req-why">${esc(r.why)}</td>
        <td>${cmd(r.check)}<div class="req-install">安装：${esc(r.install)}</div></td>
      </tr>`
      )
      .join("")}</tbody>
  </table></div></div>`;
}

/* ---------- 视图：首页 ---------- */
function renderHome() {
  const problems = [
    { t: "想法拆不开", d: "不会把灵感拆解成页面和功能结构——阶段 0 用几个问题把它结构化。" },
    { t: "描述不专业", d: "不会「专业地描述」想要的界面，AI 看不懂——每阶段配可复制的提示词模板。" },
    { t: "不知道何时算完", d: "不清楚每一步做到什么程度算做完——每阶段有明确出口条件，多数机器可查。" },
    { t: "不想学设计工具", d: "不懂 Figma 也不想学——全程在文本世界完成：HTML / CSS + 复制即用。" },
  ];
  return `<div class="container">
    <section class="hero">
      <div class="hero-eyebrow badge badge-brand">${icon("spark")}9 阶段流程 · 从灵感到 UI 设计稿</div>
      <h1 class="hero-title">把「有灵感」，走成<span class="accent">可施工的 UI 设计稿</span></h1>
      <p class="hero-desc">InspireDesign 不替你写代码，也不替你写提示词。它把一套经过验证的《从灵感到 UI 设计》工程方法论，
      拆成 9 个阶段的约束包——每个阶段告诉你：目标是什么、该说什么、做到什么程度算做完。</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-lg" href="#/overview">${icon("compass")}查看 9 阶段全景</a>
        <a class="btn btn-secondary btn-lg" href="#/about">${icon("book")}核心理念</a>
      </div>
    </section>

    ${section("target", "它解决什么问题", `<div class="grid-tiles">${problems
      .map((p) => `<div class="card"><div class="card-title">${esc(p.t)}</div><p class="card-desc" style="margin-top:8px">${esc(p.d)}</p></div>`)
      .join("")}</div>`)}

    ${section(
      "layers",
      "同一份内容，两个出口",
      `<div class="duo-grid">
        <div class="card duo-card">
          <div class="who">页面端 · 给人看</div>
          <div class="what">你正在浏览的形态</div>
          <p class="how">独立了解整套流程；知道每个阶段该做什么；复制可用的提示词范例，去和 AI 对话。</p>
        </div>
        <div class="card duo-card">
          <div class="who">MCP 端 · 给 AI 用</div>
          <div class="what">AI agent 的约束来源</div>
          <p class="how">在支持 MCP 的 AI IDE 中注册后，AI 拿到当前阶段的完整约束，按流程引导你：问什么、产出什么、什么时候停下来等你确认。</p>
        </div>
      </div>`
    )}

    ${section(
      "play",
      "快速使用",
      `<div class="duo-grid">
        <div class="card">
          <div class="card-head"><span class="card-title">路径 A · 让 AI agent 引导你</span><span class="badge badge-brand">推荐</span></div>
          <ol class="steps" style="margin-top:16px">
            <li><span>在 AI IDE（Qoder / Trae / Cursor…）中注册 MCP 服务，格式见 <code>docs/04</code> §6</span></li>
            <li><span>对 AI 说话：「用 InspireDesign 的 WPF 模式引导我做一个 xxx」</span></li>
            <li><span>按流程走：每阶段 AI 引导 → 产出 → 停下来等你确认，说「行」即进下一阶段</span></li>
          </ol>
        </div>
        <div class="card">
          <div class="card-head"><span class="card-title">路径 B · 自己阅读 + 复制提示词</span></div>
          <ol class="steps" style="margin-top:16px">
            <li><span>从<a href="#/overview">流程全景</a>进入任一阶段</span></li>
            <li><span>照着「该怎么做」的编号步骤推进</span></li>
            <li><span>把「提示词模板」一键复制，粘贴到你的 AI 对话中</span></li>
          </ol>
        </div>
      </div>`
    )}

    ${section(
      "monitor",
      "模式",
      `<div class="grid-tiles">${modes
        .map((m) => {
          const active = m.status === "primary";
          const card = `<div class="card mode-card ${active ? "card-link" : "is-disabled"}">
            ${icon(active ? "monitor" : "layers", "icon icon-lg")}
            <div class="card-title" style="margin-top:12px">${esc(m.name)}</div>
            <p class="card-desc">${esc(m.description)}</p>
            <div class="tech" style="margin-top:12px">${m.techStack.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
            <div style="margin-top:14px">${
              active ? `<span class="badge badge-brand">首发 · 可用</span>` : `<span class="badge badge-planned">规划中</span>`
            }</div>
          </div>`;
          return active ? `<a href="#/overview" style="text-decoration:none">${card}</a>` : card;
        })
        .join("")}</div>`
    )}
  </div>`;
}

/* ---------- 视图：流程全景 ---------- */
/* Mermaid 加载策略：本地 vendor 优先（自包含、离线可用）→ CDN 兜底 → 文字降级
   注意：动态 script 的相对路径基于页面 URL（非模块 URL）解析，故写 "vendor/..." */
const MERMAID_SOURCES = [
  "vendor/mermaid.min.js",
  "https://cdn.jsdelivr.net/npm/mermaid@12/dist/mermaid.min.js",
];
let mermaidLoading = null;

function loadScript(src, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`加载失败：${src}`));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error(`加载超时：${src}`)), timeoutMs);
  });
}

function ensureMermaid() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (!mermaidLoading) {
    mermaidLoading = (async () => {
      let lastErr;
      for (const src of MERMAID_SOURCES) {
        try {
          await loadScript(src);
          window.mermaid.initialize({
            startOnLoad: false,
            theme: "base",
            themeVariables: {
              fontFamily: 'system-ui, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
              fontSize: "13px",
              primaryColor: "#eef2ff",
              primaryTextColor: "#1e1b4b",
              primaryBorderColor: "#c7d2fe",
              lineColor: "#94a3b8",
              clusterBkg: "#f8fafc",
              clusterBorder: "#e2e8f0",
            },
          });
          return window.mermaid;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr ?? new Error("Mermaid 不可用");
    })();
    mermaidLoading.catch(() => { mermaidLoading = null; }); // 失败后允许下次重试
  }
  return mermaidLoading;
}
async function renderDiagram() {
  const frame = document.getElementById("mermaid-frame");
  if (!frame) return;
  try {
    const m = await ensureMermaid();
    await m.run({ nodes: [frame.querySelector(".mermaid")] });
  } catch {
    frame.classList.add("failed"); // 降级：显示文字版流转
  }
}

function renderOverview() {
  const chain = stages
    .map((s) => `<span class="chip">${s.number} · ${esc(s.name)}</span>`)
    .join(icon("arrow-right", "icon icon-sm"));
  const mermaidSrc = `flowchart TB
  subgraph P1["设计前置"]
    direction LR
    A["0 · 功能蓝图&lt;br/&gt;页面清单 + 流转图"] --> B["1 · 风格探索&lt;br/&gt;2-3 个视觉方向"]
    B --> C["2 · 定令牌&lt;br/&gt;tokens.css"]
    C --> D["3 · 搭组件库&lt;br/&gt;app.css"]
  end
  subgraph P2["设计产出"]
    direction LR
    E["4 · 画主界面&lt;br/&gt;fig1"] --> F["5 · 画规格页&lt;br/&gt;fig2..N"]
    F --> G["6 · 体检出图&lt;br/&gt;报告 + PNG"]
    G --> H["7 · 写映射&lt;br/&gt;mapping.md"]
    H --> I["8 · 交接开发&lt;br/&gt;提示词 + 顺序"]
  end
  D --> E`;

  return `<div class="container">
    <div class="page-head">
      <h1 class="page-title">流程全景</h1>
      <p class="page-desc">9 个阶段构成一条从灵感走向可施工设计稿的路径。每个阶段都有明确的目标、产物与出口条件；
      随时可以回退修正，不做门禁——门禁在人（你说行才行）。</p>
    </div>

    <div class="diagram">
      <div class="diagram-frame" id="mermaid-frame">
        <pre class="mermaid">${mermaidSrc}</pre>
        <div class="mermaid-fallback">${chain}</div>
      </div>
    </div>

    ${section(
      "layers",
      "阶段卡片",
      `<div class="stage-grid">${stages
        .map((raw) => {
          const s = contractOf(raw);
          const chips = s.deliverables
            .slice(0, 2)
            .map((d) => `<span>${esc(d.name)}</span>`)
            .join("");
          return `<a class="card card-link stage-card" href="#/stage/${s.id}">
            <div class="card-head">
              <span class="badge badge-outline">阶段 ${s.number}</span>
              <span class="badge badge-brand">${icon("check")}出口条件 ${s.exitCriteria.length} 项</span>
            </div>
            <div class="card-title">${esc(s.name)}</div>
            <p class="stage-goal">${esc(s.goal)}</p>
            <div class="card-foot"><div class="tech">${chips}</div></div>
          </a>`;
        })
        .join("")}</div>`
    )}
  </div>`;
}

/* ---------- 视图：阶段详情 ---------- */
function renderStage(id) {
  const raw = stages.find((s) => s.id === id);
  if (!raw) return renderMissingStage(id);
  const s = contractOf(raw);
  const idx = stages.findIndex((x) => x.id === id);
  const prev = stages[idx - 1];
  const next = stages[idx + 1];
  const env = environmentOf(s);

  const deps = s.dependencies.length
    ? section(
        "info",
        "前置依赖",
        depsList(s.dependencies)
      )
    : "";
  const envSection = env.length ? section("terminal", "环境要求", envTable(env)) : "";

  return `<div class="container narrow">
    <div class="breadcrumb">
      <a href="#/overview">流程全景</a>${icon("chevron-right", "icon icon-sm")}<span>阶段 ${s.number} · ${esc(s.name)}</span>
    </div>
    <div class="page-head">
      <div style="margin-bottom:12px">
        <span class="badge badge-outline">阶段 ${s.number} / 8</span>
        <span class="badge badge-brand" style="margin-left:6px">${icon("monitor")}${esc(primaryMode.name)}</span>
      </div>
      <h1 class="page-title">${esc(s.name)}</h1>
      <p class="page-desc">${esc(s.goal)}</p>
    </div>

    ${section("package", "产物", deliverableCards(s.deliverables))}
    ${section("target", "出口条件（怎么算做完）", checklist(s.exitCriteria))}
    ${deps}
    ${section("shield", "规则", plainList(s.rules))}
    ${section("steps", "该怎么做", steps(s.guidance))}
    ${section("spark", "提示词模板", codeblock("prompt · 复制给 AI 用", s.aiPromptTemplate))}
    ${section("alert", "常见坑", plainList(s.pitfalls, "pitfall-list"))}
    ${section(
      "undo",
      "回退影响面",
      `<details class="fold">
        <summary>${icon("chevron-right", "icon icon-sm")}如果你要回头改这一阶段的产物…</summary>
        <div class="fold-body">${plainList(s.revisionImpact)}</div>
      </details>`
    )}

    <section class="section">
      <div class="checkpoint">
        ${icon("user-check")}
        <div>
          <div class="label">停下来等人确认 · HUMAN CHECKPOINT</div>
          <div class="text">${esc(s.humanCheckpoint)}</div>
        </div>
      </div>
    </section>

    ${envSection}

    <nav class="stage-nav">
      ${
        prev
          ? `<a class="card card-link" href="#/stage/${prev.id}">
              <span class="dir">${icon("chevron-left", "icon icon-sm")}上一阶段 · ${prev.number}</span>
              <div class="name">${esc(prev.name)}</div>
            </a>`
          : `<span class="spacer"></span>`
      }
      ${
        next
          ? `<a class="card card-link next" href="#/stage/${next.id}">
              <span class="dir">下一阶段 · ${next.number}${icon("chevron-right", "icon icon-sm")}</span>
              <div class="name">${esc(next.name)}</div>
            </a>`
          : `<span class="spacer"></span>`
      }
    </nav>
  </div>`;
}

function depsList(deps) {
  return deps
    .map((d) => {
      const target = stages.find((x) => x.id === d.stageId);
      const name = target ? `<a href="#/stage/${target.id}">阶段 ${target.number} · ${esc(target.name)}</a>` : esc(d.stageId);
      return notice("brand", "info", `<strong>需要先完成：</strong>${name} 的「${esc(d.deliverable)}」。${esc(d.hint)}`);
    })
    .join('<div style="height:12px"></div>');
}

function renderMissingStage(id) {
  return `<div class="container narrow">
    <div class="page-head"><h1 class="page-title">找不到阶段「${esc(id)}」</h1></div>
    ${notice("warn", "alert", `可用的阶段：${stages.map((s) => `<a href="#/stage/${s.id}">${s.number} ${esc(s.name)}</a>`).join(" · ")}`)}
  </div>`;
}

/* ---------- 视图：工具链 ---------- */
function envChecklistText() {
  const reqs = capabilities["design-toolkit"]?.requirements ?? [];
  const lines = reqs.map(
    (r) =>
      `- ${r.name}${r.minVersion ? `（≥ ${r.minVersion}）` : ""}${r.optional ? "（可选）" : "（必装）"}：${r.why}｜检查：${r.check}｜安装：${r.install}`
  );
  return `请先逐项检查以下环境，缺失的先报告给我确认后再安装，装完复检：\n${lines.join("\n")}`;
}

function renderToolkit() {
  const pack = capabilities["design-toolkit"];
  return `<div class="container">
    <div class="page-head">
      <h1 class="page-title">工具链</h1>
      <p class="page-desc">两个跨模式共享的设计工程脚本，支撑阶段 6「体检出图」。它们的错误信息是写给 AI 看的：
      缺什么、装什么命令、装完重试——不是一堆堆栈。</p>
    </div>

    <div class="duo-grid">
      ${(pack?.scripts ?? [])
        .map(
          (sc) => `<div class="card">
          <div class="card-head"><span class="card-title">${icon("terminal")} ${esc(sc.file)}</span><span class="badge badge-outline">${esc(sc.purpose.split("：")[0])}</span></div>
          <p class="card-desc" style="margin-top:10px">${esc(sc.purpose)}</p>
          <div style="margin-top:16px">${cmd(sc.usage)}</div>
          <p class="card-desc" style="margin-top:12px">${icon("check", "icon icon-sm")} 通过标准：${esc(sc.pass)}</p>
        </div>`
        )
        .join("")}
    </div>

    ${section(
      "terminal",
      "环境要求（声明式）",
      `<div style="margin-bottom:16px">${notice(
        "info",
        "info",
        `工具只负责<b>声明</b>环境要求。检查、与用户确认、安装、复检由 AI agent 执行——把下面这份清单（或整个文件）交给 AI，它会逐项检查。`
      )}</div>
      <div style="margin-bottom:16px">
        <button class="btn btn-secondary" type="button" data-copy-el="#env-checklist-src">${icon("copy")}复制全部为清单文本</button>
        <div hidden><pre id="env-checklist-src">${esc(envChecklistText())}</pre></div>
      </div>
      ${envTable(pack?.requirements ?? [])}`
    )}
  </div>`;
}

/* ---------- 视图：关于 ---------- */
function renderAbout() {
  const ideas = [
    { t: "设计的事实来源必须是可编辑的文本", d: "设计源是 HTML，改一行即可；图片（PNG）只做交付物，永远不在图片上改设计。评审意见回到文本改，不反向。" },
    { t: "角色分工：工具 / AI / 人", d: "工具声明该做什么、怎么检查、怎么算通过；AI 引导对话、检查环境、执行操作；人拍板：满意不满意、装不装、走不走。" },
    { t: "人说了算", d: "工具不参与满意度判断——每个阶段结束，AI 停下来问「这样行吗」，你说行就行。工具只判断形状问题（溢出、越界），不判断意图问题。" },
    { t: "回退是一等公民", d: "任何阶段的产物都能回去改。约束包自带「回退影响面」：改了令牌，哪些文件需要复查，一目了然。回退不是失败，是流程的正常组成部分。" },
    { t: "环境要求是声明式的", d: "需要工具链时，随约束返回环境要求清单（含为什么、检查命令、安装方式），由 AI 逐项落实——工具不碰系统环境。" },
    { t: "粗粒度、无状态", d: "一个核心工具拿走完整约束，不拆成十几个细碎工具；工具不记进展——「进展」由文件系统本身记录（tokens.css 存在 = 定令牌已完成）。" },
  ];
  return `<div class="container">
    <div class="page-head">
      <h1 class="page-title">关于 InspireDesign</h1>
      <p class="page-desc">把「从灵感到 UI」的方法论编码成可被人和 AI 共同消费的知识资产。以下是核心理念的精简版，
      完整论证见 <a href="../docs/01-核心理念.md">docs/01-核心理念.md</a>。</p>
    </div>
    <div class="duo-grid">
      ${ideas
        .map(
          (it) => `<div class="card"><div class="card-title">${esc(it.t)}</div><p class="card-desc" style="margin-top:10px">${esc(it.d)}</p></div>`
        )
        .join("")}
    </div>
    ${section(
      "book",
      "文档索引",
      plainList([
        "README.md —— 项目总览与状态",
        "WPF-README.md —— WPF 模式工程操作细则（可直接复制进目标项目）",
        "docs/01-核心理念.md —— 每个设计决策背后的论证",
        "docs/02-流程模型.md —— 9 个阶段的完整定义",
        "docs/03-数据契约.md —— 约束包 / 能力包 / 环境要求的字段结构",
        "docs/04-MCP服务设计.md —— MCP 工具接口与接入方式",
        "docs/05-页面端设计.md —— 页面端信息架构与交互",
        "docs/06-设计工具链.md —— check-layout.js / export-png.py 的集成方式",
        "docs/07-文件职责说明.md —— 逐文件能力说明",
      ])
    )}
  </div>`;
}

/* ---------- 路由 ---------- */
const TITLES = {
  home: "InspireDesign · 从灵感到 UI 的方法论",
  overview: "流程全景 · InspireDesign",
  toolkit: "工具链 · InspireDesign",
  about: "关于 · InspireDesign",
};

function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  let key = "home";
  let html = "";

  const stageMatch = hash.match(/^\/stage\/([\w-]+)$/);
  if (stageMatch) {
    key = "stage";
    const s = stages.find((x) => x.id === stageMatch[1]);
    html = renderStage(stageMatch[1]);
    document.title = s ? `阶段 ${s.number} ${s.name} · InspireDesign` : TITLES.home;
  } else if (hash === "/overview") {
    key = "overview";
    html = renderOverview();
    document.title = TITLES.overview;
  } else if (hash === "/toolkit") {
    key = "toolkit";
    html = renderToolkit();
    document.title = TITLES.toolkit;
  } else if (hash === "/about") {
    key = "about";
    html = renderAbout();
    document.title = TITLES.about;
  } else {
    html = renderHome();
    document.title = TITLES.home;
  }

  view.innerHTML = html;
  window.scrollTo({ top: 0 });

  // 顶部导航高亮（阶段详情归属「流程全景」）
  const navKey = key === "stage" ? "overview" : key;
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === navKey);
  });

  if (key === "overview") renderDiagram();
}

window.addEventListener("hashchange", route);
route();
