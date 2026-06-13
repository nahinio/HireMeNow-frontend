const FilterForms = {
  init() {
    document.addEventListener('change', (e) => {
      const form = e.target.closest('[data-filter-form][data-filter-auto]');
      if (!form || e.target.tagName !== 'SELECT') return;
      FilterForms.apply(form);
    });

    document.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-filter-form]');
      if (!form) return;
      e.preventDefault();
      FilterForms.apply(form);
    });
  },

  apply(form) {
    const path = form.dataset.filterPath;
    if (!path) return;

    const fd = new FormData(form);
    const params = {};
    const keep = FilterForms.readKeep(form);

    fd.forEach((value, key) => {
      if (value !== '' && value != null) params[key] = value;
    });

    Router.navigate(Utils.buildHash(path, { ...keep, ...params }).slice(1));
  },

  readKeep(form) {
    const raw = form.dataset.filterKeep;
    if (!raw) return {};
    try {
      const keep = JSON.parse(raw);
      return Object.fromEntries(
        Object.entries(keep).filter(([, value]) => value != null && value !== ''),
      );
    } catch {
      return {};
    }
  },
};
