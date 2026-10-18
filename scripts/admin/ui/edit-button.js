// Dev only (injected by scripts/dev.mjs): a floating "Edit" button that opens this page in the editor.
(function () {
  const [first, second] = location.pathname.split('/').filter(Boolean);
  let hash = '#/';
  if (first === 'blogs' && second) hash = `#/blog/blogs/${second}`;
  else if (first && first !== 'series' && first !== 'blogs' && !first.includes('.')) {
    hash = second ? `#/blog/${first}/${second}` : `#/series/${first}`;
  }
  const a = document.createElement('a');
  a.href = `/__admin/${hash}`;
  a.textContent = '✎ Edit';
  a.title = 'Open in the content editor (dev only)';
  a.style.cssText =
    'position:fixed;right:18px;bottom:18px;z-index:50;padding:9px 16px;border-radius:999px;background:var(--accent);' +
    'color:var(--bg);font:600 14px/1 var(--font);box-shadow:0 6px 20px rgba(0,0,0,.18);text-decoration:none';
  document.body.append(a);
})();
