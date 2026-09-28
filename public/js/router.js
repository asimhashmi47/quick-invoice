const router = (() => {
  const routes = [
    { pattern: /^\/dashboard$/, view: () => views.dashboard(), title: 'Dashboard', nav: 'dashboard' },
    { pattern: /^\/customers$/, view: () => views.customers(), title: 'Customers', nav: 'customers' },
    { pattern: /^\/invoices$/, view: () => views.invoices(), title: 'Invoices', nav: 'invoices' },
    { pattern: /^\/invoices\/new$/, view: () => views.invoiceCreate(), title: 'New Invoice', nav: 'invoices' },
    { pattern: /^\/invoices\/(\d+)$/, view: (id) => views.invoiceDetail(id), title: 'Invoice', nav: 'invoices' },
  ];

  function setTitle(title) {
    document.getElementById('page-title').textContent = title;
    document.title = `${title} · QuickInvoice`;
  }

  function resolve() {
    const hash = window.location.hash.replace(/^#/, '') || '/dashboard';
    const match = routes.find((r) => r.pattern.test(hash));

    if (!match) {
      window.location.hash = '#/dashboard';
      return;
    }

    document.querySelectorAll('.nav-link').forEach((link) => {
      const isActive = link.dataset.route === match.nav;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    setTitle(match.title);
    modal.close();
    sidebar.close();
    window.scrollTo(0, 0);

    const params = hash.match(match.pattern).slice(1);
    match.view(...params);
  }

  function init() {
    window.addEventListener('hashchange', resolve);
    resolve();
  }

  return { init, setTitle };
})();
