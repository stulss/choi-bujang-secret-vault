import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const userProfile = process.env.USERPROFILE;
const folder1 = join(userProfile, 'Desktop', '보안_포트폴리오_ZTNA_Agent');
const folder2 = join(userProfile, 'Desktop', '최부장의비밀금고_보안엔지니어링_포트폴리오');

function getBase64Image(filePath) {
  if (!existsSync(filePath)) return null;
  const bytes = readFileSync(filePath);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function renderHtml(title, mdContentWithBase64) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.5.0/github-markdown.min.css">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'default' });
</script>
<style>
  body { margin: 0; padding: 24px; background: #f6f8fa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", sans-serif; color: #1f2328; }
  .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 1000px; margin: 0 auto; padding: 48px; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); border: 1px solid #d0d7de; }
  .print-bar { max-width: 1000px; margin: 0 auto 16px; display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 14px 20px; border-radius: 8px; border: 1px solid #d0d7de; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
  .btn-print { background: #0969da; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
  .btn-print:hover { background: #0856b7; }
  .markdown-body img { max-width: 100%; height: auto; border: 1px solid #d0d7de; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); margin: 16px 0 20px; display: block; }
  @media (max-width: 767px) { body { padding: 12px; } .markdown-body { padding: 20px; } .print-bar { flex-direction: column; gap: 10px; align-items: stretch; text-align: center; } }
  @media print { body { background: #fff; padding: 0; } .markdown-body { box-shadow: none; border: none; padding: 0; } .print-bar { display: none; } }
</style>
</head>
<body>
  <div class="print-bar">
    <span>🛡️ <strong>보안 엔지니어링 포트폴리오</strong> (상단 버튼으로 즉시 PDF 저장 및 인쇄 가능)</span>
    <button class="btn-print" onclick="window.print()">🖨️ PDF로 저장 / 인쇄</button>
  </div>
  <article class="markdown-body" id="content"></article>
  <script>
    const rawMd = ${JSON.stringify(mdContentWithBase64)};
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
}

function processFolder(targetDir, mdName, htmlName, title) {
  const mdPath = join(targetDir, mdName);
  const htmlPath = join(targetDir, htmlName);
  const shotsDir = join(targetDir, 'screenshots');

  if (!existsSync(mdPath)) {
    console.error('MD not found in', targetDir);
    return;
  }

  let md = readFileSync(mdPath, 'utf8');

  // Replace any docs/screenshots/ or screenshots/ with actual Base64 for HTML
  const imageMap = {
    'screenshot-01-dashboard-real.png': getBase64Image(join(shotsDir, 'screenshot-01-dashboard-real.png')) || getBase64Image(join(shotsDir, 'screenshot-02-endpoint-agent-real.png')),
    'screenshot-02-endpoint-agent-real.png': getBase64Image(join(shotsDir, 'screenshot-02-endpoint-agent-real.png')) || getBase64Image(join(shotsDir, 'screenshot-01-dashboard-real.png')),
    'screenshot-04-dashboard-demo.png': getBase64Image(join(shotsDir, 'screenshot-04-dashboard-demo.png')) || getBase64Image(join(shotsDir, 'screenshot-03-ztna-decider-demo.png')),
    'screenshot-03-ztna-decider-demo.png': getBase64Image(join(shotsDir, 'screenshot-03-ztna-decider-demo.png')) || getBase64Image(join(shotsDir, 'screenshot-04-dashboard-demo.png')),
    'screenshot-02-personal-ai.png': getBase64Image(join(shotsDir, 'screenshot-02-personal-ai.png')) || getBase64Image(join(shotsDir, 'screenshot-04-personal-ai-groq.png')),
    'screenshot-04-personal-ai-groq.png': getBase64Image(join(shotsDir, 'screenshot-04-personal-ai-groq.png')) || getBase64Image(join(shotsDir, 'screenshot-02-personal-ai.png')),
    'screenshot-03-responsive-mobile.png': getBase64Image(join(shotsDir, 'screenshot-03-responsive-mobile.png')) || getBase64Image(join(shotsDir, 'screenshot-05-mobile-responsive.png')),
    'screenshot-05-mobile-responsive.png': getBase64Image(join(shotsDir, 'screenshot-05-mobile-responsive.png')) || getBase64Image(join(shotsDir, 'screenshot-03-responsive-mobile.png')),
    'screenshot-01-choi-bujang-vault-web.png': getBase64Image(join(shotsDir, 'screenshot-01-choi-bujang-vault-web.png')) || getBase64Image(join(shotsDir, 'screenshot-00-choi-bujang-vault-web.png')),
  };

  // For Markdown, keep local relative paths: ./screenshots/...
  let mdForDisk = md.replace(/docs\/screenshots\//g, './screenshots/');
  writeFileSync(mdPath, mdForDisk, 'utf8');

  // For HTML, inline Base64 data URI so it NEVER breaks regardless of file path
  let mdWithBase64 = md;
  for (const [filename, base64Uri] of Object.entries(imageMap)) {
    if (base64Uri) {
      const regex = new RegExp(`(?:docs\\/screenshots\\/|\\.\\/screenshots\\/|screenshots\\/)${filename}`, 'g');
      mdWithBase64 = mdWithBase64.replace(regex, base64Uri);
    }
  }

  const html = renderHtml(title, mdWithBase64);
  writeFileSync(htmlPath, html, 'utf8');
  console.log(`Updated: ${htmlPath} (HTML with inlined Base64 images)`);
}

// 1. Update 보안_포트폴리오_ZTNA_Agent
processFolder(folder1, '포트폴리오_ZTNA_보안Agent.md', '포트폴리오_ZTNA_보안Agent.html', '포트폴리오 · 제로 트러스트(ZTNA) 보안 Agent & 침해 방어전');

// 2. Update 최부장의비밀금고_보안엔지니어링_포트폴리오
processFolder(folder2, '포트폴리오_최부장의비밀금고.md', '포트폴리오_최부장의비밀금고.html', '포트폴리오 · 최부장의 비밀 금고 (BYTE BACK) & ZTNA 보안 Agent');
