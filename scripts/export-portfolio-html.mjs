import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const mdContent = readFileSync(new URL('../PORTFOLIO.md', import.meta.url), 'utf8');

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>포트폴리오 · 제로 트러스트(ZTNA) 엔드포인트 보안 Agent & 클라우드 침해 방어전</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.5.0/github-markdown.min.css">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'default' });
</script>
<style>
  body { margin: 0; padding: 24px; background: #f6f8fa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", sans-serif; color: #1f2328; }
  .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 980px; margin: 0 auto; padding: 48px; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); border: 1px solid #d0d7de; }
  .print-bar { max-width: 980px; margin: 0 auto 16px; display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 12px 20px; border-radius: 8px; border: 1px solid #d0d7de; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
  .btn-print { background: #0969da; color: white; border: none; padding: 9px 18px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .btn-print:hover { background: #0856b7; }
  @media (max-width: 767px) { body { padding: 12px; } .markdown-body { padding: 20px; } .print-bar { flex-direction: column; gap: 10px; align-items: stretch; text-align: center; } }
  @media print { body { background: #fff; padding: 0; } .markdown-body { box-shadow: none; border: none; padding: 0; } .print-bar { display: none; } }
</style>
</head>
<body>
  <div class="print-bar">
    <span>📄 <strong>보안 엔지니어링 포트폴리오</strong> (상단 버튼을 누르면 즉시 PDF로 인쇄/저장할 수 있습니다)</span>
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

const outPath = join(process.env.USERPROFILE, 'Desktop', '포트폴리오_ZTNA_보안Agent.html');
writeFileSync(outPath, html, 'utf8');
console.log('HTML portfolio generated successfully at:', outPath);
