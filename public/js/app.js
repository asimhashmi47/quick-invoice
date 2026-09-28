const sidebar = (() => {
  const el = () => document.getElementById('sidebar');
  const overlay = () => document.getElementById('sidebar-overlay');
  const button = () => document.getElementById('mobile-menu-btn');

  function open() {
    el().classList.add('open');
    overlay().classList.add('open');
    button().setAttribute('aria-expanded', 'true');
    const firstLink = el().querySelector('.nav-link');
    if (firstLink) firstLink.focus();
  }

  function close() {
    if (!el().classList.contains('open')) return;
    el().classList.remove('open');
    overlay().classList.remove('open');
    button().setAttribute('aria-expanded', 'false');
  }

  return { open, close };
})();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mobile-menu-btn').addEventListener('click', sidebar.open);
  document.getElementById('sidebar-overlay').addEventListener('click', sidebar.close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') sidebar.close();
  });

  router.init();
});
