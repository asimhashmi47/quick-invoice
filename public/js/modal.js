const modal = (() => {
  const root = () => document.getElementById('modal-root');
  const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;
  let onCloseCallback = null;

  function close() {
    if (!root().firstChild) return;
    root().innerHTML = '';
    document.removeEventListener('keydown', onKeydown);
    document.body.classList.remove('modal-open');
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    const callback = onCloseCallback;
    onCloseCallback = null;
    if (callback) callback();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key !== 'Tab') return;

    const box = root().querySelector('.modal');
    const items = Array.from(box.querySelectorAll(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function open(node, { size = '', onClose = null, dismissOnBackdrop = true } = {}) {
    close();
    lastFocused = document.activeElement;
    onCloseCallback = onClose;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    if (dismissOnBackdrop) {
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) close();
      });
    }

    const box = document.createElement('div');
    box.className = `modal ${size}`.trim();
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    const heading = node.querySelector('h2, h3');
    if (heading) {
      heading.id = 'modal-title';
      box.setAttribute('aria-labelledby', 'modal-title');
    }
    box.appendChild(node);

    overlay.appendChild(box);
    root().appendChild(overlay);
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', onKeydown);

    const autofocus = box.querySelector('[data-autofocus]') || box.querySelector('input, textarea, select');
    const fallback = box.querySelector('.modal-footer button:last-child');
    (autofocus || fallback || box).focus();
  }

  function confirm({ title, message, confirmLabel = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
      let confirmed = false;
      const wrapper = document.createElement('div');

      const header = document.createElement('div');
      header.className = 'modal-header';
      const heading = document.createElement('h3');
      heading.textContent = title;
      header.appendChild(heading);

      const body = document.createElement('div');
      body.className = 'modal-body';
      const messageEl = document.createElement('p');
      messageEl.className = 'modal-message';
      messageEl.textContent = message;
      body.appendChild(messageEl);

      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.dataset.autofocus = '';
      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
      confirmBtn.textContent = confirmLabel;
      footer.append(cancelBtn, confirmBtn);

      wrapper.append(header, body, footer);

      cancelBtn.addEventListener('click', close);
      confirmBtn.addEventListener('click', () => {
        confirmed = true;
        close();
      });

      open(wrapper, { onClose: () => resolve(confirmed) });
    });
  }

  return { open, close, confirm };
})();
