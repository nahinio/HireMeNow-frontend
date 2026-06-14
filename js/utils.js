const Utils = {
  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  },

  formatDateShort(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  formatDateCard(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  },

  jobCardTheme(seed) {
    const themes = [
      { bg: '#f5f5f5', accent: '#e5e5e5' },
      { bg: '#fafafa', accent: '#ebebeb' },
      { bg: '#f0f0f0', accent: '#d4d4d4' },
      { bg: '#f7f7f7', accent: '#e0e0e0' },
      { bg: '#ededed', accent: '#d9d9d9' },
      { bg: '#ececec', accent: '#d0d0d0' },
    ];
    const hash = String(seed || '')
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return themes[hash % themes.length];
  },

  initial(name) {
    return String(name || '?').trim().charAt(0).toUpperCase() || '?';
  },

  formatMoney(val, negotiable) {
    if (negotiable) return 'Negotiable';
    if (val == null || val === '') return '—';
    return `$${Number(val).toLocaleString()}`;
  },

  resolveMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return CONFIG.API_BASE + url;
    return CONFIG.API_BASE + '/' + url;
  },

  cacheBustMediaUrl(url) {
    const resolved = Utils.resolveMediaUrl(url);
    if (!resolved) return '';
    const sep = resolved.includes('?') ? '&' : '?';
    return `${resolved}${sep}v=${Date.now()}`;
  },

  getYoutubeVideoId(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || '';
      if (u.hostname.includes('youtube.com')) {
        if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || '';
        if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || '';
        return u.searchParams.get('v') || '';
      }
    } catch {
      return '';
    }
    return '';
  },

  isYoutubeUrl(url) {
    return Boolean(Utils.getYoutubeVideoId(url));
  },

  getCourseThumbnail(course) {
    if (course?.thumbnail_url) return Utils.resolveMediaUrl(course.thumbnail_url);
    const videoId = Utils.getYoutubeVideoId(course?.link);
    if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    return '';
  },

  getQueryParams() {
    const out = {};
    const search = new URLSearchParams(location.search);
    for (const [k, v] of search) out[k] = v;

    const hash = location.hash.slice(1);
    const qIdx = hash.indexOf('?');
    if (qIdx !== -1) {
      const hashParams = new URLSearchParams(hash.slice(qIdx + 1));
      for (const [k, v] of hashParams) out[k] = v;
    }
    return out;
  },

  handleEmailResetLink() {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) return false;
    const hashRoute = `#/reset-password?token=${encodeURIComponent(token)}`;
    if (location.hash !== hashRoute) {
      history.replaceState(null, '', location.pathname);
      location.hash = `/reset-password?token=${encodeURIComponent(token)}`;
    }
    return true;
  },

  buildHash(path, params = {}) {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    );
    const qs = new URLSearchParams(clean).toString();
    return qs ? `#${path}?${qs}` : `#${path}`;
  },

  debounce(fn, ms = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  stars(rating) {
    const n = Math.round(Number(rating) || 0);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  },

  formatJobStatus(status) {
    const labels = {
      open: 'Open',
      filled: 'Filled',
      pending_confirmation: 'Pending confirmation',
      completed: 'Completed',
      closed: 'Closed',
      pending: 'Pending',
      accepted: 'Accepted',
      canceled: 'Canceled',
    };
    return labels[status] || String(status || '').replace(/_/g, ' ');
  },

  statusBadge(status) {
    const label = Utils.formatJobStatus(status);
    return `<span class="badge badge-${Utils.escapeHtml(status)}">${Utils.escapeHtml(label)}</span>`;
  },

  showToast(message, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast toast-${type} show`;
    clearTimeout(Utils._toastTimer);
    Utils._toastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, 4000);
  },

  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      Utils.showToast('Copied to clipboard', 'success');
    } catch {
      Utils.showToast('Could not copy', 'error');
    }
  },

  formData(obj) {
    const fd = new FormData();
    Object.entries(obj).forEach(([k, v]) => {
      if (v != null) fd.append(k, v);
    });
    return fd;
  },

  parseApiError(err) {
    if (!err) return 'Something went wrong';
    if (typeof err === 'string') return err;
    if (err.detail) {
      if (typeof err.detail === 'string') return err.detail;
      if (typeof err.detail === 'object' && err.detail.missing_skills) {
        return `${err.detail.detail || 'Missing skills'}: ${err.detail.missing_skills.join(', ')}`;
      }
      if (Array.isArray(err.detail)) {
        return err.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
      }
    }
    if (err.title) return err.detail || err.title;
    return 'Request failed';
  },

  getMissingSkillBadges(err) {
    const detail = err?.detail;
    if (detail && typeof detail === 'object' && Array.isArray(detail.missing_skills)) {
      return detail.missing_skills.filter(Boolean);
    }
    return null;
  },

  closeModal() {
    const modal = document.getElementById('app-modal');
    modal?.remove();
    document.body.classList.remove('hm-modal-open');
    if (Utils._modalEscHandler) {
      document.removeEventListener('keydown', Utils._modalEscHandler);
      Utils._modalEscHandler = null;
    }
    if (Utils._modalResolve) {
      Utils._modalResolve(null);
      Utils._modalResolve = null;
    }
  },

  confirm({
    title,
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
  } = {}) {
    return new Promise((resolve) => {
      Utils.closeModal();
      Utils._modalResolve = resolve;

      const messageHtml = message
        ? `<p class="hm-modal-message">${Utils.escapeHtml(message).replace(/\n/g, '<br>')}</p>`
        : '';
      const confirmClass = danger ? 'btn btn-danger' : 'btn btn-primary';

      const overlay = document.createElement('div');
      overlay.id = 'app-modal';
      overlay.className = 'modal-overlay hm-modal open';
      overlay.setAttribute('role', 'alertdialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = `
        <div class="hm-modal-panel">
          <button type="button" class="hm-modal-close" aria-label="Close">×</button>
          <div class="hm-modal-body">
            <h3 class="hm-modal-title">${Utils.escapeHtml(title)}</h3>
            ${messageHtml}
          </div>
          <div class="hm-modal-foot">
            <button type="button" class="btn btn-ghost hm-modal-dismiss">${Utils.escapeHtml(cancelLabel)}</button>
            <button type="button" class="${confirmClass} hm-modal-confirm">${Utils.escapeHtml(confirmLabel)}</button>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      document.body.classList.add('hm-modal-open');

      const finish = (value) => {
        Utils._modalResolve = null;
        Utils.closeModal();
        resolve(value);
      };

      overlay.querySelector('.hm-modal-close')?.addEventListener('click', () => finish(false));
      overlay.querySelector('.hm-modal-dismiss')?.addEventListener('click', () => finish(false));
      overlay.querySelector('.hm-modal-confirm')?.addEventListener('click', () => finish(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) finish(false);
      });

      Utils._modalEscHandler = (e) => {
        if (e.key === 'Escape') finish(false);
      };
      document.addEventListener('keydown', Utils._modalEscHandler);

      overlay.querySelector('.hm-modal-confirm')?.focus();
    });
  },

  prompt({
    title,
    message = '',
    placeholder = '',
    confirmLabel = 'Submit',
    cancelLabel = 'Cancel',
    required = true,
  } = {}) {
    return new Promise((resolve) => {
      Utils.closeModal();
      Utils._modalResolve = resolve;

      const overlay = document.createElement('div');
      overlay.id = 'app-modal';
      overlay.className = 'modal-overlay hm-modal open';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = `
        <div class="hm-modal-panel">
          <button type="button" class="hm-modal-close" aria-label="Close">×</button>
          <div class="hm-modal-body">
            <h3 class="hm-modal-title">${Utils.escapeHtml(title)}</h3>
            ${message ? `<p class="hm-modal-sub">${Utils.escapeHtml(message)}</p>` : ''}
            <textarea id="hm-prompt-input" class="hm-modal-input" rows="4"
              placeholder="${Utils.escapeHtml(placeholder)}"${required ? ' required' : ''}></textarea>
            <p class="hm-modal-error" id="hm-prompt-error" hidden></p>
          </div>
          <div class="hm-modal-foot">
            <button type="button" class="btn btn-ghost hm-modal-dismiss">${Utils.escapeHtml(cancelLabel)}</button>
            <button type="button" class="btn btn-primary hm-modal-confirm">${Utils.escapeHtml(confirmLabel)}</button>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      document.body.classList.add('hm-modal-open');

      const input = overlay.querySelector('#hm-prompt-input');
      const errorEl = overlay.querySelector('#hm-prompt-error');

      const finish = (value) => {
        Utils._modalResolve = null;
        Utils.closeModal();
        resolve(value);
      };

      const submit = () => {
        const value = input?.value?.trim() || '';
        if (required && !value) {
          if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent = 'Please enter a description.';
          }
          input?.focus();
          return;
        }
        finish(required ? value : (input?.value ?? ''));
      };

      overlay.querySelector('.hm-modal-close')?.addEventListener('click', () => finish(null));
      overlay.querySelector('.hm-modal-dismiss')?.addEventListener('click', () => finish(null));
      overlay.querySelector('.hm-modal-confirm')?.addEventListener('click', submit);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) finish(null);
      });
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
      });

      Utils._modalEscHandler = (e) => {
        if (e.key === 'Escape') finish(null);
      };
      document.addEventListener('keydown', Utils._modalEscHandler);

      input?.focus();
    });
  },

  showModal({ title, subtitle = '', body = '', primaryLabel = 'OK', primaryPath = '', dismissLabel = 'Close' }) {
    Utils.closeModal();

    const overlay = document.createElement('div');
    overlay.id = 'app-modal';
    overlay.className = 'modal-overlay hm-modal open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="hm-modal-panel">
        <button type="button" class="hm-modal-close" aria-label="Close">×</button>
        <div class="hm-modal-body">
          <h3 class="hm-modal-title">${Utils.escapeHtml(title)}</h3>
          ${subtitle ? `<p class="hm-modal-sub">${Utils.escapeHtml(subtitle)}</p>` : ''}
          ${body}
        </div>
        <div class="hm-modal-foot">
          <button type="button" class="btn btn-ghost hm-modal-dismiss">${Utils.escapeHtml(dismissLabel)}</button>
          ${primaryPath
            ? `<a class="btn btn-primary hm-modal-primary" data-nav="${Utils.escapeHtml(primaryPath)}">${Utils.escapeHtml(primaryLabel)}</a>`
            : `<button type="button" class="btn btn-primary hm-modal-primary">${Utils.escapeHtml(primaryLabel)}</button>`}
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('hm-modal-open');

    const close = () => Utils.closeModal();
    overlay.querySelector('.hm-modal-close')?.addEventListener('click', close);
    overlay.querySelector('.hm-modal-dismiss')?.addEventListener('click', close);
    overlay.querySelector('.hm-modal-primary:not([data-nav])')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    const primaryLink = overlay.querySelector('.hm-modal-primary[data-nav]');
    if (primaryLink) {
      primaryLink.addEventListener('click', (e) => {
        e.preventDefault();
        const path = primaryLink.getAttribute('data-nav');
        close();
        Router.navigate(path);
      });
    }

    Utils._modalEscHandler = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', Utils._modalEscHandler);
  },

  syncFileUpload(input) {
    if (!input) return;
    const nameEl = input.closest('.hm-file-upload')?.querySelector('.hm-file-upload-name');
    if (!nameEl) return;
    const placeholder = nameEl.dataset.placeholder || 'No file chosen';
    const file = input.files?.[0];
    nameEl.textContent = file?.name || placeholder;
    nameEl.classList.toggle('has-file', Boolean(file));
  },

  initFileUploads(root = document) {
    root.querySelectorAll('.hm-file-upload input[type="file"]').forEach((input) => {
      if (input.dataset.fileUiBound) return;
      input.dataset.fileUiBound = '1';
      input.addEventListener('change', () => Utils.syncFileUpload(input));
      Utils.syncFileUpload(input);
    });
  },

  showSkillBadgeModal(missingSkills) {
    const skills = (missingSkills || []).map(
      (name) => `<span class="hm-modal-skill">${Utils.escapeHtml(name)}</span>`,
    ).join('');
    Utils.showModal({
      title: 'Earn skill badges first',
      subtitle: 'Pass the quiz for each skill below before you can apply to this job.',
      body: `
        <div class="hm-modal-icon" aria-hidden="true">${Icons.shield}</div>
        <div class="hm-modal-skills">${skills}</div>`,
      primaryLabel: 'Take quizzes',
      primaryPath: '/freelancer/quizzes',
      dismissLabel: 'Not now',
    });
  },
};
