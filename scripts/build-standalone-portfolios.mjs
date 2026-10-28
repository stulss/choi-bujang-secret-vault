import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const userProfile = process.env.USERPROFILE;
const folder1 = join(userProfile, 'Desktop', '보안_포트폴리오_ZTNA_Agent');
const folder2 = join(userProfile, 'Desktop', '최부장의비밀금고_보안엔지니어링_포트폴리오');
const projectRoot = process.cwd();

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

function processFolder(targetDir, mdName, htmlName, title, sourceMdPath = null) {
  const mdPath = join(targetDir, mdName);
  const htmlPath = join(targetDir, htmlName);
  const shotsDir = join(targetDir, 'screenshots');

  let rawContent;
  if (sourceMdPath && existsSync(sourceMdPath)) {
    rawContent = readFileSync(sourceMdPath, 'utf8');
  } else if (existsSync(mdPath)) {
    rawContent = readFileSync(mdPath, 'utf8');
  } else {
    console.error('MD not found for', targetDir);
    return;
  }

  // 1. Markdown with relative links ./screenshots/...
  let mdForDisk = rawContent.replace(/docs\/screenshots\//g, './screenshots/');
  writeFileSync(mdPath, mdForDisk, 'utf8');

  // 2. Base64 replacement for HTML
  let mdWithBase64 = mdForDisk;

  // Scan all images in shotsDir and project docs/screenshots
  const candidateDirs = [shotsDir, join(projectRoot, 'docs', 'screenshots')];
  const allImages = new Set();
  for (const dir of candidateDirs) {
    if (existsSync(dir)) {
      for (const file of readdirSync(dir)) {
        if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
          allImages.add(file);
        }
      }
    }
  }

  for (const filename of allImages) {
    let b64 = null;
    for (const dir of candidateDirs) {
      const p = join(dir, filename);
      if (existsSync(p)) {
        b64 = getBase64Image(p);
        if (b64) break;
      }
    }
    if (b64) {
      const regex = new RegExp(`(?:docs\\/screenshots\\/|\\.\\/screenshots\\/|screenshots\\/)${filename}`, 'g');
      mdWithBase64 = mdWithBase64.replace(regex, b64);
    }
  }

  const html = renderHtml(title, mdWithBase64);
  writeFileSync(htmlPath, html, 'utf8');
  console.log(`Updated: ${htmlPath} (HTML with inlined Base64 images)`);
}

// 1. Update 보안_포트폴리오_ZTNA_Agent
processFolder(folder1, '포트폴리오_ZTNA_보안Agent.md', '포트폴리오_ZTNA_보안Agent.html', '포트폴리오 · 제로 트러스트(ZTNA) 보안 Agent & 침해 방어전');

// 2. Update 최부장의비밀금고_보안엔지니어링_포트폴리오 (Sync directly from latest PORTFOLIO.md)
processFolder(
  folder2,
  '포트폴리오_최부장의비밀금고.md',
  '포트폴리오_최부장의비밀금고.html',
  '포트폴리오 · 최부장의 비밀 금고 (BYTE BACK) & ZTNA 보안 Agent',
  join(projectRoot, 'PORTFOLIO.md')
);
