// Content editor (dev only). Talks to scripts/admin/server.mjs; every save writes content/ directly.
// Routes: #/  ·  #/blog/<series|blogs>/<folder>  ·  #/series/<slug>
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s = '') =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const enc = encodeURIComponent;
  const slugify = (s) =>
    String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const draftBadge = (x) => (x.draft ? ' <span class="badge draft">draft</span>' : '');
  const store = {
    get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };

  const main = $('#main');
  const treeEl = $('#tree');
  const dialog = $('#modal');
  const form = $('#modal-form');

  let tree = { series: [], blogs: [] };
  let view = null; // { dirty, save(), destroy() }
  let currentHash = location.hash || '#/';

  // ---------------------------------------------------------------------------
  // Plumbing

  async function api(method, route, body, raw = false) {
    const headers = method === 'GET' ? {} : { 'X-Admin': '1', ...(raw ? {} : { 'Content-Type': 'application/json' }) };
    let res;
    try {
      res = await fetch(`api/${route}`, { method, headers, body: raw ? body : body && JSON.stringify(body) });
    } catch {
      throw new Error("Can't reach the dev server — is npm run dev still running?");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
    return data;
  }

  let toastTimer;
  function toast(msg, error = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast show${error ? ' err' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = 'toast'), error ? 4000 : 1800);
  }

  // Resolves true when onSubmit succeeded, false when cancelled.
  function openModal(html, { onSubmit = () => {}, onInput } = {}) {
    return new Promise((resolve) => {
      let ok = false;
      form.innerHTML = html;
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (e.submitter?.value === 'cancel') return dialog.close();
        const btn = e.submitter;
        if (btn) btn.disabled = true;
        try {
          await onSubmit(form);
          ok = true;
          dialog.close();
        } catch (err) {
          const el = $('.error', form);
          if (el) el.textContent = err.message;
          else toast(err.message, true);
        } finally {
          if (btn) btn.disabled = false;
        }
      };
      form.oninput = onInput ? (e) => onInput(e, form) : null;
      form.onchange = form.oninput;
      dialog.addEventListener('close', () => resolve(ok), { once: true });
      dialog.showModal();
      $('[autofocus]', form)?.focus();
    });
  }

  const confirmDiscard = () =>
    openModal(`
      <h2>Discard unsaved changes?</h2>
      <p class="muted" style="margin:0">Your edits to this page haven't been saved.</p>
      <div class="modal-actions">
        <button class="btn primary" value="ok" autofocus>Discard changes</button>
        <button class="btn" value="cancel" formnovalidate>Keep editing</button>
      </div>`);

  async function refreshTree() {
    tree = await api('GET', 'tree');
    renderTree();
  }

  // ---------------------------------------------------------------------------
  // Sidebar

  // The sidebar lists only what's being edited (its series, or the standalone blog). Everything else is
  // in the overview or the ⌘P switcher, so it stays usable however many blogs there are.
  function renderTree() {
    treeEl.innerHTML = currentContext();
  }

  // Every series and blog, in tree order, with the text a search matches against.
  function entries() {
    const list = [];
    for (const s of tree.series) {
      list.push({ href: `#/series/${s.slug}`, title: s.title, ctx: 'Series', draft: s.draft, text: [s.title, s.slug, 'series'] });
      for (const g of s.groups) {
        for (const b of g.blogs) {
          list.push({ href: `#/blog/${s.slug}/${b.folder}`, title: b.title, ctx: [s.title, g.title].filter(Boolean).join(' · '), draft: b.draft, text: [b.title, b.folder, s.title, g.title ?? ''] });
        }
      }
      for (const b of s.unlisted) {
        list.push({ href: `#/blog/${s.slug}/${b.folder}`, title: b.title, ctx: `${s.title} · not listed`, draft: b.draft, text: [b.title, b.folder, s.title] });
      }
    }
    for (const b of tree.blogs) {
      list.push({ href: `#/blog/blogs/${b.folder}`, title: b.title, ctx: 'Standalone blog', draft: b.draft, text: [b.title, b.folder, 'standalone'] });
    }
    return list;
  }

  function search(q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = entries().filter((e) => {
      const text = [...e.text, e.draft ? 'draft' : ''].join(' ').toLowerCase();
      return words.every((w) => text.includes(w));
    });
    // Titles that contain every word come first (stable, so tree order is kept within each group).
    const inTitle = (e) => words.every((w) => e.title.toLowerCase().includes(w));
    return [...matches.filter(inTitle), ...matches.filter((e) => !inTitle(e))];
  }

  // Recently opened series and blogs (titles come from the tree, so renames show up).
  const recentHrefs = () => { try { return JSON.parse(store.get('admin-recent', '[]')); } catch { return []; } };
  function rememberRecent(hash) {
    if (!/^#\/(blog|series)\//.test(hash)) return;
    store.set('admin-recent', JSON.stringify([hash, ...recentHrefs().filter((h) => h !== hash)].slice(0, 20)));
  }
  function recent(exclude = []) {
    const byHref = new Map(entries().map((e) => [e.href, e]));
    return recentHrefs().filter((h) => !exclude.includes(h)).map((h) => byHref.get(h)).filter(Boolean);
  }
  function currentContext() {
    const hash = location.hash;
    const [, kind, a, b] = hash.slice(1).split('/').map(decodeURIComponent);
    const back = '<a class="item flat back" href="#/">← All content</a>';
    const link = (rel, blog, n) =>
      `<a class="item${hash === `#/blog/${rel}` ? ' active' : ''}" href="#/blog/${esc(rel)}">` +
      `<span class="n">${n}</span><span class="t">${esc(blog.title)}</span>${draftBadge(blog)}</a>`;

    if (kind === 'blog' && a === 'blogs') {
      const blog = tree.blogs.find((x) => x.folder === b);
      return `${back}<h4>Standalone blog</h4>${blog ? `<a class="item flat active" href="${esc(hash)}"><span class="t">${esc(blog.title)}</span>${draftBadge(blog)}</a>` : ''}`;
    }

    const series = (kind === 'blog' || kind === 'series') && tree.series.find((x) => x.slug === a);
    if (!series) {
      return `${back}<p class="side-hint">Pick a series or blog from All content, or press <kbd>⌘P</kbd> to jump to one.</p>`;
    }

    let n = 0;
    const items = [];
    for (const g of series.groups) {
      if (g.title) items.push(`<div class="sec">${esc(g.title)}</div>`);
      items.push(...g.blogs.map((x) => link(`${series.slug}/${x.folder}`, x, ++n)));
    }
    if (series.unlisted.length) {
      items.push('<div class="sec">Not listed (unpublished)</div>');
      items.push(...series.unlisted.map((x) => link(`${series.slug}/${x.folder}`, x, '–')));
    }
    return `${back}
      <h4>Series</h4>
      <a class="item flat series-head${hash === `#/series/${series.slug}` ? ' active' : ''}" href="#/series/${esc(series.slug)}" title="Series settings, sections and order">
        <span class="t">${esc(series.title)}</span>${draftBadge(series)}</a>
      ${items.join('') || '<div class="empty">No blogs yet</div>'}`;
  }

  // Up/down arrows move through the sidebar's links.
  treeEl.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = $$('a', treeEl);
    const i = links.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    links[Math.max(0, Math.min(links.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
  });
  // "/" jumps to search, unless you're typing somewhere.
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
    const t = e.target;
    if (t.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    openSwitcher();
  });

  // ⌘P / Ctrl P: jump to any series or blog from anywhere, even while writing.
  const switcher = $('#switcher');
  const switcherInput = $('#switcher-input');
  const switcherList = $('#switcher-list');
  let switcherItems = [];
  let switcherIndex = 0;

  function renderSwitcher() {
    const q = switcherInput.value.trim();
    switcherItems = (q ? search(q) : [...recent([location.hash]), ...entries()].filter((e, i, all) => all.findIndex((x) => x.href === e.href) === i)).slice(0, 50);
    switcherIndex = Math.min(switcherIndex, Math.max(0, switcherItems.length - 1));
    switcherList.innerHTML = switcherItems.length
      ? (q ? '' : '<li class="switcher-head">Recent and all content</li>') +
        switcherItems.map((r, i) => `
          <li><a href="${esc(r.href)}" class="${i === switcherIndex ? 'is-active' : ''}${r.href === location.hash ? ' is-current' : ''}" data-i="${i}">
            <span class="t">${esc(r.title)}${draftBadge(r)}</span><span class="ctx">${esc(r.ctx)}</span></a></li>`).join('')
      : '<li class="switcher-empty">Nothing matches.</li>';
    $('.is-active', switcherList)?.scrollIntoView({ block: 'nearest' });
  }
  function openSwitcher(query = '') {
    if (dialog.open) return;
    switcherInput.value = typeof query === 'string' ? query : '';
    switcherIndex = 0;
    renderSwitcher();
    switcher.showModal();
    switcherInput.focus();
  }
  function goSwitcher(i) {
    const item = switcherItems[i];
    switcher.close();
    if (item) location.hash = item.href;
  }
  switcherInput.addEventListener('input', () => { switcherIndex = 0; renderSwitcher(); });
  switcherInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      switcherIndex = (switcherIndex + (e.key === 'ArrowDown' ? 1 : -1) + switcherItems.length) % Math.max(1, switcherItems.length);
      renderSwitcher();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      goSwitcher(switcherIndex);
    }
  });
  switcherList.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-i]');
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    goSwitcher(Number(a.dataset.i));
  });
  switcherList.addEventListener('mousemove', (e) => {
    const a = e.target.closest('a[data-i]');
    if (a && Number(a.dataset.i) !== switcherIndex) { switcherIndex = Number(a.dataset.i); $$('a', switcherList).forEach((x) => x.classList.toggle('is-active', x === a)); }
  });
  switcher.addEventListener('click', (e) => { if (e.target === switcher) switcher.close(); }); // backdrop
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      switcher.open ? switcher.close() : openSwitcher();
    }
  }, true);
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('[data-switcher]')) openSwitcher();
  });

  // ---------------------------------------------------------------------------
  // Routing

  addEventListener('hashchange', async () => {
    if (location.hash === currentHash) return;
    if (view?.dirty) await view.save?.(true);
    if (view?.dirty && !(await confirmDiscard())) {
      history.replaceState(null, '', currentHash);
      return;
    }
    route();
  });

  // Coming back to the tab (or the network) retries a failed save straight away.
  const retryNow = () => view?.dirty && view.save?.(true);
  addEventListener('focus', retryNow);
  addEventListener('online', retryNow);

  addEventListener('beforeunload', (e) => {
    if (view?.dirty && !leaving) e.preventDefault();
  });

  // Exit: back to the page being edited on the dev site, in this tab (saving first).
  let leaving = false;
  function siteUrlFor(hash) {
    const [, kind, a, b] = hash.slice(1).split('/').map(decodeURIComponent);
    if (kind === 'series' && a) return `/${encodeURIComponent(a)}/`;
    if (kind !== 'blog' || !b) return '/';
    if (a === 'blogs') return `/blogs/${encodeURIComponent(b)}/`;
    // A folder that isn't listed in its series isn't built, so go to the series instead.
    const unlisted = tree.series.find((s) => s.slug === a)?.unlisted.some((x) => x.folder === b);
    return unlisted ? `/${encodeURIComponent(a)}/` : `/${encodeURIComponent(a)}/${encodeURIComponent(b)}/`;
  }
  async function exitEditor() {
    if (view?.dirty) await view.save?.(true);
    if (view?.dirty && !(await confirmDiscard())) return;
    leaving = true;
    location.href = siteUrlFor(currentHash);
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-exit]')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let "open in new tab" work
    e.preventDefault();
    exitEditor();
  });
  // Esc exits too, unless it's closing something or you're typing.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || dialog.open || switcher.open) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"], [data-drawer]')) return;
    if ($('[data-drawer]:not([hidden])')) return;
    exitEditor();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      view?.save?.();
    }
  });

  async function route() {
    currentHash = location.hash || '#/';
    rememberRecent(currentHash);
    $('#exit').href = siteUrlFor(currentHash);
    // The overview lists everything itself, so it gets the full width.
    $('.app').classList.toggle('is-home', !/^#\/(blog|series)\//.test(currentHash));
    view?.destroy?.();
    view = null;
    renderTree();
    const [, kind, ...rest] = currentHash.slice(1).split('/');
    try {
      if (kind === 'blog' && rest.length === 2) await blogView(rest.map(decodeURIComponent).join('/'));
      else if (kind === 'series' && rest[0]) await seriesView(decodeURIComponent(rest[0]));
      else homeView();
    } catch (err) {
      main.innerHTML = `<div class="page"><div class="page-inner"><h1>Can't open this</h1><p class="notice">${esc(err.message)}</p><p><a href="#/">← Back to the overview</a></p></div></div>`;
    }
  }

  // ---------------------------------------------------------------------------
  // Overview

  function homeView() {
    document.title = 'Content Editor · dev';
    const seriesBlogs = tree.series.flatMap((s) => s.groups.flatMap((g) => g.blogs.map((b) => ({ ...b, rel: `${s.slug}/${b.folder}`, where: s.title }))));
    const all = [...seriesBlogs, ...tree.blogs.map((b) => ({ ...b, rel: `blogs/${b.folder}`, where: 'Standalone' }))];
    const drafts = [...all.filter((b) => b.draft), ...tree.series.filter((s) => s.draft).map((s) => ({ title: s.title, series: s.slug, where: 'Series', draft: true }))];
    const recentItems = recent().slice(0, 3);
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    // A row card: the whole card opens the item; buttons on the right still work on their own.
    const rowCard = ({ href, title, draft, meta, actions = '' }) => `
      <div class="card row-card">
        <a class="t" href="${esc(href)}">${esc(title)}</a>${draftBadge({ draft })}
        <span class="info">${esc(meta)}</span>${actions}
      </div>`;
    const seriesCard = (s) => {
      const count = s.groups.reduce((n, g) => n + g.blogs.length, 0);
      return rowCard({
        href: `#/series/${s.slug}`,
        title: s.title,
        draft: s.draft,
        meta: [plural(count, 'blog'), s.groups.some((g) => g.title) && plural(s.groups.filter((g) => g.title).length, 'section'), s.unlisted.length && `${s.unlisted.length} unlisted`].filter(Boolean).join(' · '),
        actions: `<button type="button" class="btn sm" data-new-in="${esc(s.slug)}" title="New blog in this series">＋ Blog</button>`,
      });
    };
    const blogCard = (b) => rowCard({ href: `#/blog/blogs/${b.folder}`, title: b.title, draft: b.draft, meta: b.date || '' });

    main.innerHTML = `
      <div class="topbar home-bar">
        <div class="crumbs"><span class="brand"><span class="dot"></span>Content editor <span class="pill">dev</span></span></div>
        <button type="button" class="go-switch" data-switcher title="Jump to any series or blog"><span>Go to blog or series…</span><kbd>⌘P</kbd></button>
        <a class="btn" href="/" data-exit title="Back to the site (Esc)">Exit editor</a>
      </div>
      <div class="page"><div class="page-inner home">
        <section class="home-main">
          <div class="home-head"><h2>Recently opened</h2></div>
          ${recentItems.length
            ? `<div class="recent-cards">${recentItems.map((r) => `
                <a class="card recent-card" href="${esc(r.href)}">
                  <span class="kind">${r.href.startsWith('#/series/') ? 'Series' : 'Blog'}${draftBadge(r)}</span>
                  <span class="t">${esc(r.title)}</span>
                  <span class="ctx">${esc(r.ctx === 'Series' ? '' : r.ctx)}</span>
                </a>`).join('')}</div>`
            : '<p class="card muted home-empty">Blogs and series you open show up here. Press <kbd>⌘P</kbd> to jump to any of them.</p>'}
          <div class="home-head" id="home-series">
            <h2>Series <span class="count">${tree.series.length}</span></h2>
            <button class="btn primary" data-q="series">＋ New series</button>
          </div>
          ${tree.series.length ? tree.series.map(seriesCard).join('') : '<p class="card muted home-empty">No series yet.</p>'}
          <div class="home-head" id="home-blogs">
            <h2>Blogs <span class="count">${tree.blogs.length}</span></h2>
            <button class="btn primary" data-q="blog">＋ New blog</button>
          </div>
          ${tree.blogs.length ? tree.blogs.map(blogCard).join('') : '<p class="card muted home-empty">No standalone blogs yet.</p>'}
        </section>
        <aside class="home-side card" aria-label="Stats">
          <h2>Stats</h2>
          <button type="button" class="stat" data-drafts title="Show all drafts"><strong>${drafts.length}</strong><span>Drafts</span></button>
          <a class="stat" href="#/" data-scroll="home-series"><strong>${tree.series.length}</strong><span>Series</span></a>
          <a class="stat" href="#/" data-scroll="home-series"><strong>${seriesBlogs.length}</strong><span>Blogs in series</span></a>
          <a class="stat" href="#/" data-scroll="home-blogs"><strong>${tree.blogs.length}</strong><span>Standalone blogs</span></a>
        </aside>
      </div></div>`;
    $('[data-drafts]', main).addEventListener('click', () => openSwitcher('draft'));
    $$('[data-scroll]', main).forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(a.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    $$('[data-new-in]', main).forEach((b) => b.addEventListener('click', () => newBlog({ series: b.dataset.newIn })));
    $$('[data-q]', main).forEach((b) => b.addEventListener('click', () => (b.dataset.q === 'blog' ? newBlog() : newSeries())));
  }

  // ---------------------------------------------------------------------------
  // Creating

  function nextFolderPrefix(series) {
    const folders = [...series.groups.flatMap((g) => g.blogs), ...series.unlisted].map((b) => b.folder);
    const nums = folders.map((f) => f.match(/^(\d+)[-_]/)?.[1]).filter(Boolean).map(Number);
    if (folders.length && !nums.length) return '';
    return `${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, '0')}-`;
  }

  async function newBlog(preset = {}) {
    const opts = tree.series.map((s) => `<option value="${esc(s.slug)}"${preset.series === s.slug ? ' selected' : ''}>${esc(s.title)}</option>`).join('');
    let folderTouched = false;
    let created;

    const sync = (form) => {
      const f = (n) => form.elements.namedItem(n);
      const s = tree.series.find((x) => x.slug === f('series').value);
      const secSel = f('section');
      const titles = s ? s.groups.map((g) => g.title).filter(Boolean) : [];
      $('[data-sec]', form).hidden = !s;
      const prev = secSel.value;
      secSel.innerHTML = `<option value="">No section${titles.length ? ' (top of the series)' : ''}</option>` +
        titles.map((t) => `<option${t === prev || t === preset.section ? ' selected' : ''}>${esc(t)}</option>`).join('') +
        '<option value="__new">＋ New section…</option>';
      if (prev === '__new') secSel.value = '__new';
      $('[data-newsec]', form).hidden = !s || secSel.value !== '__new';
      if (!folderTouched) f('folder').value = (s ? nextFolderPrefix(s) : '') + slugify(f('title').value);
      $('[data-url]', form).textContent = `/${s ? s.slug : 'blogs'}/${f('folder').value || '…'}/`;
    };

    const html = `
      <h2>New blog</h2>
      <label class="field">Title <input name="title" required autofocus placeholder="e.g. Load balancers explained"></label>
      <label class="field">Where
        <select name="series"><option value="">Standalone blog</option>${opts}</select>
      </label>
      <label class="field" data-sec>Section <select name="section"></select></label>
      <label class="field" data-newsec hidden>New section title <input name="newSection" placeholder="e.g. Networking"></label>
      <label class="field">Folder <input name="folder" required pattern="[A-Za-z0-9][A-Za-z0-9._\\-]*">
        <span class="hint">Becomes the URL: <code data-url></code></span></label>
      <p class="error"></p>
      <div class="modal-actions">
        <button class="btn primary" value="ok">Create blog</button>
        <button class="btn" value="cancel" formnovalidate>Cancel</button>
      </div>`;

    const p = openModal(html, {
      onInput: (e, form) => {
        if (e.target.name === 'folder') folderTouched = !!e.target.value;
        sync(form);
      },
      onSubmit: async (form) => {
        const f = (n) => form.elements.namedItem(n).value.trim();
        const series = f('series');
        const section = f('section') === '__new' ? f('newSection') : f('section');
        if (f('section') === '__new' && !section) throw new Error('Give the new section a title');
        if (series && view?.dirty && currentHash === `#/series/${series}`) await view.save(true);
        if (series && view?.dirty && currentHash === `#/series/${series}`) throw new Error('Save the series first — creating a blog updates its index.md');
        created = await api('POST', 'blog', { series, folder: f('folder'), title: f('title'), section });
      },
    });
    sync(form);
    if (!(await p)) return;
    toast('Blog created');
    await refreshTree();
    location.hash = `#/blog/${created.rel}`;
  }

  async function newSeries() {
    let folderTouched = false;
    let created;
    const ok = await openModal(`
      <h2>New series</h2>
      <label class="field">Title <input name="title" required autofocus placeholder="e.g. Kubernetes from Scratch"></label>
      <label class="field">Folder <input name="folder" required pattern="[A-Za-z0-9][A-Za-z0-9._\\-]*">
        <span class="hint">Becomes the URL: <code data-url>/…/</code> · <code>blogs</code> and <code>series</code> are reserved</span></label>
      <p class="muted" style="margin:0;font-size:13px">It starts as a draft. Add blogs and sections from the series page.</p>
      <p class="error"></p>
      <div class="modal-actions">
        <button class="btn primary" value="ok">Create series</button>
        <button class="btn" value="cancel" formnovalidate>Cancel</button>
      </div>`, {
      onInput: (e, form) => {
        const folder = form.elements.namedItem('folder');
        if (e.target.name === 'folder') folderTouched = !!folder.value;
        if (!folderTouched) folder.value = slugify(form.elements.namedItem('title').value);
        $('[data-url]', form).textContent = `/${folder.value || '…'}/`;
      },
      onSubmit: async (form) => {
        const f = (n) => form.elements.namedItem(n).value.trim();
        created = await api('POST', 'series', { folder: f('folder'), title: f('title') });
      },
    });
    if (!ok) return;
    toast('Series created');
    await refreshTree();
    location.hash = `#/series/${created.rel}`;
  }

  // ---------------------------------------------------------------------------
  // Shared editing bits

  // Uploads into the blog's assets/ (or the series folder) and returns the path to reference.
  async function uploadFile(rel, file) {
    let name = file.name || 'file';
    if (/^image\.\w+$/i.test(name)) name = `pasted-${Date.now()}${name.slice(5)}`;
    const { path } = await api('POST', `upload?path=${enc(rel)}&name=${enc(name)}`, file, true);
    return path;
  }

  function pickFiles({ accept = '', multiple = false } = {}) {
    return new Promise((resolve) => {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept, multiple });
      input.addEventListener('change', () => resolve([...input.files]));
      input.click();
    });
  }

  // Tracks unsaved changes, autosaves, and shows the state in the top bar's status pill:
  // Unsaved changes → Saving… → Saved, or Save failed (retried with backoff; click to retry now).
  // Autosave runs AUTOSAVE_IDLE after the last edit, and at least every AUTOSAVE_MAX while typing.
  const AUTOSAVE_IDLE = 3000;
  const AUTOSAVE_MAX = 30000;
  const RETRY_FIRST = 5000;
  const RETRY_MAX = 30000;
  const clock = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  function makeDirtyTracker(snapshot, statusEl, saveBtn) {
    let saved = snapshot();
    let savedAt = null;
    let timer = null;
    let pendingSince = 0;
    let retryDelay = 0;
    const t = {
      autosave: null,
      saving: false,
      error: null, // last save failure
      blocked: null, // { reason, snap }: can't save until the content changes (e.g. no title)
      get dirty() { return snapshot() !== saved; },
      // `snap` is the snapshot taken when the save was sent, so edits made meanwhile stay unsaved.
      markSaved(snap) {
        saved = snap;
        savedAt = new Date();
        pendingSince = 0;
        retryDelay = 0;
        t.error = null;
      },
      fail(message) {
        t.error = message;
        retryDelay = Math.min(RETRY_MAX, retryDelay ? retryDelay * 2 : RETRY_FIRST);
      },
      block(reason) {
        t.blocked = { reason, snap: snapshot() };
      },
      update() {
        const dirty = t.dirty;
        if (t.blocked && t.blocked.snap !== snapshot()) t.blocked = null;
        if (!dirty) t.blocked = null;

        const [state, text, tip] = t.saving ? ['saving', 'Saving…', 'Saving your changes']
          : dirty && t.error ? ['error', 'Save failed — retry', `${t.error}\nRetrying automatically. Click to retry now.`]
          : dirty && t.blocked ? ['blocked', `Not saved — ${t.blocked.reason}`, 'Fix this and it will save automatically']
          : dirty ? ['dirty', 'Unsaved changes', 'Saves automatically in a moment. Click to save now.']
          : ['saved', 'Saved', savedAt ? `Saved at ${clock(savedAt)}` : 'No unsaved changes'];
        statusEl.className = `status is-${state}`;
        statusEl.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(text)}`;
        statusEl.title = tip;
        if (saveBtn) {
          saveBtn.disabled = t.saving;
          saveBtn.textContent = t.saving ? 'Saving…' : 'Save';
        }

        clearTimeout(timer);
        if (!dirty || t.saving || t.blocked) return void (dirty || (pendingSince = 0));
        pendingSince ||= Date.now();
        const wait = t.error ? retryDelay : Math.max(0, Math.min(AUTOSAVE_IDLE, pendingSince + AUTOSAVE_MAX - Date.now()));
        timer = setTimeout(() => t.autosave?.(), wait);
      },
      stop() {
        clearTimeout(timer);
        t.autosave = null;
      },
    };
    return t;
  }

  // Runs a view's save. Autosaves are quiet; failures show in the status pill (and once as a toast).
  // Resolves true when everything is saved.
  async function runSave(tracker, { auto, validate, request }) {
    const problem = validate(auto);
    if (problem) {
      tracker.block(problem);
      tracker.update();
      if (!auto) toast(`Not saved — ${problem}`, true);
      return false;
    }
    if (tracker.saving) return false;
    tracker.saving = true;
    tracker.update();
    try {
      const snap = await request();
      tracker.markSaved(snap);
      refreshTree().catch(() => {});
    } catch (err) {
      if (!auto || tracker.error !== err.message) toast(`Save failed: ${err.message}`, true);
      tracker.fail(err.message);
    } finally {
      tracker.saving = false;
      tracker.update();
    }
    return !tracker.dirty;
  }

  // ---------------------------------------------------------------------------
  // Blog editor

  const KNOWN_KEYS = ['title', 'subtitle', 'date', 'tags', 'thumbnail', 'draft', 'references'];

  async function blogView(rel) {
    const doc = await api('GET', `blog?path=${enc(rel)}`);
    const data = doc.data;
    let body = doc.body;
    const [seriesSlug, folder] = rel.split('/');
    const seriesInfo = tree.series.find((s) => s.slug === seriesSlug);
    const unlisted = seriesInfo?.unlisted.some((b) => b.folder === folder);
    const siteUrl = `/${rel}/`;
    let mode = store.get('admin-editor-mode', 'visual');
    const isNew = /What the reader will learn/.test(data.subtitle ?? '');
    const extra = Object.keys(data).filter((k) => !KNOWN_KEYS.includes(k));

    main.innerHTML = `
      <div class="topbar">
        <div class="crumbs">
          ${doc.series ? `<a href="#/series/${esc(doc.series.slug)}">${esc(doc.series.title)}</a>` : '<span class="muted">Standalone blogs</span>'}
          <span class="sep">›</span><strong data-crumb>${esc(data.title || folder)}</strong>
          ${unlisted ? '<span class="badge off" title="Add it from the series page to publish it">not listed in series</span>' : ''}
        </div>
        <button type="button" class="status" data-status></button>
        <div class="seg" data-modes>
          <button type="button" data-mode="visual" title="Visual editor">Write</button><button type="button" data-mode="markdown" title="Edit the Markdown source">Markdown</button><button type="button" data-mode="preview" title="The page as readers will see it">Preview</button>
        </div>
        <button type="button" class="btn" data-settings title="Date, tags, draft, references">⚙ Settings</button>
        <a class="btn" href="${esc(siteUrl)}" target="_blank" rel="noopener" title="Open the built page (updates after saving)">View on site ↗</a>
        <button type="button" class="btn primary" data-save>Save</button>
      </div>
      <div class="compose" data-compose>
        <div class="compose-inner">
          <div data-cover></div>
          <div class="compose-actions">
            <button type="button" class="btn ghost" data-add-cover>🖼 Add cover</button>
            <button type="button" class="btn ghost" data-add-subtitle>＋ Add subtitle</button>
          </div>
          <textarea class="title-input" rows="1" placeholder="Article title…" data-sync="title" aria-label="Title"></textarea>
          <textarea class="subtitle-input" rows="1" placeholder="Article subtitle…" data-sync="subtitle" aria-label="Subtitle"></textarea>
          <button type="button" class="byline" data-byline title="Edit date, tags and draft status"></button>
          <div class="rich" data-rich></div>
        </div>
      </div>
      <aside class="drawer" data-drawer hidden aria-label="Blog settings">
        <div class="drawer-head"><strong>Blog settings</strong><button type="button" class="btn sm ghost" data-close-drawer aria-label="Close">✕</button></div>
        <div class="drawer-body" data-meta>
          <label class="field">Title <input name="title" data-sync="title" required></label>
          <label class="field">Subtitle <textarea name="subtitle" data-sync="subtitle" rows="2" placeholder="One line on what the reader will learn"></textarea></label>
          <label class="field">Publish date <input type="date" name="date"></label>
          <label class="field">Tags <input name="tags" placeholder="kubernetes, devops"><span class="hint">Comma separated</span></label>
          <label class="check"><input type="checkbox" name="draft"> Draft <span class="hint">— hidden on the published site</span></label>
          <label class="field">Cover image
            <div class="row"><input name="thumbnail" list="asset-list" placeholder="assets/cover.png"><button type="button" class="btn sm" data-upload-thumb>Upload…</button></div>
            <span class="hint">Path relative to the blog folder, or a URL</span></label>
          <div class="field"><span>References</span><div class="refs" data-refs></div>
            <div><button type="button" class="btn sm" data-add-ref>＋ Add reference</button></div></div>
          <div class="extra-keys">Folder: <code>content/${esc(rel)}/</code></div>
          ${extra.length ? `<div class="extra-keys">Other front matter kept as is: ${extra.map((k) => `<code>${esc(k)}</code>`).join(', ')}</div>` : ''}
        </div>
      </aside>
      <div class="toolbar" data-toolbar>
        <button type="button" data-a="h2" title="Heading 2">H2</button>
        <button type="button" data-a="h3" title="Heading 3">H3</button>
        <span class="tsep"></span>
        <button type="button" data-a="bold" class="tb-b" title="Bold (⌘B)">B</button>
        <button type="button" data-a="italic" class="tb-i" title="Italic (⌘I)">I</button>
        <button type="button" data-a="strike" class="tb-s" title="Strikethrough">S</button>
        <button type="button" data-a="code" class="tb-code" title="Inline code (⌘E)">&lt;/&gt;</button>
        <span class="tsep"></span>
        <button type="button" data-a="link" title="Link (⌘K)">🔗</button>
        <button type="button" data-a="image" title="Upload and insert an image">🖼</button>
        <button type="button" data-a="assets" title="Insert an existing file from this blog">Files ▾</button>
        <span class="tsep"></span>
        <button type="button" data-a="ul" title="Bulleted list">• List</button>
        <button type="button" data-a="ol" title="Numbered list">1. List</button>
        <button type="button" data-a="task" title="Task list">☑ Tasks</button>
        <button type="button" data-a="quote" title="Quote / callout">❝</button>
        <span class="tsep"></span>
        <button type="button" data-a="codeblock" title="Code block" class="tb-code">{ }</button>
        <button type="button" data-a="table" title="Table">▦ Table</button>
        <button type="button" data-a="details" title="Collapsible section">▸ Details</button>
        <button type="button" data-a="hr" title="Divider">―</button>
        <span class="grow"></span>
        <button type="button" data-a="help" title="Markdown cheatsheet">? Help</button>
      </div>
      <div class="work" data-work>
        <div class="pane-edit">
          <textarea class="md-source" spellcheck="true" aria-label="Markdown"></textarea>
          <div class="drop-hint" hidden>Drop files to upload them to assets/</div>
        </div>
        <div class="pane-preview"><iframe title="Live preview"></iframe></div>
      </div>
      <div class="statusbar"><span data-words></span><span data-pos></span><span class="grow"></span><span class="warn" data-warn></span></div>
      <datalist id="asset-list"></datalist>`;

    const ed = $('.md-source', main);
    const frame = $('iframe', main);
    const work = $('[data-work]', main);
    const meta = $('[data-meta]', main);
    const refsEl = $('[data-refs]', main);
    ed.value = body;
    document.title = `${data.title || folder} · Editor`;

    const tracker = makeDirtyTracker(() => JSON.stringify({ data, body }), $('[data-status]', main), $('[data-save]', main));
    $('[data-status]', main).addEventListener('click', () => tracker.dirty && save());
    const me = {
      get dirty() { return tracker.dirty; },
      save,
      destroy() {
        tracker.stop();
        clearTimeout(previewTimer);
        me.dead = true;
        rich?.destroy();
      },
    };
    view = me;
    let previewTimer;
    let seq = 0;
    let frameReady = false;
    let rich = null;
    let richBody = null; // the body the visual editor currently shows
    let subtitleShown = false;

    // --- Front matter form
    const field = (n) => meta.querySelector(`[name="${n}"]`);
    $$('[data-sync]', main).forEach((el) => (el.value = data[el.dataset.sync] ?? ''));
    field('date').value = data.date ?? '';
    field('tags').value = (Array.isArray(data.tags) ? data.tags : []).join(', ');
    field('thumbnail').value = data.thumbnail ?? '';
    field('draft').checked = !!data.draft;

    const setOrDelete = (k, v) => (v ? (data[k] = v) : delete data[k]);
    // Title and subtitle appear twice (compose area and settings); keep both in step.
    main.addEventListener('input', (e) => {
      const key = e.target.dataset?.sync;
      if (!key) return;
      const v = e.target.value.replace(/\n/g, ' ');
      if (v !== e.target.value) e.target.value = v;
      $$(`[data-sync="${key}"]`, main).forEach((el) => el !== e.target && (el.value = v));
      key === 'title' ? (data.title = v) : setOrDelete('subtitle', v);
      if (key === 'title') {
        $('[data-crumb]', main).textContent = v || folder;
        document.title = `${v || folder} · Editor`;
      }
      autosize();
      changed();
    });
    meta.addEventListener('input', (e) => {
      const el = e.target;
      if (el.dataset.sync) return;
      if (el.closest('[data-refs]')) return readRefs();
      const v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.name === 'tags') data.tags = v.split(',').map((t) => t.trim()).filter(Boolean);
      else if (el.name === 'draft') setOrDelete('draft', v);
      else if (el.name) setOrDelete(el.name, v);
      changed();
    });
    const drawer = $('[data-drawer]', main);
    const toggleDrawer = (open = drawer.hidden) => (drawer.hidden = !open);
    $('[data-settings]', main).addEventListener('click', () => toggleDrawer());
    $('[data-close-drawer]', main).addEventListener('click', () => toggleDrawer(false));
    $('[data-byline]', main).addEventListener('click', () => toggleDrawer(true));

    const refRow = (r = {}) => `
      <div class="ref-row">
        <input data-k="title" placeholder="Title" value="${esc(r.title ?? '')}">
        <input data-k="url" placeholder="https://… or references/file.pdf" value="${esc(r.url ?? '')}">
        <input data-k="note" placeholder="Note (optional)" value="${esc(r.note ?? '')}">
        <button type="button" class="btn sm ghost danger" data-del-ref title="Remove">✕</button>
      </div>`;
    const refList = Array.isArray(data.references) ? data.references.map((r) => (typeof r === 'string' ? { title: r, url: r } : r)) : [];
    refsEl.innerHTML = refList.map(refRow).join('');
    function readRefs() {
      const rows = $$('.ref-row', refsEl).map((row) => {
        const r = {};
        for (const input of $$('input', row)) if (input.value.trim()) r[input.dataset.k] = input.value.trim();
        return r;
      }).filter((r) => r.title || r.url);
      if (rows.length || 'references' in data) data.references = rows;
      changed();
    }
    $('[data-add-ref]', main).addEventListener('click', () => {
      refsEl.insertAdjacentHTML('beforeend', refRow());
      $$('.ref-row input', refsEl).at(-3).focus();
    });
    refsEl.addEventListener('click', (e) => {
      if (!e.target.closest('[data-del-ref]')) return;
      e.target.closest('.ref-row').remove();
      readRefs();
    });
    $('[data-upload-thumb]', main).addEventListener('click', async () => {
      const [file] = await pickFiles({ accept: 'image/*' });
      if (!file) return;
      try {
        setCover(await uploadFile(rel, file));
        loadAssets();
        toast('Cover uploaded');
      } catch (err) { toast(err.message, true); }
    });

    // Date · reading time · tags · draft, under the title; clicking it opens the settings.
    function summary() {
      const words = body.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length;
      const date = data.date ? new Date(`${data.date}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : 'No date';
      const tags = (data.tags ?? []).map((t) => `<span class="tag">#${esc(t)}</span>`).join('');
      $('[data-byline]', main).innerHTML = `<span>${esc(date)} · ${Math.max(1, Math.round(words / 200))} min read</span>${tags || '<span class="tag add">＋ tags</span>'}${data.draft ? '<span class="badge draft">draft</span>' : ''}`;
    }

    // --- Cover image and subtitle (compose area)
    const resolveUrl = (u) => (!u || /^([a-z]+:|\/)/i.test(u) ? u : `/__admin/content/${rel}/${u}`);
    function setCover(p) {
      field('thumbnail').value = p || '';
      setOrDelete('thumbnail', p);
      renderCover();
      changed();
    }
    function renderCover() {
      const zone = $('[data-cover]', main);
      zone.innerHTML = data.thumbnail
        ? `<figure class="cover"><img src="${esc(resolveUrl(data.thumbnail))}" alt="Cover image">
             <div class="cover-actions"><button type="button" class="btn sm" data-cover-act="change">Change</button><button type="button" class="btn sm" data-cover-act="remove">Remove</button></div></figure>`
        : '';
      const img = $('img', zone);
      if (img) img.onerror = () => img.closest('figure').classList.add('missing');
      $('[data-add-cover]', main).hidden = !!data.thumbnail;
      $('[data-add-subtitle]', main).hidden = !!data.subtitle || subtitleShown;
      $('.subtitle-input', main).hidden = !(data.subtitle || subtitleShown);
    }
    async function pickCover() {
      const [file] = await pickFiles({ accept: 'image/*' });
      if (!file) return;
      try {
        setCover(await uploadFile(rel, file));
        loadAssets();
      } catch (err) { toast(err.message, true); }
    }
    $('[data-add-cover]', main).addEventListener('click', pickCover);
    $('[data-cover]', main).addEventListener('click', (e) => {
      const act = e.target.closest('[data-cover-act]')?.dataset.coverAct;
      if (act === 'change') pickCover();
      if (act === 'remove') setCover('');
    });
    field('thumbnail').addEventListener('input', renderCover);
    $('[data-add-subtitle]', main).addEventListener('click', () => {
      subtitleShown = true;
      renderCover();
      $('.subtitle-input', main).focus();
    });
    function autosize() {
      $$('.title-input, .subtitle-input', main).forEach((el) => {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      });
    }
    $$('.title-input, .subtitle-input', main).forEach((el) =>
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (el.classList.contains('title-input') && !$('.subtitle-input', main).hidden) $('.subtitle-input', main).focus();
        else $('.ProseMirror', main)?.focus();
      })
    );

    // --- Visual editor (Milkdown Crepe, bundled by the dev server)
    async function showRich() {
      if (rich && richBody === body) return;
      rich?.destroy();
      rich = null;
      const host = $('[data-rich]', main);
      host.innerHTML = '<p class="muted">Loading the editor…</p>';
      try {
        const mod = await loadRichModule();
        if (me.dead) return;
        host.innerHTML = '';
        const base = body;
        richBody = body;
        rich = await mod.createRichEditor(host, {
          markdown: body,
          placeholder: 'Tell your story… (type / for headings, lists, images, code, tables)',
          resolveUrl,
          upload: async (file) => {
            const p = await uploadFile(rel, file);
            loadAssets();
            return p;
          },
          onChange: (md) => {
            body = richBody = md ?? base;
            changed();
            stats();
          },
        });
      } catch (err) {
        host.innerHTML = `<p class="notice">The visual editor couldn't load: ${esc(err.message)}. Use the Markdown tab meanwhile.</p>`;
      }
    }


    // --- Assets (datalist for the cover field + Files menu)
    let assets = [];
    async function loadAssets() {
      try { assets = (await api('GET', `assets?path=${enc(rel)}`)).files; } catch { assets = []; }
      $('#asset-list').innerHTML = assets.filter(isImage).map((a) => `<option value="${esc(a)}">`).join('');
    }
    const isImage = (p) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(p);
    loadAssets();

    // --- Mode switch
    function setMode(m) {
      if (!['visual', 'markdown', 'preview'].includes(m)) m = 'visual';
      mode = m;
      store.set('admin-editor-mode', m);
      work.className = `work mode-${m === 'markdown' ? 'write' : 'preview'}`;
      work.hidden = m === 'visual';
      $('[data-compose]', main).hidden = m !== 'visual';
      $('[data-toolbar]', main).hidden = m !== 'markdown';
      $('[data-pos]', main).hidden = m !== 'markdown';
      $$('[data-modes] button', main).forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
      if (m === 'visual') {
        showRich();
        requestAnimationFrame(autosize);
      } else {
        if (ed.value !== body) ed.value = body;
        if (m === 'preview') schedulePreview(0);
      }
    }
    $('[data-modes]', main).addEventListener('click', (e) => e.target.dataset.mode && setMode(e.target.dataset.mode));
    setMode(mode);

    // --- Saving
    $('[data-save]', main).addEventListener('click', () => save());
    tracker.autosave = () => save(true);
    function save(auto = false) {
      return runSave(tracker, {
        auto,
        validate: () => {
          if (String(data.title ?? '').trim()) return null;
          if (!auto) (mode === 'visual' ? $('.title-input', main) : (toggleDrawer(true), field('title'))).focus();
          return 'add a title';
        },
        request: async () => {
          const snap = JSON.stringify({ data, body });
          await api('PUT', `blog?path=${enc(rel)}`, { data, body });
          return snap;
        },
      });
    }

    function changed() {
      tracker.update();
      summary();
      schedulePreview();
    }

    // --- Live preview
    function schedulePreview(delay = 180) {
      clearTimeout(previewTimer);
      if (mode !== 'preview') return;
      previewTimer = setTimeout(renderPreview, delay);
    }
    async function renderPreview() {
      const mine = ++seq;
      try {
        const r = await api('POST', 'preview', { path: rel, data, body });
        if (mine !== seq || me.dead) return;
        $('[data-warn]', main).textContent = r.warnings.length ? `⚠ ${r.warnings.join(' · ')}` : '';
        applyPreview(r.html);
      } catch (err) {
        if (!me.dead) $('[data-warn]', main).textContent = `⚠ Preview failed: ${err.message}`;
      }
    }

    // Swap only what changed, so the preview keeps its scroll position and images don't reload.
    function applyPreview(html) {
      const fdoc = frame.contentDocument;
      const old = frameReady && fdoc?.querySelector('.reader-layout');
      const next = new DOMParser().parseFromString(html, 'text/html');
      const fresh = next.querySelector('.reader-layout');
      if (!old || !fresh) {
        frameReady = false;
        frame.srcdoc = html;
        return;
      }
      decorate(next);
      old.className = fresh.className;
      morph(old, fresh, fdoc);
    }

    // Do what theme/assets/main.js does on page load, so unchanged blocks compare equal.
    function decorate(d) {
      if (window.hljs) {
        d.querySelectorAll('pre code').forEach((el) => {
          if (!/language-(text|plain|plaintext)\b/.test(el.className)) window.hljs.highlightElement(el);
        });
      }
      d.querySelectorAll('.prose pre').forEach((pre) => {
        const btn = d.createElement('button');
        btn.className = 'copy-btn';
        btn.type = 'button';
        btn.textContent = 'Copy';
        pre.appendChild(btn);
      });
    }

    frame.addEventListener('load', () => {
      const fdoc = frame.contentDocument;
      if (!fdoc?.querySelector('.reader-layout')) return;
      frameReady = true;
      // Keep the preview in place: in-page anchors scroll, other links open in a new tab.
      fdoc.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (!a) return;
        e.preventDefault();
        const href = a.getAttribute('href');
        if (href.startsWith('#')) fdoc.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
        else if (/^[a-z]+:/i.test(href)) window.open(href, '_blank', 'noopener');
        else toast('Links to other pages open on the site, not in the preview');
      });
    });

    // --- Markdown editing
    ed.addEventListener('input', () => {
      body = ed.value;
      changed();
      stats();
    });
    ['keyup', 'click', 'select'].forEach((ev) => ed.addEventListener(ev, position));

    function stats() {
      const words = body.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length;
      $('[data-words]', main).textContent = `${words.toLocaleString()} words · ${Math.max(1, Math.round(words / 200))} min read`;
    }
    function position() {
      const before = ed.value.slice(0, ed.selectionStart);
      const line = before.split('\n').length;
      const col = before.length - before.lastIndexOf('\n');
      $('[data-pos]', main).textContent = `Ln ${line}, Col ${col}`;
    }

    // Edits go through execCommand so ⌘Z undo keeps working.
    function replaceRange(start, end, text, selStart, selEnd = selStart) {
      ed.focus();
      ed.setSelectionRange(start, end);
      const ok = text ? document.execCommand('insertText', false, text) : start === end || document.execCommand('delete');
      if (!ok) {
        ed.setRangeText(text, start, end, 'end');
        ed.dispatchEvent(new Event('input'));
      }
      if (selStart != null) ed.setSelectionRange(selStart, selEnd);
    }

    function wrap(before, after, placeholder) {
      const { selectionStart: s, selectionEnd: e, value } = ed;
      const sel = value.slice(s, e);
      if (sel && value.slice(s - before.length, s) === before && value.slice(e, e + after.length) === after) {
        return replaceRange(s - before.length, e + after.length, sel, s - before.length, e - before.length);
      }
      const t = sel || placeholder;
      replaceRange(s, e, before + t + after, s + before.length, s + before.length + t.length);
    }

    function lineRange() {
      const { selectionStart: s, value } = ed;
      let e = ed.selectionEnd;
      if (e > s && value[e - 1] === '\n') e--;
      const ls = value.lastIndexOf('\n', s - 1) + 1;
      let le = value.indexOf('\n', e);
      if (le < 0) le = value.length;
      return [ls, le];
    }

    function prefixLines(kind) {
      const [ls, le] = lineRange();
      const lines = ed.value.slice(ls, le).split('\n');
      let out;
      if (kind.startsWith('#')) {
        out = lines.map((l) => (l.startsWith(kind) ? l.slice(kind.length) : kind + l.replace(/^#{1,6}\s+/, '')));
      } else if (kind === 'ol') {
        const all = lines.every((l) => /^\s*\d+\.\s/.test(l));
        out = all ? lines.map((l) => l.replace(/^(\s*)\d+\.\s/, '$1')) : lines.map((l, i) => `${i + 1}. ${l}`);
      } else {
        const all = lines.every((l) => l.startsWith(kind));
        out = all ? lines.map((l) => l.slice(kind.length)) : lines.map((l) => kind + l.replace(/^([-*+]|\d+\.) (\[[ xX]\] )?/, ''));
      }
      const text = out.join('\n');
      const single = ed.selectionStart === ed.selectionEnd;
      replaceRange(ls, le, text, single ? ls + text.length : ls, ls + text.length);
    }

    // Inserts a block on its own lines (blank line before and after); `sel` selects part of it.
    function insertBlock(text, sel) {
      const { selectionStart: s, selectionEnd: e, value } = ed;
      const before = value.slice(0, s);
      const after = value.slice(e);
      const pre = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const post = after.startsWith('\n\n') ? '' : after.startsWith('\n') || !after ? '\n' : '\n\n';
      const at = s + pre.length;
      const [a, b] = sel ? [text.indexOf(sel), text.indexOf(sel) + sel.length] : [text.length, text.length];
      replaceRange(s, e, pre + text + post, at + a, at + b);
    }

    const insertAtCursor = (text) => replaceRange(ed.selectionStart, ed.selectionEnd, text, ed.selectionStart + text.length);

    async function uploadAndInsert(files) {
      for (const file of files) {
        try {
          toast(`Uploading ${file.name || 'image'}…`);
          const p = await uploadFile(rel, file);
          const alt = p.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
          const isImg = file.type.startsWith('image/');
          const md = isImg ? `![${alt}](${p})` : file.type.startsWith('video/') ? `<video src="${p}" controls></video>` : `[${file.name}](${p})`;
          isImg || file.type.startsWith('video/') ? insertBlock(md) : insertAtCursor(md);
          toast('Uploaded');
        } catch (err) { toast(err.message, true); }
      }
      loadAssets();
    }

    const actions = {
      h2: () => prefixLines('## '),
      h3: () => prefixLines('### '),
      bold: () => wrap('**', '**', 'bold text'),
      italic: () => wrap('*', '*', 'italic text'),
      strike: () => wrap('~~', '~~', 'struck text'),
      code: () => wrap('`', '`', 'code'),
      link: () => {
        const { selectionStart: s, selectionEnd: e, value } = ed;
        const sel = value.slice(s, e);
        if (/^https?:\/\/\S+$/.test(sel)) return replaceRange(s, e, `[link text](${sel})`, s + 1, s + 10);
        const t = sel || 'link text';
        replaceRange(s, e, `[${t}](https://)`, s + t.length + 3, s + t.length + 11);
      },
      image: async () => uploadAndInsert(await pickFiles({ accept: 'image/*,video/*', multiple: true })),
      assets: (btn) => assetMenu(btn),
      ul: () => prefixLines('- '),
      ol: () => prefixLines('ol'),
      task: () => prefixLines('- [ ] '),
      quote: () => prefixLines('> '),
      codeblock: () => {
        const { selectionStart: s, selectionEnd: e, value } = ed;
        const sel = value.slice(s, e);
        if (sel) insertBlock(`\`\`\`\n${sel.replace(/\n$/, '')}\n\`\`\``);
        else insertBlock('```js\ncode\n```', 'code');
      },
      table: () => insertBlock('| Column | Column |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |', 'Column'),
      details: () => insertBlock('<details>\n<summary>Click to expand</summary>\n\nHidden content (Markdown works here).\n\n</details>', 'Click to expand'),
      hr: () => insertBlock('---'),
      help: (btn) => popover(btn, $('#cheatsheet').content.cloneNode(true), 'cheat-pop'),
    };

    $('[data-toolbar]', main).addEventListener('click', (e) => {
      const btn = e.target.closest('[data-a]');
      if (btn) actions[btn.dataset.a](btn);
    });

    ed.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && !e.shiftKey && !e.altKey && { b: 1, i: 1, k: 1, e: 1 }[k]) {
        e.preventDefault();
        return actions[{ b: 'bold', i: 'italic', k: 'link', e: 'code' }[k]]();
      }
      if (e.key === 'Tab' && !mod) {
        e.preventDefault();
        return indent(e.shiftKey);
      }
      if (e.key === 'Enter' && !e.shiftKey && !mod && !e.isComposing && continueList()) e.preventDefault();
    });

    function indent(out) {
      const { selectionStart: s, selectionEnd: e, value } = ed;
      const [ls, le] = lineRange();
      const isList = /^\s*([-*+]|\d+\.)\s/.test(value.slice(ls, le));
      if (!out && s === e && !isList) return insertAtCursor('  ');
      const lines = value.slice(ls, le).split('\n');
      const next = lines.map((l) => (out ? l.replace(/^ {1,2}/, '') : `  ${l}`));
      const text = next.join('\n');
      const shift = next[0].length - lines[0].length;
      replaceRange(ls, le, text, s === e ? Math.max(ls, s + shift) : ls, s === e ? Math.max(ls, s + shift) : ls + text.length);
    }

    // Enter on a list item starts the next one; Enter on an empty item ends the list.
    function continueList() {
      const { selectionStart: s, selectionEnd: e, value } = ed;
      if (s !== e) return false;
      const ls = value.lastIndexOf('\n', s - 1) + 1;
      const line = value.slice(ls, s);
      const m = line.match(/^(\s*)([-*+]|\d+[.)]|>)(\s+)(\[[ xX]\]\s+)?/);
      if (!m) return false;
      if (!line.slice(m[0].length).trim()) {
        replaceRange(ls, s, '', ls);
        if (ls === s) return false;
        return true;
      }
      let marker = m[2];
      if (/^\d/.test(marker)) marker = `${parseInt(marker, 10) + 1}${marker.slice(-1)}`;
      insertAtCursor(`\n${m[1]}${marker}${m[3]}${m[4] ? '[ ] ' : ''}`);
      return true;
    }

    // Paste or drop files to upload them.
    ed.addEventListener('paste', (e) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (!files.length) return;
      e.preventDefault();
      uploadAndInsert(files);
    });
    const pane = $('.pane-edit', main);
    const hint = $('.drop-hint', main);
    pane.addEventListener('dragover', (e) => {
      if (![...e.dataTransfer.types].includes('Files')) return;
      e.preventDefault();
      hint.hidden = false;
    });
    pane.addEventListener('dragleave', (e) => !pane.contains(e.relatedTarget) && (hint.hidden = true));
    pane.addEventListener('drop', (e) => {
      hint.hidden = true;
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      uploadAndInsert([...e.dataTransfer.files]);
    });

    function assetMenu(btn) {
      const box = document.createElement('div');
      if (!assets.length) box.innerHTML = '<p class="muted" style="margin:4px">No files yet. Use 🖼 or paste/drop a file into the editor.</p>';
      for (const a of assets) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'a-item';
        b.innerHTML = `${isImage(a) ? `<img src="content/${esc(rel)}/${esc(a)}" alt="">` : `<span class="ic">${esc(a.split('.').pop())}</span>`}<span>${esc(a)}</span>`;
        b.addEventListener('click', () => {
          closePop();
          const alt = a.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
          isImage(a) ? insertBlock(`![${alt}](${a})`) : insertAtCursor(`[${a.split('/').pop()}](${a})`);
        });
        box.append(b);
      }
      popover(btn, box, 'asset-pop');
    }

    stats();
    position();
    summary();
    renderCover();
    tracker.update();
    ed.setSelectionRange(0, 0);
    if (isNew) (mode === 'visual' ? $('.title-input', main) : field('title')).select();
    else if (mode === 'markdown') ed.focus();
  }

  // The visual editor bundle (and its stylesheet) load once, on first use.
  let richModule = null;
  function loadRichModule() {
    if (!richModule) {
      document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'rich/editor.css' }));
      richModule = import('./rich/editor.js').catch((err) => {
        richModule = null;
        throw err;
      });
    }
    return richModule;
  }

  // Make `a` (live, in `doc`) look like `b`: keep the unchanged children at both ends and
  // replace only the changed run in between, descending when its elements pair up one to one.
  function morph(a, b, doc) {
    const A = [...a.childNodes];
    const B = [...b.childNodes];
    let i = 0;
    while (i < A.length && i < B.length && A[i].isEqualNode(B[i])) i++;
    let j = 0;
    while (j < A.length - i && j < B.length - i && A[A.length - 1 - j].isEqualNode(B[B.length - 1 - j])) j++;
    const oldMid = A.slice(i, A.length - j);
    const newMid = B.slice(i, B.length - j);
    const pairs = (x, y) => x.nodeType === y.nodeType && (x.nodeType !== 1 || x.cloneNode(false).isEqualNode(y.cloneNode(false)));
    if (oldMid.length && oldMid.length === newMid.length && oldMid.every((n, k) => pairs(n, newMid[k]))) {
      return oldMid.forEach((n, k) => {
        if (n.nodeType === 1) morph(n, newMid[k], doc);
        else if (n.nodeValue !== newMid[k].nodeValue) n.nodeValue = newMid[k].nodeValue;
      });
    }
    const ref = A[A.length - j] ?? null;
    oldMid.forEach((n) => n.remove());
    for (const n of newMid) a.insertBefore(doc.importNode(n, true), ref);
  }

  // ---------------------------------------------------------------------------
  // Popovers

  let pop = null;
  function closePop() {
    pop?.remove();
    pop = null;
  }
  function popover(anchor, content, cls) {
    const wasSame = pop?.dataset.cls === cls;
    closePop();
    if (wasSame) return;
    pop = document.createElement('div');
    pop.className = `pop ${cls}`;
    pop.dataset.cls = cls;
    pop.append(content);
    document.body.append(pop);
    const r = anchor.getBoundingClientRect();
    const left = Math.min(r.left, innerWidth - pop.offsetWidth - 12);
    pop.style.left = `${Math.max(12, left)}px`;
    pop.style.top = `${r.bottom + 6}px`;
  }
  document.addEventListener('mousedown', (e) => pop && !pop.contains(e.target) && !e.target.closest('[data-a]') && closePop());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closePop());

  // ---------------------------------------------------------------------------
  // Series editor: details, sections and blog order

  async function seriesView(slug) {
    const s = await api('GET', `series?slug=${enc(slug)}`);
    const { data, info } = s;
    const groups = s.groups;
    const unlisted = s.unlisted;
    let body = s.body;
    document.title = `${data.title || slug} · Editor`;

    main.innerHTML = `
      <div class="topbar">
        <div class="crumbs"><span class="muted">Series</span><span class="sep">›</span><strong data-crumb>${esc(data.title || slug)}</strong></div>
        <button type="button" class="status" data-status></button>
        <a class="btn" href="/${esc(slug)}/" target="_blank" rel="noopener">View on site ↗</a>
        <button type="button" class="btn primary" data-save>Save</button>
      </div>
      <div class="page"><div class="page-inner">
        <div class="card"><div class="form-grid" data-meta>
          <label class="field c8">Title <input name="title" required></label>
          <label class="field c4">Date <input type="date" name="date"></label>
          <label class="field c12">Subtitle <textarea name="subtitle" rows="2"></textarea></label>
          <label class="field c6">Tags <input name="tags" placeholder="kubernetes, devops"><span class="hint">Comma separated</span></label>
          <label class="field c6">Thumbnail
            <div class="row"><input name="thumbnail" placeholder="thumbnail.png"><button type="button" class="btn sm" data-upload-thumb>Upload…</button></div>
            <span class="hint">File in the series folder, or a URL</span></label>
          <label class="field c3">Home page order <input type="number" name="order" min="0"></label>
          <div class="c9" style="align-self:end;padding-bottom:6px"><label class="check"><input type="checkbox" name="draft"> Draft <span class="hint">— the whole series is hidden on the published site</span></label></div>
        </div></div>

        <h2>Contents <span class="hint">· drag blogs to reorder them or move them between sections</span></h2>
        <div data-groups></div>
        <div class="row" style="flex-wrap:wrap">
          <button type="button" class="btn" data-add-section>＋ Add section</button>
          <button type="button" class="btn" data-new-blog>＋ New blog in this series</button>
        </div>
        <div data-unlisted></div>

        <h2>Intro</h2>
        <label class="field"><textarea rows="5" data-body style="font-family:var(--mono)"></textarea>
          <span class="hint">Markdown. Not shown on the page; search uses it.</span></label>
      </div></div>`;

    const meta = $('[data-meta]', main);
    const field = (n) => meta.querySelector(`[name="${n}"]`);
    field('title').value = data.title ?? '';
    field('subtitle').value = data.subtitle ?? '';
    field('date').value = data.date ?? '';
    field('tags').value = (Array.isArray(data.tags) ? data.tags : []).join(', ');
    field('thumbnail').value = data.thumbnail ?? '';
    field('order').value = data.order ?? '';
    field('draft').checked = !!data.draft;
    $('[data-body]', main).value = body;

    const tracker = makeDirtyTracker(() => JSON.stringify({ data, groups, body }), $('[data-status]', main), $('[data-save]', main));
    $('[data-status]', main).addEventListener('click', () => tracker.dirty && save());
    view = { get dirty() { return tracker.dirty; }, save, destroy: () => tracker.stop() };
    tracker.autosave = () => save(true);

    const setOrDelete = (k, v) => (v !== '' && v !== false ? (data[k] = v) : delete data[k]);
    meta.addEventListener('input', (e) => {
      const el = e.target;
      if (el.name === 'title') {
        data.title = el.value;
        $('[data-crumb]', main).textContent = el.value || slug;
      } else if (el.name === 'tags') data.tags = el.value.split(',').map((t) => t.trim()).filter(Boolean);
      else if (el.name === 'draft') setOrDelete('draft', el.checked);
      else if (el.name === 'order') setOrDelete('order', el.value === '' ? '' : Number(el.value));
      else if (el.name) setOrDelete(el.name, el.value);
      tracker.update();
    });
    $('[data-body]', main).addEventListener('input', (e) => {
      body = e.target.value;
      tracker.update();
    });
    $('[data-upload-thumb]', main).addEventListener('click', async () => {
      const [file] = await pickFiles({ accept: 'image/*' });
      if (!file) return;
      try {
        const p = await uploadFile(slug, file);
        field('thumbnail').value = data.thumbnail = p;
        tracker.update();
        toast('Thumbnail uploaded');
      } catch (err) { toast(err.message, true); }
    });

    const groupsEl = $('[data-groups]', main);
    const unlistedEl = $('[data-unlisted]', main);

    function render() {
      let n = 0;
      const hasSections = groups.length > 1;
      groupsEl.innerHTML = groups.map((g, gi) => {
        if (gi === 0 && hasSections && !g.blogs.length) return '';
        const head = gi === 0
          ? `<div class="group-head"><span class="loose">${hasSections ? 'Before the first section (no section)' : 'Blogs'}</span></div>`
          : `<div class="group-head">
              <input data-g="${gi}" data-k="title" value="${esc(g.title)}" placeholder="Section title" aria-label="Section title">
              <input data-g="${gi}" data-k="description" value="${esc(g.description)}" placeholder="One-line description (optional)" aria-label="Section description">
              <div class="row">
                <button type="button" class="btn sm ghost" data-sec-act="up" data-g="${gi}" title="Move section up"${gi === 1 ? ' disabled' : ''}>↑</button>
                <button type="button" class="btn sm ghost" data-sec-act="down" data-g="${gi}" title="Move section down"${gi === groups.length - 1 ? ' disabled' : ''}>↓</button>
                <button type="button" class="btn sm ghost" data-sec-act="new" data-g="${gi}" title="New blog in this section">＋ Blog</button>
                <button type="button" class="btn sm ghost danger" data-sec-act="delete" data-g="${gi}" title="Delete section (its blogs move up)">✕</button>
              </div>
            </div>`;
        const rows = g.blogs.map((b, bi) => {
          n++;
          const i = info[b.folder] ?? {};
          return `<li class="blog-row" draggable="true" data-g="${gi}" data-b="${bi}">
              <span class="grip" title="Drag to move">⋮⋮</span>
              <span class="num">${n}</span>
              <span class="title">${esc(b.title || i.title || b.folder)}${i.missing ? ' <span class="badge draft">missing folder</span>' : draftBadge(i)}</span>
              <span class="folder">${esc(b.folder)}</span>
              <a class="btn sm ghost" href="#/blog/${esc(slug)}/${esc(b.folder)}">Edit</a>
              <button type="button" class="btn sm ghost" data-act="up" title="Move up">↑</button>
              <button type="button" class="btn sm ghost" data-act="down" title="Move down">↓</button>
              <button type="button" class="btn sm ghost danger" data-act="remove" title="Remove from the series (the folder is kept)">✕</button>
            </li>`;
        }).join('');
        return `<div class="card group">${head}<ul class="blog-list" data-list="${gi}">${rows || '<li class="list-empty">No blogs — drag one here</li>'}</ul></div>`;
      }).join('');

      unlistedEl.innerHTML = unlisted.length
        ? `<h2>Not listed <span class="hint">· folders in this series that aren't published yet</span></h2>
           <div class="card"><ul class="blog-list">${unlisted.map((f) => `
             <li class="blog-row"><span class="title">${esc(info[f]?.title ?? f)}${draftBadge(info[f] ?? {})}</span><span class="folder">${esc(f)}</span>
               <a class="btn sm ghost" href="#/blog/${esc(slug)}/${esc(f)}">Edit</a>
               <button type="button" class="btn sm" data-list-add="${esc(f)}">Add to series</button></li>`).join('')}</ul></div>`
        : '';
      tracker.update();
    }

    groupsEl.addEventListener('input', (e) => {
      const { g, k } = e.target.dataset;
      if (g == null || !k) return;
      groups[g][k] = e.target.value;
      tracker.update();
    });

    groupsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.secAct) {
        const gi = Number(btn.dataset.g);
        const act = btn.dataset.secAct;
        if (act === 'up' && gi > 1) [groups[gi - 1], groups[gi]] = [groups[gi], groups[gi - 1]];
        if (act === 'down' && gi < groups.length - 1) [groups[gi + 1], groups[gi]] = [groups[gi], groups[gi + 1]];
        if (act === 'delete') groups[gi - 1].blogs.push(...groups.splice(gi, 1)[0].blogs);
        if (act === 'new') return newBlogHere(groups[gi].title);
        return render();
      }
      const row = btn.closest('.blog-row');
      if (!row || !btn.dataset.act) return;
      const gi = Number(row.dataset.g);
      const bi = Number(row.dataset.b);
      const list = groups[gi].blogs;
      if (btn.dataset.act === 'remove') unlisted.push(list.splice(bi, 1)[0].folder);
      else if (btn.dataset.act === 'up') {
        if (bi > 0) [list[bi - 1], list[bi]] = [list[bi], list[bi - 1]];
        else if (gi > 0) groups[gi - 1].blogs.push(list.shift());
      } else if (btn.dataset.act === 'down') {
        if (bi < list.length - 1) [list[bi + 1], list[bi]] = [list[bi], list[bi + 1]];
        else if (gi < groups.length - 1) groups[gi + 1].blogs.unshift(list.pop());
      }
      render();
    });

    unlistedEl.addEventListener('click', (e) => {
      const f = e.target.closest('[data-list-add]')?.dataset.listAdd;
      if (!f) return;
      unlisted.splice(unlisted.indexOf(f), 1);
      groups[groups.length - 1].blogs.push({ folder: f });
      render();
    });

    // Drag and drop between and within sections.
    let dragFrom = null;
    groupsEl.addEventListener('dragstart', (e) => {
      const row = e.target.closest?.('.blog-row[draggable]');
      if (!row) return;
      dragFrom = { g: Number(row.dataset.g), b: Number(row.dataset.b) };
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', row.dataset.b);
    });
    groupsEl.addEventListener('dragend', () => {
      dragFrom = null;
      $$('.dragging, .drop-target', groupsEl).forEach((el) => el.classList.remove('dragging', 'drop-target'));
    });
    groupsEl.addEventListener('dragover', (e) => {
      const list = e.target.closest('[data-list]');
      if (!dragFrom || !list) return;
      e.preventDefault();
      $$('.drop-target', groupsEl).forEach((el) => el !== list && el.classList.remove('drop-target'));
      list.classList.add('drop-target');
    });
    groupsEl.addEventListener('drop', (e) => {
      const list = e.target.closest('[data-list]');
      if (!dragFrom || !list) return;
      e.preventDefault();
      const to = Number(list.dataset.list);
      const rows = $$('.blog-row', list);
      let idx = rows.findIndex((r) => e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2);
      if (idx < 0) idx = rows.length;
      const [item] = groups[dragFrom.g].blogs.splice(dragFrom.b, 1);
      if (to === dragFrom.g && dragFrom.b < idx) idx--;
      groups[to].blogs.splice(idx, 0, item);
      dragFrom = null;
      render();
    });

    $('[data-add-section]', main).addEventListener('click', () => {
      groups.push({ title: `Section ${groups.length}`, description: '', blogs: [] });
      render();
      const inputs = $$('[data-k="title"]', groupsEl);
      inputs.at(-1)?.select();
    });
    $('[data-new-blog]', main).addEventListener('click', () => newBlogHere(''));

    // Creating a blog edits this series' index.md, so save pending changes first.
    async function newBlogHere(section) {
      if (tracker.dirty) await save();
      if (tracker.dirty) return;
      newBlog({ series: slug, section });
    }

    $('[data-save]', main).addEventListener('click', () => save());
    function save(auto = false) {
      return runSave(tracker, {
        auto,
        validate: () =>
          !String(data.title ?? '').trim() ? 'add a title'
          : groups.slice(1).some((g) => !g.title.trim()) ? 'every section needs a title'
          : null,
        request: async () => {
          const snap = JSON.stringify({ data, groups, body });
          await api('PUT', `series?slug=${enc(slug)}`, { data, groups, body });
          return snap;
        },
      });
    }

    render();
  }

  // ---------------------------------------------------------------------------

  refreshTree().then(route).catch((err) => {
    main.innerHTML = `<div class="page"><div class="page-inner"><p class="notice">Couldn't load content: ${esc(err.message)}</p></div></div>`;
  });
})();
