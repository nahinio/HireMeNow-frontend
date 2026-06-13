const Router = {
  routes: {},
  shells: {},

  register(path, handler, shell) {
    Router.routes[path] = handler;
    if (shell) Router.shells[path] = shell;
  },

  getPath() {
    const hash = location.hash.slice(1) || '/';
    const qIdx = hash.indexOf('?');
    return qIdx === -1 ? hash : hash.slice(0, qIdx);
  },

  navigate(path) {
    location.hash = path.startsWith('#') ? path.slice(1) : path;
  },

  resolveShell(path) {
    if (Router.shells[path]) return Router.shells[path]();
    for (const [pattern, shell] of Object.entries(Router.shells)) {
      if (!pattern.includes(':')) continue;
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$');
      if (regex.test(path)) return shell();
    }
    return null;
  },

  async render() {
    const path = Router.getPath();
    const main = document.getElementById('main');
    if (!main) return;

    const shellHtml = Router.resolveShell(path);
    if (shellHtml != null) {
      main.innerHTML = shellHtml;
      Router.bindEvents(main);
      App.bindNavIn(main);
    } else {
      main.innerHTML = '<div class="page-skeleton"><div class="skeleton-line skeleton-title"></div><div class="skeleton-line"></div></div>';
    }

    const handler = Router.match(path);
    if (!handler) {
      main.innerHTML = Pages.notFound();
      return;
    }

    try {
      const html = await handler();
      if (html === false || html == null) {
        Router.afterRender(path);
        return;
      }
      main.innerHTML = html;
      Router.bindEvents(main);
      App.bindNavIn(main);
      Router.afterRender(path);
    } catch (err) {
      if (err?.handled) return;
      main.innerHTML = `<div class="alert alert-error">${Utils.escapeHtml(Utils.parseApiError(err))}</div>`;
    }
  },

  afterRender(path) {
    Dropdowns.enhance(document.getElementById('main'));
    Utils.initFileUploads(document.getElementById('main'));
    if (path === '/admin/skills' || /^\/admin\/skills\/[^/]+\/edit$/.test(path)) {
      AdminSkills.initPage();
    }
  },

  match(path) {
    if (Router.routes[path]) return Router.routes[path];
    for (const [pattern, handler] of Object.entries(Router.routes)) {
      if (!pattern.includes(':')) continue;
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$');
      if (regex.test(path)) {
        return async () => {
          const m = path.match(regex);
          const params = {};
          const keys = (pattern.match(/:[^/]+/g) || []).map((k) => k.slice(1));
          keys.forEach((k, i) => { params[k] = m[i + 1]; });
          return handler(params);
        };
      }
    }
    return null;
  },

  bindEvents(root) {
    root.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate(el.getAttribute('data-nav'));
      });
    });

    root.querySelectorAll('form[data-form]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.getAttribute('data-form');
        const handler = FormHandlers[name];
        if (handler) await handler(form);
      });
    });

    root.querySelectorAll('form[data-form="quizAttempt"]').forEach((form) => {
      if (form.dataset.autoSubmitBound) return;
      form.dataset.autoSubmitBound = '1';
      form.addEventListener('change', (e) => {
        if (!e.target.matches('input[type="radio"]')) return;
        const questions = form.querySelectorAll('.portal-quiz-question');
        const allAnswered = [...questions].every(
          (block) => block.querySelector('input[type="radio"]:checked'),
        );
        if (!allAnswered) return;
        const handler = FormHandlers.quizAttempt;
        if (handler) handler(form);
      });
    });
  },
};

const FormHandlers = {};
