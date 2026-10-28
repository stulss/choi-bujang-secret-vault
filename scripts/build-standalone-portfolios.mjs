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
<html lang="ko" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
  mermaid.initialize({
    startOnLoad: true,
    theme: 'neutral',
    themeVariables: {
      primaryColor: '#e0f2fe',
      primaryTextColor: '#0369a1',
      primaryBorderColor: '#38bdf8',
      lineColor: '#64748b',
      secondaryColor: '#f1f5f9',
      tertiaryColor: '#ffffff'
    }
  });
</script>
<style>
  :root {
    --bg-page: #f1f5f9;
    --bg-card: #ffffff;
    --bg-subtle: #f8fafc;
    --border-color: #e2e8f0;
    --border-strong: #cbd5e1;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #64748b;
    --accent: #0284c7;
    --accent-hover: #0369a1;
    --accent-light: #e0f2fe;
    --accent-glow: rgba(2, 132, 199, 0.15);
    --badge-bg: #f0fdf4;
    --badge-border: #bbf7d0;
    --badge-text: #166534;
    --code-bg: #0f172a;
    --code-text: #f1f5f9;
    --card-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.05);
    --header-bg: rgba(255, 255, 255, 0.85);
  }

  [data-theme="dark"] {
    --bg-page: #0b0f19;
    --bg-card: #111827;
    --bg-subtle: #1f2937;
    --border-color: #1f2937;
    --border-strong: #374151;
    --text-primary: #f9fafb;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
    --accent: #38bdf8;
    --accent-hover: #7dd3fc;
    --accent-light: rgba(56, 189, 248, 0.15);
    --accent-glow: rgba(56, 189, 248, 0.25);
    --badge-bg: rgba(34, 197, 94, 0.15);
    --badge-border: rgba(34, 197, 94, 0.3);
    --badge-text: #4ade80;
    --code-bg: #030712;
    --code-text: #e2e8f0;
    --card-shadow: 0 12px 36px -6px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
    --header-bg: rgba(17, 24, 39, 0.85);
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background-color: var(--bg-page);
    color: var(--text-primary);
    font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 15.5px;
    line-height: 1.75;
    letter-spacing: -0.015em;
    -webkit-font-smoothing: antialiased;
    transition: background-color 0.25s ease, color 0.25s ease;
  }

  /* Sticky Top Bar */
  .top-navbar {
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    background-color: var(--header-bg);
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    transition: background-color 0.25s ease, border-color 0.25s ease;
  }
  .navbar-container {
    max-width: 1080px;
    margin: 0 auto;
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }
  .brand-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-shield {
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: var(--accent-light);
    border: 1px solid var(--accent);
  }
  .brand-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }
  .brand-subtitle {
    font-size: 12px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .status-dot {
    width: 7px;
    height: 7px;
    background-color: #22c55e;
    border-radius: 50%;
    display: inline-block;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.95); }
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .btn {
    border: none;
    outline: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .btn-print {
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    color: #ffffff;
    box-shadow: 0 2px 8px var(--accent-glow);
  }
  .btn-print:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px var(--accent-glow);
  }
  .btn-theme {
    background: var(--bg-subtle);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }
  .btn-theme:hover {
    background: var(--border-color);
    color: var(--text-primary);
  }

  /* Portfolio Container */
  .portfolio-wrap {
    max-width: 1080px;
    margin: 32px auto 64px;
    padding: 0 20px;
  }
  .portfolio-card {
    background: var(--bg-card);
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border-color);
    padding: 56px 64px;
    transition: background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  }

  /* Typography & Elements */
  h1 {
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-top: 0;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--border-color);
    line-height: 1.3;
  }
  h2 {
    font-size: 1.55rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: var(--text-primary);
    margin-top: 48px;
    margin-bottom: 20px;
    padding-left: 14px;
    border-left: 4px solid var(--accent);
    line-height: 1.35;
  }
  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin-top: 36px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h4 {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-top: 24px;
    margin-bottom: 10px;
  }
  p {
    margin-top: 0;
    margin-bottom: 16px;
    color: var(--text-secondary);
  }
  strong {
    color: var(--text-primary);
    font-weight: 600;
  }
  hr {
    border: none;
    height: 1px;
    background: var(--border-color);
    margin: 36px 0;
  }
  ul, ol {
    padding-left: 24px;
    margin-top: 0;
    margin-bottom: 20px;
    color: var(--text-secondary);
  }
  li {
    margin-bottom: 8px;
  }
  li::marker {
    color: var(--accent);
  }

  /* Links */
  a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.15s ease, border-bottom 0.15s ease;
    border-bottom: 1px solid transparent;
  }
  a:hover {
    color: var(--accent-hover);
    border-bottom-color: var(--accent);
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 24px 0;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    overflow: hidden;
    font-size: 14px;
    background: var(--bg-card);
  }
  thead {
    background: var(--bg-subtle);
  }
  th {
    padding: 12px 16px;
    font-weight: 600;
    text-align: left;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    font-size: 13px;
    letter-spacing: -0.01em;
  }
  td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-secondary);
    vertical-align: top;
  }
  tr:last-child td {
    border-bottom: none;
  }
  tr:hover td {
    background-color: var(--bg-subtle);
  }

  /* Code & Syntax */
  code {
    font-family: "Fira Code", Consolas, Monaco, "Courier New", monospace;
    font-size: 0.9em;
    padding: 2px 6px;
    border-radius: 5px;
    background: var(--bg-subtle);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
  }
  pre {
    background: var(--code-bg);
    color: var(--code-text);
    padding: 18px 22px;
    border-radius: 12px;
    overflow-x: auto;
    font-size: 13.5px;
    line-height: 1.6;
    margin: 20px 0;
    border: 1px solid var(--border-strong);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
  pre code {
    background: transparent;
    border: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }

  /* Screenshots & Images */
  img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    box-shadow: 0 10px 30px -8px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.05);
    margin: 20px 0 24px;
    display: block;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  img:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 40px -10px rgba(15, 23, 42, 0.2), 0 0 0 1px var(--accent-light);
  }

  /* Mermaid Diagram Container */
  .mermaid-wrapper {
    background: var(--bg-subtle);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    margin: 24px 0;
    display: flex;
    justify-content: center;
    overflow-x: auto;
  }
  .mermaid {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  /* Blockquote / Alert callouts */
  blockquote {
    margin: 20px 0;
    padding: 16px 20px;
    border-left: 4px solid var(--accent);
    background: var(--bg-subtle);
    border-radius: 0 8px 8px 0;
    color: var(--text-secondary);
  }
  blockquote p { margin: 0; }

  /* Responsive Design */
  @media (max-width: 820px) {
    .navbar-container { padding: 10px 16px; }
    .brand-subtitle { display: none; }
    .portfolio-wrap { margin: 16px auto 32px; padding: 0 12px; }
    .portfolio-card { padding: 28px 20px; border-radius: 12px; }
    h1 { font-size: 1.75rem; }
    h2 { font-size: 1.35rem; }
    table { font-size: 13px; }
    th, td { padding: 8px 10px; }
  }

  /* Print Optimization */
  @media print {
    body {
      background: #ffffff !important;
      color: #000000 !important;
      font-size: 12pt;
    }
    .top-navbar { display: none !important; }
    .portfolio-wrap { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
    .portfolio-card {
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    img {
      box-shadow: none !important;
      border: 1px solid #ccc !important;
      page-break-inside: avoid;
      max-width: 95% !important;
      margin: 10px auto !important;
    }
    table, pre, .mermaid-wrapper {
      page-break-inside: avoid;
    }
    h2, h3 {
      page-break-after: avoid;
    }
    a {
      color: #000000 !important;
      text-decoration: underline !important;
    }
  }
</style>
</head>
<body>
  <!-- Top Glassmorphism Navigation Bar -->
  <header class="top-navbar">
    <div class="navbar-container">
      <div class="brand-group">
        <div class="brand-shield">🛡️</div>
        <div>
          <div class="brand-title">보안 엔지니어링 포트폴리오</div>
          <div class="brand-subtitle">
            <span class="status-dot"></span>
            <span>최부장의 비밀 금고 (BYTE BACK) & ZTNA 보안 Agent · 실배포 검증</span>
          </div>
        </div>
      </div>
      <div class="nav-actions">
        <button class="btn btn-theme" onclick="toggleTheme()" id="themeBtn">🌙 다크 모드</button>
        <button class="btn btn-print" onclick="window.print()">🖨️ PDF 저장 / 인쇄</button>
      </div>
    </div>
  </header>

  <!-- Main Content Wrap -->
  <main class="portfolio-wrap">
    <article class="portfolio-card" id="content"></article>
  </main>

  <script>
    const rawMd = ${JSON.stringify(mdContentWithBase64)};
    marked.setOptions({ gfm: true, breaks: true });
    document.getElementById('content').innerHTML = marked.parse(rawMd);

    // Render Mermaid diagrams cleanly inside wrappers
    document.querySelectorAll('code.language-mermaid').forEach(el => {
      const pre = el.parentElement;
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-wrapper';
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = el.textContent;
      wrapper.appendChild(div);
      pre.replaceWith(wrapper);
    });

    // Dark/Light Theme Switcher
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      const btn = document.getElementById('themeBtn');
      btn.textContent = next === 'dark' ? '☀️ 라이트 모드' : '🌙 다크 모드';
    }
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

// 1. Update 보안_포트폴리오_ZTNA_Agent if exists
if (existsSync(folder1)) {
  processFolder(folder1, '포트폴리오_ZTNA_보안Agent.md', '포트폴리오_ZTNA_보안Agent.html', '포트폴리오 · 제로 트러스트(ZTNA) 보안 Agent & 침해 방어전');
}

// 2. Update 최부장의비밀금고_보안엔지니어링_포트폴리오 (Sync directly from latest PORTFOLIO.md)
if (existsSync(folder2)) {
  processFolder(
    folder2,
    '포트폴리오_최부장의비밀금고.md',
    '포트폴리오_최부장의비밀금고.html',
    '포트폴리오 · 최부장의 비밀 금고 (BYTE BACK) & ZTNA 보안 Agent',
    join(projectRoot, 'PORTFOLIO.md')
  );
}
