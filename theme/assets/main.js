// Syntax highlighting, copy buttons, theme toggle, active TOC entry.
(function () {
  const root = document.documentElement;

  function applyHighlightTheme() {
    const forced = root.dataset.theme;
    const light = document.getElementById('hl-light');
    const dark = document.getElementById('hl-dark');
    if (!light || !dark) return;
    light.media = forced ? (forced === 'light' ? 'all' : 'not all') : '(prefers-color-scheme: light)';
    dark.media = forced ? (forced === 'dark' ? 'all' : 'not all') : '(prefers-color-scheme: dark)';
  }
  applyHighlightTheme();

  // Opened straight from disk (file://): folders don't serve index.html, so link to it.
  if (location.protocol === 'file:') {
    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!/^[a-z]+:|^#/i.test(href)) a.setAttribute('href', href.replace(/^([^#?]*\/)(?=[#?]|$)/, '$1index.html'));
    });
  }

  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    applyHighlightTheme();
  });

  // Center the navbar search: size it so both side columns can be equally wide,
  // and fall back to the icon button when the bar would get too narrow.
  const header = document.querySelector('.header-inner');
  const headerSearch = document.querySelector('.header-search');
  if (header && headerSearch) {
    const MIN_BAR = 260;
    const brand = header.querySelector('.brand');
    const right = header.querySelector('.header-right');
    const fit = () => {
      root.classList.remove('header-compact');
      if (getComputedStyle(headerSearch).display === 'none') return; // small screens: CSS handles it
      const cs = getComputedStyle(header);
      const inner = header.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const side = Math.max(brand.scrollWidth, right.scrollWidth);
      const gap = parseFloat(cs.columnGap) || 0;
      const bar = Math.min(620, inner - 2 * side - 2 * gap);
      root.style.setProperty('--header-side', `${side}px`);
      headerSearch.style.width = `${Math.max(0, bar)}px`;
      root.classList.toggle('header-compact', bar < MIN_BAR);
    };
    fit();
    addEventListener('resize', fit);
    document.fonts?.ready.then(fit);
  }

  // Mobile header menu
  const menuBtn = document.querySelector('.menu-toggle');
  const siteNav = document.getElementById('site-nav');
  if (menuBtn && siteNav) {
    const setMenu = (open) => {
      siteNav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', () => setMenu(!siteNav.classList.contains('open')));
    siteNav.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
    document.addEventListener('click', (e) => !e.target.closest('.site-header') && setMenu(false));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));
  }

  if (window.hljs) {
    document.querySelectorAll('pre code').forEach((el) => {
      if (!/language-(text|plain|plaintext)\b/.test(el.className)) window.hljs.highlightElement(el);
    });
  }

  document.querySelectorAll('.prose pre').forEach((pre) => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code').innerText);
        btn.textContent = 'Copied!';
      } catch (e) {
        btn.textContent = 'Failed';
      }
      setTimeout(() => (btn.textContent = 'Copy'), 1500);
    });
    pre.appendChild(btn);
  });

  const tocLinks = [...document.querySelectorAll('.toc a')];
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          tocLinks.forEach((a) => a.classList.remove('active'));
          byId.get(e.target.id)?.classList.add('active');
        }
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );
    byId.forEach((_, id) => { const h = document.getElementById(id); if (h) observer.observe(h); });
  }
})();

// Series index: the search box filters the series cards.
(function () {
  const input = document.getElementById('filter-search');
  if (!input) return;
  const items = [...document.querySelectorAll('[data-filter]')];
  const noResults = document.querySelector('.no-results');

  function apply() {
    const terms = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const el of items) {
      const ok = terms.every((t) => el.dataset.search.includes(t));
      el.hidden = !ok;
      if (ok) shown++;
    }
    if (noResults) noResults.hidden = shown > 0;
  }

  input.addEventListener('input', apply);
  document.querySelector('[data-reset]')?.addEventListener('click', () => {
    input.value = '';
    apply();
  });
})();

// Series reader: mobile drawer + keep the sidebar's scroll position between blogs.
(function () {
  const nav = document.getElementById('reader-nav');
  if (!nav) return;
  const inner = nav.querySelector('.reader-nav-inner');
  const toggle = document.querySelector('.nav-toggle');
  const backdrop = document.querySelector('.nav-backdrop');
  const key = `reader-nav:${nav.dataset.series}`;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    if (backdrop) backdrop.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }
  toggle?.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  backdrop?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));

  try {
    const saved = sessionStorage.getItem(key);
    if (saved) inner.scrollTop = Number(saved);
  } catch (e) {}
  const current = nav.querySelector('li.current');
  if (current) {
    const r = current.getBoundingClientRect();
    const box = inner.getBoundingClientRect();
    if (r.top < box.top || r.bottom > box.bottom) current.scrollIntoView({ block: 'center' });
  }
  addEventListener('pagehide', () => {
    try { sessionStorage.setItem(key, String(inner.scrollTop)); } catch (e) {}
  });
})();

// Navbar search: ⌘K / Ctrl+K / "/" opens a palette over search.json (loaded on first use).
(function () {
  const modal = document.getElementById('search-modal');
  if (!modal) return;
  const input = document.getElementById('site-search');
  const results = document.getElementById('search-results');
  const root = document.body.dataset.root || './';
  const MAX_RESULTS = 20;
  let index = null;
  let loading = null;
  let items = [];
  let active = 0;
  let lastFocus = null;

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.querySelectorAll('.st-kbd').forEach((k) => (k.textContent = isMac ? '⌘K' : 'Ctrl K'));

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function load() {
    loading ??= fetch(`${root}search.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        index = data.map((e) => ({
          ...e,
          _t: e.t.toLowerCase(),
          _s: (e.s || '').toLowerCase(),
          _g: `${e.g || ''} ${e.sec || ''}`.toLowerCase(),
          _tags: (e.tags || []).join(' ').toLowerCase(),
          _h: (e.h || []).map(([text, id]) => [text, id, text.toLowerCase()]),
          _x: (e.x || '').toLowerCase(),
        }));
      })
      .catch(() => {
        index = [];
        results.innerHTML = '<p class="sr-empty">Search is unavailable right now.</p>';
      });
    return loading;
  }

  // Wrap every occurrence of the terms in <mark>, escaping everything else.
  function highlight(text, terms) {
    const lower = text.toLowerCase();
    const ranges = [];
    for (const t of terms) {
      for (let i = lower.indexOf(t); i !== -1; i = lower.indexOf(t, i + t.length)) ranges.push([i, i + t.length]);
    }
    if (!ranges.length) return esc(text);
    ranges.sort((a, b) => a[0] - b[0]);
    let out = '';
    let pos = 0;
    for (const [a, b] of ranges) {
      if (b <= pos) continue;
      const start = Math.max(a, pos);
      out += esc(text.slice(pos, start)) + '<mark>' + esc(text.slice(start, b)) + '</mark>';
      pos = b;
    }
    return out + esc(text.slice(pos));
  }

  function snippet(e, terms) {
    const at = Math.min(...terms.map((t) => e._x.indexOf(t)).filter((i) => i >= 0));
    if (!isFinite(at)) return '';
    const start = Math.max(0, at - 50);
    const text = (start ? '…' : '') + e.x.slice(start, at + 110).trim() + (at + 110 < e.x.length ? '…' : '');
    return highlight(text, terms);
  }

  function search(q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = [];
    for (const e of index) {
      let score = 0;
      let heading = null;
      let inBody = false;
      let ok = true;
      for (const t of terms) {
        let s = 0;
        if (e._t.includes(t)) s += e._t.startsWith(t) || e._t.includes(` ${t}`) ? 14 : 10;
        const h = e._h.find((x) => x[2].includes(t));
        if (h) { s += 6; heading ??= h; }
        if (e._tags.includes(t)) s += 5;
        if (e._g.includes(t)) s += 4;
        if (e._s.includes(t)) s += 3;
        if (e._x.includes(t)) { s += 1; inBody = true; }
        if (!s) { ok = false; break; }
        score += s;
      }
      if (!ok) continue;
      if (e.k === 'series') score += 2;
      out.push({ e, score, heading, inBody });
    }
    return out.sort((a, b) => b.score - a.score || (b.e.d || '').localeCompare(a.e.d || '')).slice(0, MAX_RESULTS);
  }

  const kindLabel = (e) =>
    e.k === 'series' ? `Series · ${e.n} ${e.n === 1 ? 'blog' : 'blogs'}`
    : e.g ? `${e.g} · Blog ${e.n}`
    : 'Blog';

  function row({ e, heading, inBody }, terms, i) {
    const href = root + e.u + (heading ? `#${heading[1]}` : '');
    const sub = heading
      ? `<span class="sr-heading">§ ${highlight(heading[0], terms)}</span>`
      : inBody && terms.length && !terms.every((t) => e._t.includes(t) || e._s.includes(t))
        ? snippet(e, terms)
        : highlight(e.s || '', terms);
    return `<a class="sr-item${i === active ? ' active' : ''}" role="option" id="sr-${i}" aria-selected="${i === active}" href="${esc(href)}" data-i="${i}">
      <span class="sr-icon sr-${e.k}" aria-hidden="true"></span>
      <span class="sr-main">
        <span class="sr-kind">${esc(kindLabel(e))}</span>
        <span class="sr-title">${highlight(e.t, terms)}</span>
        ${sub ? `<span class="sr-sub">${sub}</span>` : ''}
      </span>
      <span class="sr-enter" aria-hidden="true">↵</span>
    </a>`;
  }

  function render() {
    if (!index) return;
    const q = input.value.trim();
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    let html;
    if (!q) {
      // Suggestions: all series, then the newest blogs.
      const series = index.filter((e) => e.k === 'series').map((e) => ({ e }));
      const latest = index.filter((e) => e.k !== 'series').sort((a, b) => (b.d || '').localeCompare(a.d || '')).slice(0, 6).map((e) => ({ e }));
      items = [...series, ...latest];
      let i = 0;
      html =
        (series.length ? `<div class="sr-group">Series</div>${series.map((r) => row(r, [], i++)).join('')}` : '') +
        (latest.length ? `<div class="sr-group">Latest</div>${latest.map((r) => row(r, [], i++)).join('')}` : '');
    } else {
      items = search(q);
      html = items.length
        ? items.map((r, i) => row(r, terms, i)).join('')
        : `<p class="sr-empty">No results for “${esc(q)}”.</p>`;
    }
    results.innerHTML = html;
    input.setAttribute('aria-activedescendant', items.length ? `sr-${active}` : '');
  }

  function setActive(i) {
    if (!items.length) return;
    active = (i + items.length) % items.length;
    results.querySelectorAll('.sr-item').forEach((el) => {
      const on = Number(el.dataset.i) === active;
      el.classList.toggle('active', on);
      el.setAttribute('aria-selected', String(on));
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', `sr-${active}`);
  }

  function open() {
    if (!modal.hidden) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('search-open');
    input.focus();
    input.select();
    active = 0;
    if (index) render();
    else {
      results.innerHTML = '<p class="sr-empty">Loading…</p>';
      load().then(render);
    }
  }

  function close() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.documentElement.classList.remove('search-open');
    lastFocus?.focus?.();
  }

  document.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('click', open));
  modal.querySelectorAll('[data-search-close]').forEach((b) => b.addEventListener('click', close));
  input.addEventListener('input', () => {
    active = 0;
    render();
  });
  results.addEventListener('mousemove', (e) => {
    const el = e.target.closest('.sr-item');
    if (el && Number(el.dataset.i) !== active) setActive(Number(el.dataset.i));
  });
  results.addEventListener('click', (e) => e.target.closest('.sr-item') && close());

  document.addEventListener('keydown', (e) => {
    const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      modal.hidden ? open() : close();
      return;
    }
    if (e.key === '/' && !typing && modal.hidden) {
      e.preventDefault();
      open();
      return;
    }
    if (modal.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Enter' && document.activeElement === input) {
      const el = results.querySelector(`.sr-item[data-i="${active}"]`);
      if (el) {
        e.preventDefault();
        close();
        location.href = el.href;
      }
    } else if (e.key === 'Tab') {
      e.preventDefault(); // keep focus inside the dialog
      input.focus();
    }
  });

  // Warm the index when the user shows intent.
  document.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('pointerenter', load, { once: true }));

  // 404 page: shooting stars and asteroids on random paths, some crossing the screen
  // from any edge and some rushing toward the viewer "from the back".
  const fx = document.querySelector('.space-fx');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The lost astronaut roams between random points, never entering the text, the
  // 404 illustration, the header or the footer (plus a margin around each).
  const astro = fx && fx.querySelector('.astro');
  if (astro) {
    const rand = (a, b) => a + Math.random() * (b - a);
    const W = 94, H = 72, PAD = 48;
    const textRect = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
    const keepOut = () => {
      const nf = document.querySelector('.not-found');
      const rects = [document.querySelector('.site-header')?.getBoundingClientRect()];
      if (nf) {
        rects.push(nf.querySelector('.nf-art')?.getBoundingClientRect());
        nf.querySelectorAll('h1, p').forEach((el) => rects.push(textRect(el)));
        nf.querySelectorAll('.cta > *').forEach((el) => rects.push(el.getBoundingClientRect()));
      }
      const foot = document.querySelector('.site-footer');
      if (foot) rects.push(textRect(foot));
      return rects.filter((r) => r && r.width);
    };
    let blocked = keepOut();
    const clear = (x, y) =>
      x >= 8 && y >= 8 && x + W <= innerWidth - 8 && y + H <= innerHeight - 8 &&
      blocked.every((r) => x + W < r.left - PAD || x > r.right + PAD || y + H < r.top - PAD || y > r.bottom + PAD);
    const pathClear = (a, b) => {
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        if (!clear(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
      }
      return true;
    };
    const randomSpot = () => {
      for (let i = 0; i < 300; i++) {
        const p = [rand(0, innerWidth - W), rand(0, innerHeight - H)];
        if (clear(p[0], p[1])) return p;
      }
      return null;
    };
    const place = (p, angle) => (astro.style.transform = `translate(${p[0]}px, ${p[1]}px) rotate(${angle}deg)`);

    let pos = randomSpot(), angle = rand(-40, 40), anim, retry;
    const leg = () => {
      clearTimeout(retry);
      let next;
      for (let i = 0; i < 80 && !next; i++) {
        const p = randomSpot();
        if (p && Math.hypot(p[0] - pos[0], p[1] - pos[1]) > 120 && pathClear(pos, p)) next = p;
      }
      if (!next) { retry = setTimeout(leg, 1500); return; }
      const turn = angle + rand(-140, 140);
      const ms = (Math.hypot(next[0] - pos[0], next[1] - pos[1]) / rand(22, 42)) * 1000;
      anim = astro.animate(
        [{ transform: `translate(${pos[0]}px, ${pos[1]}px) rotate(${angle}deg)` }, { transform: `translate(${next[0]}px, ${next[1]}px) rotate(${turn}deg)` }],
        { duration: ms, easing: 'ease-in-out', fill: 'forwards' },
      );
      // The finished promise still settles in background tabs, where finish events are held back.
      // It rejects when a resize cancels the leg; the resize handler starts a new one.
      anim.finished.then(() => { pos = next; angle = turn; place(pos, angle); anim.cancel(); leg(); }, () => {});
    };

    if (pos) {
      place(pos, angle);
      astro.style.opacity = 1;
      if (!reduceMotion) leg();
    }

    addEventListener('scroll', () => (blocked = keepOut()), { passive: true });
    let resizeTimer;
    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        blocked = keepOut();
        if (anim) { const r = astro.getBoundingClientRect(); pos = [r.left + r.width / 2 - W / 2, r.top + r.height / 2 - H / 2]; anim.cancel(); }
        if (!pos || !clear(pos[0], pos[1])) pos = randomSpot();
        if (!pos) { astro.style.opacity = 0; return; }
        astro.style.opacity = 1;
        place(pos, angle);
        if (!reduceMotion) leg();
      }, 200);
    });
  }

  // Shooting stars and asteroids, simulated on a canvas. Everything stays out of the
  // centre block (illustration, heading, message, buttons): asteroids are pushed away
  // from it and bounce off its edge, and shooting stars only take paths that miss it.
  // Every so often two asteroids are sent on a collision course and blow up.
  const canvas = fx && fx.querySelector('.space-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const rand = (a, b) => a + Math.random() * (b - a);
    const TAU = Math.PI * 2;
    let W = 0, H = 0, zone;

    const measure = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const nf = document.querySelector('.not-found');
      const parts = [nf.querySelector('.nf-art'), ...nf.querySelectorAll('h1, p'), ...nf.querySelectorAll('.cta > *')]
        .filter(Boolean)
        .map((el) => {
          if (el.matches('h1, p')) { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); }
          return el.getBoundingClientRect();
        });
      zone = {
        l: Math.min(...parts.map((r) => r.left)) - 24, t: Math.min(...parts.map((r) => r.top)) - 24,
        r: Math.max(...parts.map((r) => r.right)) + 24, b: Math.max(...parts.map((r) => r.bottom)) + 24,
      };
    };

    // Distance from a point to the zone, and the outward direction at the nearest edge.
    const fromZone = (x, y) => {
      const cx = Math.max(zone.l, Math.min(x, zone.r)), cy = Math.max(zone.t, Math.min(y, zone.b));
      let dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      if (d === 0) { dx = x - (zone.l + zone.r) / 2; dy = y - (zone.t + zone.b) / 2; d = -1; }
      const n = Math.hypot(dx, dy) || 1;
      return { d, nx: dx / n, ny: dy / n };
    };
    const segmentClear = (x1, y1, x2, y2, pad) => {
      for (let i = 0; i <= 48; i++) {
        const t = i / 48;
        if (fromZone(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t).d < pad) return false;
      }
      return true;
    };
    const clearSpot = (pad, margin = 0) => {
      for (let i = 0; i < 200; i++) {
        const x = rand(margin, W - margin), y = rand(margin + 60, H - margin);
        if (fromZone(x, y).d > pad) return [x, y];
      }
      return null;
    };

    // ---- Asteroids
    const rocks = [];
    const makeRock = (x, y, vx, vy, r, opts = {}) => {
      const n = Math.round(rand(7, 11));
      const verts = Array.from({ length: n }, (_, i) => [(i / n) * TAU, rand(0.72, 1.05)]);
      const craters = Array.from({ length: r > 12 ? Math.round(rand(2, 4)) : 1 }, () => [rand(0, TAU), rand(0, 0.55), rand(0.12, 0.24)]);
      const rock = { x, y, vx, vy, r, a: rand(0, TAU), va: rand(-1, 1) * rand(0.2, 1.2), verts, craters, z: 1, alpha: 1, fade: 0, age: 0, ...opts };
      rocks.push(rock);
      return rock;
    };
    const edgeRock = () => {
      const r = rand(9, 28);
      const edge = Math.floor(rand(0, 4));
      const m = r + 20;
      const [x, y] = [[rand(0, W), -m], [W + m, rand(0, H)], [rand(0, W), H + m], [-m, rand(0, H)]][edge];
      const target = clearSpot(80, 40) || [W / 2, H / 2];
      const sp = rand(14, 40), ang = Math.atan2(target[1] - y, target[0] - x) + rand(-0.35, 0.35);
      makeRock(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, r);
    };
    const deepRock = () => {
      const spot = clearSpot(90, 60);
      if (!spot) return;
      const ang = rand(0, TAU), sp = rand(8, 26);
      makeRock(spot[0], spot[1], Math.cos(ang) * sp, Math.sin(ang) * sp, rand(10, 26), { z: 0.04 });
    };
    // Two asteroids aimed at the same clear point, arriving together.
    const collisionCourse = () => {
      for (let tries = 0; tries < 60; tries++) {
        const meet = clearSpot(140, 90);
        if (!meet) return;
        const t = rand(4.5, 7.5), ang = rand(0, TAU), spread = Math.PI + rand(-0.7, 0.7);
        const legs = [ang, ang + spread].map((a) => {
          const dist = rand(220, 380);
          return [meet[0] + Math.cos(a) * dist, meet[1] + Math.sin(a) * dist, dist];
        });
        if (!legs.every(([x, y]) => segmentClear(x, y, meet[0], meet[1], 60))) continue;
        legs.forEach(([x, y, dist]) => {
          const sp = dist / t;
          makeRock(x, y, ((meet[0] - x) / dist) * sp, ((meet[1] - y) / dist) * sp, rand(16, 26), { fade: 1, alpha: 0, course: true });
        });
        return;
      }
    };

    // ---- Explosions
    const sparks = [], blasts = [];
    const explode = (a, b) => {
      const x = (a.x * b.r + b.x * a.r) / (a.r + b.r), y = (a.y * b.r + b.y * a.r) / (a.r + b.r);
      const vx = (a.vx * a.r ** 2 + b.vx * b.r ** 2) / (a.r ** 2 + b.r ** 2), vy = (a.vy * a.r ** 2 + b.vy * b.r ** 2) / (a.r ** 2 + b.r ** 2);
      blasts.push({ x, y, age: 0, size: (a.r + b.r) * 2.2 });
      const colors = ['#fff7e6', '#ffd27a', '#ff9f43', '#ff6b3d', '#ffe9b3'];
      for (let i = 0; i < 70; i++) {
        const ang = rand(0, TAU), sp = rand(40, 280);
        sparks.push({ x, y, vx: vx + Math.cos(ang) * sp, vy: vy + Math.sin(ang) * sp, life: rand(0.5, 1.4), age: 0, c: colors[i % colors.length], s: rand(1, 2.6) });
      }
      const pieces = Math.round(rand(4, 7));
      for (let i = 0; i < pieces; i++) {
        const ang = (i / pieces) * TAU + rand(-0.4, 0.4), sp = rand(25, 85);
        const off = rand(2, 10);
        makeRock(x + Math.cos(ang) * off, y + Math.sin(ang) * off, vx + Math.cos(ang) * sp, vy + Math.sin(ang) * sp, rand(4, 10), { frag: true, va: rand(-1, 1) * rand(1.5, 4) });
      }
    };

    // ---- Shooting stars
    const stars = [];
    const shootingStar = () => {
      for (let tries = 0; tries < 40; tries++) {
        if (Math.random() < 0.3) {
          // From the back: starts as a speck and grows as it streaks outward.
          const spot = clearSpot(60, 40);
          if (!spot) return;
          const ang = rand(0, TAU), len = rand(220, 420);
          const ex = spot[0] + Math.cos(ang) * len, ey = spot[1] + Math.sin(ang) * len;
          if (!segmentClear(spot[0], spot[1], ex, ey, 30)) continue;
          stars.push({ x1: spot[0], y1: spot[1], x2: ex, y2: ey, age: 0, life: rand(0.7, 1.2), trail: 170, deep: true });
        } else {
          const x = rand(-100, W + 100), y = rand(-60, H + 60), ang = rand(0, TAU), len = rand(420, 950);
          const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
          if (!segmentClear(x, y, ex, ey, 30)) continue;
          stars.push({ x1: x, y1: y, x2: ex, y2: ey, age: 0, life: rand(0.8, 1.6), trail: rand(110, 190) });
        }
        return;
      }
    };

    // ---- Simulation step
    const step = (dt) => {
      for (const k of rocks) {
        k.age += dt;
        if (k.z < 1) k.z = Math.min(1, k.z + dt * 0.35);
        if (k.fade) k.alpha = Math.min(1, k.alpha + dt * 1.6);
        if (k.frag && k.age > 14) k.alpha -= dt * 0.5;
        // Soft push away from the centre block, then a hard bounce at its edge.
        const { d, nx, ny } = fromZone(k.x, k.y);
        const reach = k.r * k.z + 36;
        if (d < reach + 70 && !k.course) {
          const push = (1 - Math.max(0, d - reach) / 70) * 60;
          k.vx += nx * push * dt; k.vy += ny * push * dt;
        }
        if (d < reach) {
          const vn = k.vx * nx + k.vy * ny;
          if (vn < 0) { k.vx -= 2 * vn * nx; k.vy -= 2 * vn * ny; }
          k.x += nx * (reach - Math.max(d, 0)) * 0.5; k.y += ny * (reach - Math.max(d, 0)) * 0.5;
        }
        k.x += k.vx * dt; k.y += k.vy * dt; k.a += k.va * dt;
      }
      // Asteroid against asteroid.
      for (let i = 0; i < rocks.length; i++) {
        const a = rocks[i];
        if (a.dead || a.z < 1) continue;
        for (let j = i + 1; j < rocks.length; j++) {
          const b = rocks[j];
          if (b.dead || b.z < 1) continue;
          const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), min = (a.r + b.r) * 0.9;
          if (dist >= min || dist === 0) continue;
          const rel = Math.hypot(b.vx - a.vx, b.vy - a.vy);
          if (!a.frag && !b.frag && a.r + b.r > 22 && rel > 18) { a.dead = b.dead = true; explode(a, b); break; }
          // Elastic bounce, mass by area.
          const nx = dx / dist, ny = dy / dist, ma = a.r ** 2, mb = b.r ** 2;
          const p = (2 * ((a.vx - b.vx) * nx + (a.vy - b.vy) * ny)) / (ma + mb);
          if (p > 0) { a.vx -= p * mb * nx; a.vy -= p * mb * ny; b.vx += p * ma * nx; b.vy += p * ma * ny; }
          const overlap = (min - dist) / 2;
          a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
        }
      }
      for (let i = rocks.length - 1; i >= 0; i--) {
        const k = rocks[i], m = k.r + 160;
        const gone = k.x < -m || k.x > W + m || k.y < -m || k.y > H + m;
        if (k.dead || k.alpha <= 0 || (gone && k.age > 3)) rocks.splice(i, 1);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.age += dt; s.vx *= 1 - 1.6 * dt; s.vy *= 1 - 1.6 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.age > s.life) sparks.splice(i, 1);
      }
      for (let i = blasts.length - 1; i >= 0; i--) if ((blasts[i].age += dt) > 0.9) blasts.splice(i, 1);
      for (let i = stars.length - 1; i >= 0; i--) if ((stars[i].age += dt) > stars[i].life) stars.splice(i, 1);
    };

    // ---- Drawing
    const drawRock = (k) => {
      const s = k.r * k.z;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, k.alpha * (0.35 + 0.65 * k.z)));
      ctx.translate(k.x, k.y); ctx.rotate(k.a);
      ctx.beginPath();
      k.verts.forEach(([ang, f], i) => ctx[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * s * f, Math.sin(ang) * s * f));
      ctx.closePath();
      ctx.fillStyle = '#3b3b45'; ctx.fill();
      ctx.lineWidth = Math.max(1, s / 14); ctx.strokeStyle = '#5c5c69'; ctx.stroke();
      ctx.fillStyle = '#2a2a32';
      for (const [ang, dist, cr] of k.craters) {
        ctx.beginPath(); ctx.arc(Math.cos(ang) * dist * s, Math.sin(ang) * dist * s, cr * s, 0, TAU); ctx.fill();
      }
      ctx.restore();
    };
    const drawStar = (st) => {
      const t = st.age / st.life, e = t * t * (3 - 2 * t);
      const hx = st.x1 + (st.x2 - st.x1) * e, hy = st.y1 + (st.y2 - st.y1) * e;
      const len = Math.hypot(st.x2 - st.x1, st.y2 - st.y1), ux = (st.x2 - st.x1) / len, uy = (st.y2 - st.y1) / len;
      const grow = st.deep ? 0.1 + 0.9 * e : 1;
      const trail = Math.min(st.trail * grow, Math.hypot(hx - st.x1, hy - st.y1));
      const tx = hx - ux * trail, ty = hy - uy * trail;
      const alpha = Math.min(1, t / 0.15) * Math.min(1, (1 - t) / 0.35);
      const g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,255,255,${0.9 * alpha})`);
      ctx.strokeStyle = g; ctx.lineWidth = 2 * grow; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.shadowColor = 'rgba(190,210,255,.9)'; ctx.shadowBlur = 12 * grow;
      ctx.beginPath(); ctx.arc(hx, hy, 2.6 * grow, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // Hard guarantee on top of the physics: nothing is ever painted inside the centre block.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(zone.l, zone.t, zone.r - zone.l, zone.b - zone.t);
      ctx.clip('evenodd');
      rocks.filter((k) => k.z < 1).forEach(drawRock);
      stars.forEach(drawStar);
      rocks.filter((k) => k.z >= 1).forEach(drawRock);
      for (const b of blasts) {
        const t = b.age / 0.9;
        const flash = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * (0.4 + t));
        flash.addColorStop(0, `rgba(255,240,210,${0.9 * (1 - t) ** 2})`);
        flash.addColorStop(0.4, `rgba(255,150,60,${0.5 * (1 - t) ** 2})`);
        flash.addColorStop(1, 'rgba(255,100,40,0)');
        ctx.fillStyle = flash; ctx.beginPath(); ctx.arc(b.x, b.y, b.size * (0.4 + t), 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(255,220,180,${0.6 * (1 - t)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.size * 1.6 * t, 0, TAU); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const s of sparks) {
        ctx.globalAlpha = Math.max(0, 1 - s.age / s.life);
        ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    };

    measure();
    addEventListener('resize', measure);
    addEventListener('scroll', measure, { passive: true });

    if (reduceMotion) {
      // A still scene: a few asteroids in open space, nothing moving.
      for (let i = 0; i < 4; i++) { const p = clearSpot(80, 40); if (p) makeRock(p[0], p[1], 0, 0, rand(10, 26)); }
      draw();
    } else {
      for (let i = 0; i < 4; i++) {
        const p = clearSpot(80, 40);
        if (p) { const ang = rand(0, TAU), sp = rand(10, 30); makeRock(p[0], p[1], Math.cos(ang) * sp, Math.sin(ang) * sp, rand(9, 26)); }
      }
      let nextStar = rand(0.4, 1.5), nextRock = rand(2, 5), nextCrash = rand(2.5, 5), last = performance.now();
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if ((nextStar -= dt) <= 0) { shootingStar(); nextStar = rand(0.9, 4.2); }
        if ((nextRock -= dt) <= 0) {
          if (rocks.filter((k) => !k.frag).length < 7) (Math.random() < 0.3 ? deepRock : edgeRock)();
          nextRock = rand(2.5, 7);
        }
        if ((nextCrash -= dt) <= 0) { collisionCourse(); nextCrash = rand(9, 16); }
        step(dt);
        draw();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }
  }
})();
