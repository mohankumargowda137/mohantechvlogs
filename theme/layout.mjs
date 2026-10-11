// Page templates. Each function returns a full HTML document string.
// `site.link(path)` prefixes the GitHub Pages base path; always use it for internal URLs.

// A blog is the atomic unit. It stands alone (/blogs/<slug>/) or lives in a series (/<series>/<slug>/).

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = (d) =>
  d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';

const isoDate = (d) => (d ? d.toISOString().slice(0, 10) : '');

function shell({ site, title, description = site.description, image, body, bodyClass = '', canonical }) {
  const fullTitle = title ? `${title} · ${site.title}` : site.title;
  const ogImage = image && !/^https?:/.test(image) ? `${site.url}${image.slice(site.basePath.length)}` : image;
  return `<!doctype html>
<html lang="${site.language ?? 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(description)}">
  ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">\n  <meta name="twitter:card" content="summary_large_image">` : ''}
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
  <link rel="icon" href="${site.link('assets/favicon.svg')}" type="image/svg+xml">
  <link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="${site.link('feed.xml')}">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" media="(prefers-color-scheme: light)" id="hl-light">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" media="(prefers-color-scheme: dark)" id="hl-dark">
  <link rel="stylesheet" href="${site.link('assets/style.css')}">
  <script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
  ${site.extraHead ?? ''}
</head>
<body class="${bodyClass}" data-root="${site.link('')}">
  <header class="site-header">
    <div class="wrap-wide header-inner">
      <a class="brand" href="${site.link('')}"><span>${esc(site.title)}</span></a>
      <div class="header-search">
        <button class="search-trigger" type="button" data-search-open aria-label="Search the site" aria-haspopup="dialog">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span class="st-label">Search series and blogs…</span>
          <kbd class="st-kbd">⌘K</kbd>
        </button>
      </div>
      <div class="header-right">
        <nav class="site-nav" id="site-nav" aria-label="Main">
          ${site.hasSeries ? `<a href="${site.link('series/')}">Series</a>` : ''}
          ${site.hasBlogs ? `<a href="${site.link('blogs/')}">Blogs</a>` : ''}
          <a href="${site.link('feed.xml')}">RSS</a>
          ${site.social?.github ? `<a href="${esc(site.social.github)}" target="_blank" rel="noopener">GitHub</a>` : ''}
        </nav>
        <div class="header-actions">
          <button class="icon-btn search-icon" type="button" data-search-open aria-label="Search the site" aria-haspopup="dialog">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <button class="icon-btn theme-toggle" type="button" aria-label="Toggle dark mode">◐</button>
          <button class="icon-btn menu-toggle" type="button" aria-label="Menu" aria-controls="site-nav" aria-expanded="false">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  </header>
  <main>
${body}
  </main>
  <div class="search-modal" id="search-modal" role="dialog" aria-modal="true" aria-label="Search the site" hidden>
    <div class="search-backdrop" data-search-close></div>
    <div class="search-panel">
      <div class="search-field">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input type="search" id="site-search" placeholder="Search series and blogs…" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list">
        <button type="button" class="search-esc" data-search-close aria-label="Close search">Esc</button>
      </div>
      <div class="search-results" id="search-results" role="listbox" aria-label="Results"></div>
      <div class="search-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
    </div>
  </div>
  <footer class="site-footer">
    <div class="wrap-wide">© ${new Date().getFullYear()} ${esc(site.author ?? site.title)}</div>
  </footer>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" defer></script>
  <script src="${site.link('assets/main.js')}" defer></script>
</body>
</html>
`;
}

// `priority`: 'high' for the main above-the-fold image, 'eager' for others visible on load.
const thumb = (src, alt, cls = 'thumb', priority) =>
  src
    ? `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}"${
        priority === 'high' ? ' fetchpriority="high"' : priority === 'eager' ? '' : ' loading="lazy"'
      } decoding="async">`
    : `<div class="${cls} thumb-placeholder" style="--h:${hue(alt)}" aria-hidden="true"><span>${esc(alt)}</span></div>`;

function hue(str) {
  let h = 0;
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

const draftBadge = (x) => (x.draft ? ' <span class="badge">Draft</span>' : '');


const HOME_COUNT = 3; // cards per column on the home page

const searchText = (...parts) => esc(parts.flat().filter(Boolean).join(' ').toLowerCase());
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const tagPills = (tags, max = 3) =>
  tags.length ? `<div class="tags">${tags.slice(0, max).map((t) => `<span>#${esc(t)}</span>`).join('')}</div>` : '';
const metaLine = (b) => [fmtDate(b.date), `${b.readingMinutes} min read`].filter(Boolean).join(' · ');

export function homePage({ site, seriesList, blogs }) {
  if (!seriesList.length && !blogs.blogs.length) {
    return shell({
      site,
      bodyClass: 'home',
      body: `<section class="wrap-wide intro"><h1>${esc(site.title)}</h1><p class="empty">Nothing here yet — add a blog or series under <code>content/</code>.</p></section>`,
    });
  }

  // Series (wide, left) · standalone blogs (narrow, right)
  const column = (cls, title, count, cards, allHref, allLabel) => `
      <div class="home-col ${cls}">
        <h2 class="home-col-head">${esc(title)} <span class="count">${count}</span></h2>
        ${cards || '<p class="empty">Nothing here yet.</p>'}
        ${count ? `<a class="home-col-foot" href="${allHref}">${esc(allLabel)} →</a>` : ''}
      </div>`;

  return shell({
    site,
    image: seriesList[0]?.thumbnail ?? blogs.blogs[0]?.thumbnail,
    bodyClass: 'home',
    body: `
    <section class="home-split wrap-wide">
      ${column('home-series', 'Series', seriesList.length,
        seriesList.slice(0, HOME_COUNT).map((s, i) => seriesCard(site, s, i < 2 ? 'eager' : undefined)).join(''),
        site.link('series/'), 'View all series')}
      ${column('home-blogs', 'Blogs', blogs.blogs.length,
        blogs.blogs.slice(0, HOME_COUNT).map((b, i) => blogCard(site, b, i < 2 ? 'eager' : undefined)).join(''),
        site.link('blogs/'), 'View all blogs')}
    </section>`,
  });
}

function tocNav(blog) {
  return blog.toc.length >= 3
    ? `<nav class="toc"><strong>On this page</strong><ul>${blog.toc
        .map((h) => `<li class="d${h.depth}"><a href="#${h.id}">${esc(h.text)}</a></li>`)
        .join('')}</ul></nav>`
    : '';
}

function referencesSection(blog) {
  return blog.references.length
    ? `<section class="references">
        <h2 id="references">References</h2>
        <ol>${blog.references
          .map((r) => {
            const external = /^[a-z]+:\/\//i.test(r.url);
            return `<li><a href="${esc(r.url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${esc(r.title)}</a>${r.note ? ` — ${esc(r.note)}` : ''}</li>`;
          })
          .join('')}</ol>
      </section>`
    : '';
}

function blogHeader(blog, kicker) {
  return `<header class="post-head">
          ${kicker ? `<div class="part">${kicker}</div>` : ''}
          <h1>${esc(blog.title)}${draftBadge(blog)}</h1>
          ${blog.subtitle ? `<p class="subtitle">${esc(blog.subtitle)}</p>` : ''}
          <div class="meta">${[blog.date ? `<time datetime="${isoDate(blog.date)}">${fmtDate(blog.date)}</time>` : '', `${blog.readingMinutes} min read`].filter(Boolean).join(' · ')}</div>
          ${tagPills(blog.tags, Infinity)}
        </header>
        ${blog.thumbnail ? `<img class="post-cover" src="${esc(blog.thumbnail)}" alt="" fetchpriority="high" decoding="async">` : ''}`;
}

// Series reader: sidebar with every blog in the series (grouped by section), the blog, outline.
function seriesReader({ site, series, blog, prev, next, landing = false }) {
  const href = (b) => site.link(`${series.slug}/${b.slug}/`);
  const total = series.blogs.length;
  const totalMinutes = series.blogs.reduce((n, b) => n + b.readingMinutes, 0);

  const item = (b) => `
          <li${b.slug === blog?.slug ? ' class="current" aria-current="page"' : ''}>
            <a href="${href(b)}"><span class="n">${String(b.number).padStart(2, '0')}</span><span class="t">${esc(b.title)}${draftBadge(b)}</span><span class="m">${b.readingMinutes}m</span></a>
          </li>`;

  const sections = series.sections
    .map((sec) =>
      sec.title
        ? `
        <details class="nav-section" open>
          <summary><span>${esc(sec.title)}</span><span class="count">${sec.blogs.length}</span></summary>
          ${sec.description ? `<p class="sec-desc">${esc(sec.description)}</p>` : ''}
          <ol>${sec.blogs.map(item).join('')}</ol>
        </details>`
        : `<ol class="nav-loose">${sec.blogs.map(item).join('')}</ol>`
    )
    .join('');

  const progress = blog ? Math.round((blog.number / total) * 100) : 0;

  const sidebar = `
    <aside class="reader-nav" id="reader-nav" data-series="${esc(series.slug)}">
      <div class="reader-nav-inner">
        <a class="crumb" href="${site.link('series/')}">← All series</a>
        <a class="nav-series" href="${site.link(`${series.slug}/`)}">
          ${thumb(series.thumbnail, series.title, 'nav-cover', 'eager')}
          <span class="kicker">Series · ${plural(total, 'blog')} · ${totalMinutes} min</span>
          <strong>${esc(series.title)}${draftBadge(series)}</strong>
        </a>
        ${blog ? `
        <div class="progress" aria-label="Blog ${blog.number} of ${total}">
          <div class="progress-bar"><span style="width:${progress}%"></span></div>
          <span>Blog ${blog.number} of ${total}</span>
        </div>` : ''}
        <nav class="nav-sections" aria-label="${esc(series.title)} contents">${sections}</nav>
      </div>
    </aside>`;

  const pager = (b, label, cls) =>
    b
      ? `<a class="${cls}" href="${href(b)}"><span>${label}${b.section ? ` · ${esc(b.section)}` : ''}</span>${esc(b.title)}</a>`
      : '<span></span>';

  const article = blog
    ? `
      <article class="post reader-post">
        ${blogHeader(blog, `${blog.section ? `${esc(blog.section)} · ` : ''}Blog ${blog.number} of ${total}`)}
        <div class="prose">${blog.html}</div>
        ${referencesSection(blog)}
        ${prev || next ? `<nav class="pager">${pager(prev, '← Previous', 'prev')}${pager(next, 'Next →', 'next')}</nav>` : ''}
      </article>`
    : `<article class="post reader-post"><h1>${esc(series.title)}</h1><p class="empty">No blogs published yet.</p></article>`;

  return shell({
    site,
    title: landing || !blog ? series.title : `${blog.title} · ${series.title}`,
    description: (landing ? series.subtitle : blog?.subtitle) || series.subtitle,
    image: blog?.thumbnail ?? series.thumbnail,
    canonical: landing && blog ? site.absolute(`${series.slug}/${blog.slug}/`) : undefined,
    bodyClass: 'reader',
    body: readerFrame({
      barTitle: series.title,
      barMeta: blog ? `${blog.number} / ${total}` : '',
      sidebar,
      article,
      toc: blog ? tocNav(blog) : '',
    }),
  });
}

// Three-column reading layout: navigation drawer | article | outline.
// Without a `sidebar` (standalone blogs) there's no series drawer: the blog is centered.
function readerFrame({ barTitle, barMeta, sidebar, article, toc }) {
  if (!sidebar) {
    return `
    <div class="reader-layout no-nav wrap-wide${toc ? '' : ' no-toc'}">
      <div class="reader-main">${article}</div>
      ${toc ? `<div class="reader-toc"><div class="sidebar">${toc}</div></div>` : ''}
    </div>`;
  }
  return `
    <div class="reader-bar">
      <button type="button" class="nav-toggle" aria-controls="reader-nav" aria-expanded="false">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <span>${esc(barTitle)}</span>
        ${barMeta ? `<span class="muted">${esc(barMeta)}</span>` : ''}
      </button>
    </div>
    <div class="reader-layout wrap-wide${toc ? '' : ' no-toc'}">
      ${sidebar}
      <div class="reader-main">${article}</div>
      ${toc ? `<div class="reader-toc"><div class="sidebar">${toc}</div></div>` : ''}
    </div>
    <div class="nav-backdrop" hidden></div>`;
}

export function seriesPage({ site, series, blog, next }) {
  return seriesReader({ site, series, blog, prev: null, next, landing: true });
}

// One page for every blog: with a series it gets the series sidebar; standalone it doesn't.
export function blogPage({ site, series, blog, prev, next }) {
  if (series) return seriesReader({ site, series, blog, prev, next });

  const href = (b) => site.link(`blogs/${b.slug}/`);
  const pager = (b, label, cls) =>
    b ? `<a class="${cls}" href="${href(b)}"><span>${label}</span>${esc(b.title)}</a>` : '<span></span>';

  return shell({
    site,
    title: blog.title,
    description: blog.subtitle,
    image: blog.thumbnail,
    bodyClass: 'reader',
    body: readerFrame({
      article: `
      <article class="post reader-post">
        <a class="crumb" href="${site.link('blogs/')}">← All blogs</a>
        ${blogHeader(blog)}
        <div class="prose">${blog.html}</div>
        ${referencesSection(blog)}
        ${prev || next ? `<nav class="pager">${pager(prev, '← Older', 'prev')}${pager(next, 'Newer →', 'next')}</nav>` : ''}
      </article>`,
      toc: tocNav(blog),
    }),
  });
}

function seriesCard(site, s, priority) {
  const tags = [...new Set([...s.tags, ...s.blogs.flatMap((b) => b.tags)])];
  const minutes = s.blogs.reduce((n, b) => n + b.readingMinutes, 0);

  return `
      <article class="series-card" data-filter data-search="${searchText(s.title, s.subtitle, tags, s.sections.map((sec) => sec.title), s.blogs.map((b) => b.title))}">
        ${thumb(s.thumbnail, s.title, 'sc-cover', priority)}
        <div class="sc-body">
          <div class="kicker">${plural(s.blogs.length, 'blog')} · ${minutes} min</div>
          <h2><a class="stretched" href="${site.link(`${s.slug}/`)}">${esc(s.title)}</a>${draftBadge(s)}</h2>
          ${s.subtitle ? `<p class="sc-sub">${esc(s.subtitle)}</p>` : ''}
          ${tagPills(tags)}
          <div class="sc-foot">
            <span class="meta">${s.updated ? `Updated ${fmtDate(s.updated)}` : ''}</span>
            <span class="sc-cta">Start reading →</span>
          </div>
        </div>
      </article>`;
}

export function seriesIndexPage({ site, seriesList }) {
  const blogCount = seriesList.reduce((n, s) => n + s.blogs.length, 0);
  return shell({
    site,
    title: 'Series',
    description: 'Follow a topic from the first blog to the last.',
    image: seriesList[0]?.thumbnail,
    body: `
    <section class="wrap-wide page-head">
      <a class="crumb" href="${site.link('')}">← Home</a>
      <div class="page-head-row">
        <div>
          <h1>Series</h1>
          <p class="subtitle">Follow a topic from the first blog to the last · ${plural(seriesList.length, 'series', 'series')}, ${plural(blogCount, 'blog')}</p>
        </div>
        ${seriesList.length > 3 ? `
        <label class="search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input type="search" id="filter-search" placeholder="Search series…" autocomplete="off" aria-label="Search series">
        </label>` : ''}
      </div>
    </section>
    <section class="wrap-wide series-grid">${seriesList.map((s, i) => seriesCard(site, s, i < 3 ? 'eager' : undefined)).join('')}</section>
    <p class="wrap-wide empty no-results" hidden>No series match that search. <button type="button" class="link-btn" data-reset>Clear</button></p>`,
  });
}

function blogCard(site, b, priority) {
  const href = site.link(`blogs/${b.slug}/`);
  return `
      <article class="blog-card">
        <a href="${href}" tabindex="-1" aria-hidden="true">${thumb(b.thumbnail, b.title, 'tile-thumb', priority)}</a>
        <div class="tile-body">
          <h2><a class="stretched" href="${href}">${esc(b.title)}</a>${draftBadge(b)}</h2>
          ${tagPills(b.tags)}
          ${b.subtitle ? `<p>${esc(b.subtitle)}</p>` : ''}
          <div class="meta">${metaLine(b)}</div>
        </div>
      </article>`;
}

export function blogsIndexPage({ site, blogs }) {
  return shell({
    site,
    title: 'Blogs',
    description: 'Standalone guides and how-tos.',
    body: `
    <section class="wrap-wide page-head">
      <a class="crumb" href="${site.link('')}">← Home</a>
      <h1>Blogs</h1>
      <p class="subtitle">Standalone guides and how-tos · ${plural(blogs.blogs.length, 'blog')}</p>
    </section>
    <section class="wrap-wide tile-grid">${blogs.blogs.map((b, i) => blogCard(site, b, i < 4 ? 'eager' : undefined)).join('')}</section>`,
  });
}

export function notFoundPage({ site }) {
  return shell({
    site,
    title: 'Not found',
    bodyClass: 'space-page',
    body: `
    <div class="space-fx" aria-hidden="true">
      <canvas class="space-canvas"></canvas>
      <svg class="astro" width="94" height="72" viewBox="-76 -36 104 80">
        <g class="nf-astro">
          <path class="nf-tether" d="M-15 14 C-30 22 -34 6 -50 10 S-66 -4 -72 6" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 5" stroke-linecap="round"/>
          <g stroke="#9aa0ad" stroke-width="1.6" stroke-linejoin="round">
          <rect x="-17" y="-4" width="34" height="30" rx="7" fill="#c9cdd8"/>
          <rect x="-12" y="21" width="10" height="16" rx="4" fill="#eef0f5"/>
          <rect x="2" y="21" width="10" height="16" rx="4" fill="#eef0f5"/>
          <rect x="-24" y="2" width="10" height="20" rx="5" fill="#eef0f5" transform="rotate(18 -19 4)"/>
          <rect x="14" y="-10" width="10" height="20" rx="5" fill="#eef0f5" transform="rotate(-38 19 8)"/>
          <rect x="-13" y="-2" width="26" height="28" rx="10" fill="#eef0f5"/>
          <circle cy="-16" r="16" fill="#eef0f5"/>
          </g>
          <rect x="-6" y="6" width="12" height="8" rx="2" fill="#c9cdd8"/>
          <circle cx="-2" cy="10" r="1.8" fill="#f59e0b"/><circle cx="3" cy="10" r="1.8" fill="var(--accent)"/>
          <ellipse cx="2" cy="-15" rx="10.5" ry="8" fill="#1e293b"/>
          <ellipse cx="2" cy="-15" rx="10.5" ry="8" fill="var(--accent)" opacity=".35"/>
          <ellipse cx="-2" cy="-18" rx="3.5" ry="2" fill="#fff" opacity=".8" transform="rotate(-25 -2 -18)"/>
        </g>
      </svg>
    </div>
    <section class="wrap-wide not-found">
      <svg class="nf-art" viewBox="-60 -10 600 250" role="img" aria-label="A satellite circling a planet shaped like a zero">
        <defs>
          <radialGradient id="nf-glow"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></radialGradient>
        </defs>
        <g class="nf-stars" fill="var(--muted)">
          <circle cx="40" cy="40" r="2.5"/><circle cx="96" cy="206" r="2"/><circle cx="170" cy="22" r="1.8"/>
          <circle cx="500" cy="10" r="2.2"/><circle cx="130" cy="0" r="2"/><circle cx="40" cy="14" r="2.2"/><circle cx="-40" cy="60" r="2.5"/><circle cx="-56" cy="190" r="2"/><circle cx="410" cy="212" r="2"/>
          <circle cx="14" cy="176" r="1.8"/><circle cx="462" cy="140" r="1.8"/>
        </g>
        <path class="nf-spark" d="M476 84 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" fill="var(--accent)"/>
        <path class="nf-spark" d="M28 92 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#f59e0b"/>
        <circle cx="240" cy="120" r="130" fill="url(#nf-glow)"/>
        <text class="nf-digit" x="92" y="174" text-anchor="middle">4</text>
        <text class="nf-digit" x="388" y="174" text-anchor="middle">4</text>
        <ellipse cx="240" cy="120" rx="82" ry="20" fill="none" stroke="var(--muted)" stroke-width="3" opacity=".5" transform="rotate(-18 240 120)"/>
        <circle cx="240" cy="120" r="50" fill="var(--surface)" stroke="var(--accent)" stroke-width="14"/>
        <path d="M218 104 a6 6 0 1 0 0.1 0z M256 136 a4 4 0 1 0 0.1 0z M252 100 a3 3 0 1 0 0.1 0z" fill="var(--accent)" opacity=".35"/>
        <g class="nf-orbit">
          <circle cx="240" cy="120" r="84" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round" opacity=".7"/>
          <g transform="translate(324 120) rotate(30)">
            <rect x="-14" y="-4" width="10" height="8" rx="1.5" fill="var(--accent)" opacity=".7"/>
            <rect x="4" y="-4" width="10" height="8" rx="1.5" fill="var(--accent)" opacity=".7"/>
            <circle r="6" fill="#f59e0b"/>
          </g>
        </g>
      </svg>
      <h1>This page drifted off into space</h1>
      <p>We couldn't find what you were looking for. It may have moved, or the link might be mistyped.</p>
      <div class="cta">
        <a class="btn primary" href="${site.link('')}">Go to the home page</a>
        ${site.hasSeries ? `<a class="btn" href="${site.link('series/')}">Browse series</a>` : ''}
        ${site.hasBlogs ? `<a class="btn" href="${site.link('blogs/')}">Browse blogs</a>` : ''}
      </div>
    </section>`,
  });
}
