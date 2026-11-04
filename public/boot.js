// Runs before Angular. It lives in its own file because the production CSP blocks inline scripts.
(function () {
  // Apply the saved theme now, to avoid a flash of the wrong theme.
  try {
    var saved = localStorage.getItem('portfolio.theme');
    var light = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.dataset.theme = saved || (light ? 'light' : 'dark');
  } catch (e) {}

  // Start the content request with the page instead of waiting for Angular to boot.
  if (location.pathname.indexOf('/admin') !== 0) {
    var preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'fetch';
    preload.href = '/api/public/portfolio';
    preload.crossOrigin = 'use-credentials';
    document.head.appendChild(preload);
  }
})();
