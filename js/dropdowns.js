const Dropdowns = {
  chevron: '<span class="hm-dropdown-chevron" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>',

  init() {
    document.addEventListener('click', () => Dropdowns.closeAll());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') Dropdowns.closeAll();
    });
  },

  enhance(root = document) {
    root.querySelectorAll('select:not([data-hm-dropdown])').forEach((select) => {
      Dropdowns.wrap(select);
    });
  },

  refresh(select) {
    if (!select) return;
    const wrapper = select.closest('.hm-dropdown');
    if (!wrapper) {
      Dropdowns.wrap(select);
      return;
    }
    const menu = wrapper.querySelector('.hm-dropdown-menu');
    const trigger = wrapper.querySelector('.hm-dropdown-trigger');
    if (!menu || !trigger) return;
    Dropdowns.buildMenu(select, wrapper, menu, trigger);
    Dropdowns.sync(select, wrapper, trigger, menu);
  },

  wrap(select) {
    if (select.dataset.hmDropdown) return;
    select.dataset.hmDropdown = '1';

    const isFilter = Boolean(select.closest('.filter-control-select'));
    const wrapper = document.createElement('div');
    wrapper.className = `hm-dropdown${isFilter ? ' hm-dropdown-filter' : ''}`;
    wrapper.classList.toggle('is-filtered', Boolean(select.value));

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'hm-dropdown-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `<span class="hm-dropdown-value"></span>${Dropdowns.chevron}`;

    const menu = document.createElement('div');
    menu.className = 'hm-dropdown-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;

    select.classList.add('hm-dropdown-native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');

    const parent = select.parentNode;
    parent.insertBefore(wrapper, select);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    wrapper.appendChild(select);

    Dropdowns.buildMenu(select, wrapper, menu, trigger);
    Dropdowns.sync(select, wrapper, trigger, menu);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !wrapper.classList.contains('is-open');
      Dropdowns.closeAll();
      if (open) {
        wrapper.classList.add('is-open');
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    select.addEventListener('change', () => {
      Dropdowns.buildMenu(select, wrapper, menu, trigger);
      Dropdowns.sync(select, wrapper, trigger, menu);
      wrapper.classList.toggle('is-filtered', Boolean(select.value));
    });
  },

  buildMenu(select, wrapper, menu, trigger) {
    menu.innerHTML = '';
    Array.from(select.options).forEach((opt) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'hm-dropdown-option';
      item.dataset.value = opt.value;
      item.textContent = opt.textContent;
      item.setAttribute('role', 'option');
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        Dropdowns.pick(select, wrapper, trigger, menu, opt.value);
      });
      menu.appendChild(item);
    });
  },

  pick(select, wrapper, trigger, menu, value) {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    wrapper.classList.toggle('is-filtered', Boolean(value));
    Dropdowns.sync(select, wrapper, trigger, menu);
    Dropdowns.closeAll();
  },

  sync(select, wrapper, trigger, menu) {
    const opt = select.options[select.selectedIndex];
    const label = trigger.querySelector('.hm-dropdown-value');
    if (label) label.textContent = opt?.textContent || '';
    menu.querySelectorAll('.hm-dropdown-option').forEach((item) => {
      const on = item.dataset.value === select.value;
      item.classList.toggle('is-selected', on);
      item.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  },

  closeAll() {
    document.querySelectorAll('.hm-dropdown.is-open').forEach((wrapper) => {
      wrapper.classList.remove('is-open');
      const menu = wrapper.querySelector('.hm-dropdown-menu');
      const trigger = wrapper.querySelector('.hm-dropdown-trigger');
      if (menu) menu.hidden = true;
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  },
};
