import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const desktopDir = join(process.env.USERPROFILE, 'Desktop', '최부장의비밀금고_보안엔지니어링_포트폴리오');
const mdPath = join(desktopDir, '포트폴리오_최부장의비밀금고.md');
const outPath = join(desktopDir, '포트폴리오_최부장의비밀금고.html');

const mdContent = readFileSync(mdPath, 'utf8');

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>포트폴리오 · 최부장의 비밀 금고 & 제로 트러스트(ZTNA) 보안 Agent</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.5.0/github-markdown.min.css">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'default' });
</script>
<style>
  body { margin: 0; padding: 24px; background: #f6f8fa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", sans-serif; color: #1f2328; }
  .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 1000px; margin: 0 auto; padding: 48px; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); border: 1px solid #d0d7de; }
  .print-bar { max-width: 1000px; margin: 0 auto 16px; display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 12px 20px; border-radius: 8px; border: 1px solid #d0d7de; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
  .btn-print { background: #0969da; color: white; border: none; padding: 9px 18px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .btn-print:hover { background: #0856b7; }
  .markdown-body img { max-width: 100%; border: 1px solid #d0d7de; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin: 12px 0 16px; display: block; }
  @media (max-width: 767px) { body { padding: 12px; } .markdown-body { padding: 20px; } .print-bar { flex-direction: column; gap: 10px; align-items: stretch; text-align: center; } }
  @media print { body { background: #fff; padding: 0; } .markdown-body { box-shadow: none; border: none; padding: 0; } .print-bar { display: none; } }
</style>
</head>
<body>
  <div class="print-bar">
    <span>🛡️ <strong>최부장의 비밀 금고 보안 엔지니어링 포트폴리오</strong> (상단 버튼으로 PDF 저장 및 인쇄 가능)</span>
    <button class="btn-print" onclick="window.print()">🖨️ PDF로 저장 / 인쇄</button>
  </div>
  <article class="markdown-body" id="content"></article>
  <script>
    const rawMd = ${JSON.stringify(mdContent)};
    marked.setOptions({ gfm: true, breaks: true });
    document.getElementById('content').innerHTML = marked.parse(rawMd);
    document.querySelectorAll('code.language-mermaid').forEach(el => {
      const pre = el.parentElement;
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = el.textContent;
      pre.replaceWith(div);
    });
  </script>
</body>
</html>`;

writeFileSync(outPath, html, 'utf8');
console.log('Successfully written HTML to:', outPath);
