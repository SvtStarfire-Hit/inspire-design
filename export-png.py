#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
export-png.py —— 把 HTML 设计稿渲染成 PNG（交付用图）

为什么需要它：HTML 是"可编辑的设计源"，但评审/存档仍然需要图片。
两者兼顾的办法就是保留 HTML 为唯一事实来源，图片由它派生 —— 改 HTML 后
重跑本脚本即可，不存在"图片和设计不一致"的问题。

用法（在仓库任意位置）：
	python export-png.py              # 全部渲染
	python export-png.py fig1         # 只渲染某一张

实现：调用本机 Edge/Chrome 的无头模式截图。两种图各有一套参数：
  - 页面稿（窗口壳层，如 fig1）→ 按固定尺寸精确截取，不裁剪；
  - 规格稿（文档式长页，如 fig2~fig4）→ 先用"足够大"的高度渲染，再用 Pillow
	按四角背景色自动裁掉四周空白，这样改内容不必手工调高度。

每张图的尺寸从哪来（优先级从高到低）：
  1. 下面 PAGES 表里显式列出的 —— 用于固定的交付尺寸（新项目通常为空）；
  2. HTML 开头的注释 <!-- @render 1680 3200 --> / <!-- @render 1680 3200 notrim -->
	 —— 跟着文件走，复制到别的项目也有效；
  3. 默认 1600×3200 且自动裁剪 —— 新加的 fig*.html 不配置也能直接渲染。
"""

import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

BROWSERS = [
	r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
	r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
	r"C:\Program Files\Google\Chrome\Application\chrome.exe",
	r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]

# (键, HTML 文件, 输出 PNG, 宽, 高, 是否自动裁剪)
# 新项目从空表开始 —— 目录里的 fig*.html 会自动被 all_pages() 扫描入队，
# 尺寸走"HTML 注释 / 缺省值"两种途径（见文件头"每张图的尺寸从哪来"）。
# 只有需要"固定交付尺寸 + 固定输出文件名"的图，才登记到这张表；
# 登记时注意：裁剪切图的"高"只要"够大"即可（多余空白会被 trim 掉）。
PAGES = []

# 未在 PAGES 里登记的 fig*.html 用这组缺省值（高度足够大，多余空白会被裁掉）
DEFAULT_W, DEFAULT_H, DEFAULT_TRIM = 1600, 3200, True

# <!-- @render 1680 3200 notrim -->
ANNOT = re.compile(r"<!--\s*@render\s+(\d+)\s*[x×,\s]\s*(\d+)\s*(notrim|trim)?\s*-->", re.I)

MARGIN = 20  # 裁剪后补回的白边（像素）


def find_browser():
	for b in BROWSERS:
		if os.path.exists(b):
			return b
	raise SystemExit("找不到 Edge 或 Chrome，无法渲染。")


def read_annotation(html):
	"""读 HTML 开头的 <!-- @render W H [trim|notrim] -->；没有就用缺省值。"""
	w, h, do_trim = DEFAULT_W, DEFAULT_H, DEFAULT_TRIM
	try:
		with open(os.path.join(HERE, html), encoding="utf-8", errors="replace") as f:
			head = f.read(4000)
	except OSError:
		return w, h, do_trim
	m = ANNOT.search(head)
	if m:
		w, h = int(m.group(1)), int(m.group(2))
		if m.group(3):
			do_trim = m.group(3).lower() != "notrim"
	return w, h, do_trim


def all_pages():
	"""PAGES 表 + 目录里其它未登记的 fig*.html（后者走注释或缺省值）。"""
	pages = list(PAGES)
	listed = set(p[1] for p in PAGES)
	for name in sorted(os.listdir(HERE)):
		if not name.lower().endswith(".html") or name in listed:
			continue
		if not name.lower().startswith("fig"):
			continue
		w, h, do_trim = read_annotation(name)
		key = os.path.splitext(name)[0]
		pages.append((key, name, key + ".png", w, h, do_trim))
	return pages


def shoot(exe, html, out, w, h):
	url = "file:///" + os.path.join(HERE, html).replace("\\", "/")
	cmd = [
		exe,
		"--headless=new",
		"--disable-gpu",
		"--hide-scrollbars",
		"--no-sandbox",
		"--force-device-scale-factor=1",
		"--default-background-color=FFFFFFFF",
		"--virtual-time-budget=8000",   # 等 mermaid / JS 渲染完
		"--window-size=%d,%d" % (w, h),
		"--screenshot=" + out,
		url,
	]
	r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
	if not os.path.exists(out):
		raise SystemExit("截图失败：%s\n%s" % (html, r.stdout.decode("utf-8", "replace")))
	return out


def trim(path, margin=MARGIN, shot_h=None):
	"""按四角背景色裁掉四周空白，再补回等量白边。
	shot_h：截图高度，用于判断内容是否触底（触底说明视口开小了，底部被切掉）。"""
	try:
		from PIL import Image, ImageChops
	except ImportError:
		return  # 未安装 Pillow：跳过裁剪（main() 结尾会统一提示安装方法）

	im = Image.open(path).convert("RGB")
	bg = Image.new("RGB", im.size, im.getpixel((0, 0)))
	box = ImageChops.difference(im, bg).getbbox()
	if not box:
		return
	l, t, r, b = box
	if shot_h and b > shot_h - 40:
		print("  !! 内容触到截图底边（%d/%d），底部可能被截断 —— 请调大 PAGES 表 / @render 注释里的高度" % (b, shot_h))
	l = max(0, l - margin)
	t = max(0, t - margin)
	r = min(im.size[0], r + margin)
	b = min(im.size[1], b + margin)
	if (l, t, r, b) != (0, 0, im.size[0], im.size[1]):
		im.crop((l, t, r, b)).save(path)
		print("   裁剪 → %dx%d" % (r - l, b - t))


def main():
	exe = find_browser()
	print("浏览器：%s" % os.path.basename(exe))
	want = sys.argv[1] if len(sys.argv) > 1 else None

	try:
		from PIL import Image
	except ImportError:
		Image = None

	for key, html, png, w, h, do_trim in all_pages():
		if want and want != key:
			continue
		out = os.path.join(HERE, png)
		if not os.path.exists(os.path.join(HERE, html)):
			print("[skip] %s 不存在" % html)
			continue
		shoot(exe, html, out, w, h)
		if do_trim:
			trim(out, shot_h=h)
		if Image is not None:
			im = Image.open(out)
			print("[ok] %-26s %dx%d" % (png, im.size[0], im.size[1]))
		else:
			print("[ok] %-26s (尺寸未确认——未安装 Pillow)" % png)

	if Image is None:
		print()
		print("提示：未安装 Pillow —— 截图已正常生成，自动裁剪与尺寸确认已跳过。")
		print("      需要裁剪长页空白请运行：pip install pillow，然后重跑本脚本。")


if __name__ == "__main__":
	main()
