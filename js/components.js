const Components = {
  brandNameMark(name = CONFIG.SITE_NAME) {
    if (name === 'HireMeNow') {
      return `<span class="logo-name"><span class="logo-name-hire">Hire</span><span class="logo-name-accent">Me</span><span class="logo-name-now">Now</span></span>`;
    }
    return `<span class="logo-name">${Utils.escapeHtml(name)}</span>`;
  },

  siteLogo(options = {}) {
    const path = options.path || '/';
    const className = options.className || 'logo';
    const imgClass = options.imgClass || 'logo-img';
    const height = options.height || 36;
    const showName = options.showName !== false;
    const name = options.name || CONFIG.SITE_NAME || CONFIG.LOGO_ALT;
    return `
      <a class="${className}" data-nav="${path}" href="#${path}" aria-label="${Utils.escapeHtml(name)} home">
        <img src="${CONFIG.LOGO_URL}" alt="" class="${imgClass}" height="${height}" decoding="async">
        ${showName ? Components.brandNameMark(name) : ''}
      </a>`;
  },

  filterCountBadge(text, id = '') {
    const idAttr = id ? ` id="${Utils.escapeHtml(id)}"` : '';
    return `<span class="filter-count-badge"${idAttr}>${text}</span>`;
  },

  filterActiveChips(path, items, clearParams = {}) {
    if (!items.length) return '';
    return `
      <div class="filter-chips" role="list" aria-label="Active filters">
        ${items.map((item) => `
          <button type="button" class="filter-chip" role="listitem" data-nav="${Utils.buildHash(path, item.params).slice(1)}">
            <span>${Utils.escapeHtml(item.label)}</span>
            <span class="filter-chip-x" aria-hidden="true">×</span>
          </button>`).join('')}
        <button type="button" class="filter-chip filter-chip-reset" data-nav="${Utils.buildHash(path, clearParams).slice(1)}">Clear all</button>
      </div>`;
  },

  filterToolbar(options = {}) {
    const {
      id,
      path,
      search,
      selects = [],
      chips = [],
      clearParams = {},
      keepParams = {},
      autoApply = true,
    } = options;

    const keepAttr = Object.keys(keepParams).length
      ? ` data-filter-keep="${Utils.escapeHtml(JSON.stringify(keepParams))}"`
      : '';

    const searchField = search ? `
      <label class="filter-control filter-control-search">
        <span class="filter-control-icon" aria-hidden="true">${Icons.search}</span>
        <input type="search" name="${Utils.escapeHtml(search.name)}" placeholder="${Utils.escapeHtml(search.placeholder || 'Search…')}" value="${Utils.escapeHtml(search.value || '')}" autocomplete="off" aria-label="${Utils.escapeHtml(search.placeholder || 'Search')}">
      </label>` : '';

    const selectFields = selects.map((field) => `
      <label class="filter-control filter-control-select${field.value ? ' is-filtered' : ''}">
        <select name="${Utils.escapeHtml(field.name)}" aria-label="${Utils.escapeHtml(field.label || field.name)}">${field.options}</select>
      </label>`).join('');

    const chipsHtml = chips.length
      ? Components.filterActiveChips(path, chips, clearParams)
      : '';

    const form = `
      <form class="filter-toolbar" id="${Utils.escapeHtml(id)}" data-filter-form data-filter-path="${Utils.escapeHtml(path)}"${autoApply ? ' data-filter-auto' : ''}${keepAttr}>
        <div class="filter-cluster">
          ${searchField}
          ${selectFields}
        </div>
      </form>`;

    return { form, chips: chipsHtml };
  },

  filterToolbarBlock(options = {}) {
    const { form, chips } = Components.filterToolbar(options);
    return `${form}${chips}`;
  },

  filterBar(toolbar, meta = '') {
    const form = typeof toolbar === 'string' ? toolbar : toolbar.form;
    const chips = typeof toolbar === 'string' ? '' : (toolbar.chips || '');

    return `
      <section class="filter-bar">
        <div class="filter-bar-top">
          <div class="filter-bar-controls">${form}</div>
          ${meta ? `<div class="filter-bar-aside">${meta}</div>` : ''}
        </div>
        ${chips}
      </section>`;
  },

  pageHeader(title, subtitle = '', options = {}) {
    const showBrand = options.showBrand !== false;
    return `
      <header class="page-header">
        ${showBrand ? Components.siteLogo({ className: 'logo auth-logo', height: 44 }) : ''}
        <h1>${Utils.escapeHtml(title)}</h1>
        ${subtitle ? `<p>${Utils.escapeHtml(subtitle)}</p>` : ''}
      </header>`;
  },

  authPage({ title, subtitle = '', eyebrow = '', content = '', footer = '' }) {
    return `
      <div class="auth-page">
        <div class="auth-card">
          <header class="auth-header">
            ${Components.siteLogo({ className: 'logo auth-logo', height: 40, path: '/' })}
            ${eyebrow ? `<p class="auth-eyebrow">${Utils.escapeHtml(eyebrow)}</p>` : ''}
            <h1 class="auth-title">${Utils.escapeHtml(title)}</h1>
            ${subtitle ? `<p class="auth-subtitle">${Utils.escapeHtml(subtitle)}</p>` : ''}
          </header>
          ${content}
          ${footer ? `<footer class="auth-footer">${footer}</footer>` : ''}
        </div>
        <p class="auth-back-home"><a data-nav="/">← Back to home</a></p>
      </div>`;
  },

  authField(label, name, type = 'text', value = '', attrs = '', hint = '') {
    const id = `field-${name}`;
    let control = '';
    if (type === 'select') {
      control = `<select id="${id}" name="${name}" class="auth-input" ${attrs}>${value}</select>`;
    } else if (type === 'textarea') {
      control = `<textarea id="${id}" name="${name}" class="auth-input" ${attrs}>${Utils.escapeHtml(value)}</textarea>`;
    } else {
      control = `<input type="${type}" id="${id}" name="${name}" class="auth-input" value="${Utils.escapeHtml(value)}" ${attrs}>`;
    }
    return `
      <div class="auth-field">
        <label class="auth-label" for="${id}">${Utils.escapeHtml(label)}</label>
        ${control}
        ${hint ? `<p class="auth-hint">${Utils.escapeHtml(hint)}</p>` : ''}
      </div>`;
  },

  authRolePicker(name = 'role', value = 'freelancer') {
    const options = [
      { id: 'freelancer', label: 'Freelancer', hint: 'Find work' },
      { id: 'client', label: 'Client', hint: 'Hire talent' },
    ];
    return `
      <div class="auth-field">
        <span class="auth-label">I am a</span>
        <div class="auth-role-picker" role="radiogroup" aria-label="Account type">
          ${options.map((opt) => `
            <label class="auth-role-option ${opt.id === value ? 'is-active' : ''}">
              <input type="radio" name="${name}" value="${opt.id}" ${opt.id === value ? 'checked' : ''}>
              <span class="auth-role-label">${Utils.escapeHtml(opt.label)}</span>
              <span class="auth-role-hint">${Utils.escapeHtml(opt.hint)}</span>
            </label>`).join('')}
        </div>
      </div>`;
  },

  feedTabs(tabs, active) {
    return `
      <nav class="feed-tabs" aria-label="Feed">
        ${tabs.map((t) => `
          <button type="button" class="feed-tab ${t.id === active ? 'active' : ''}" data-tab="${t.id}">
            ${Utils.escapeHtml(t.label)}
          </button>`).join('')}
      </nav>`;
  },

  feedActions() {
    return `
      <div class="feed-icons">
        <button type="button" class="feed-icon-btn" aria-label="More">${Icons.more}</button>
      </div>`;
  },

  pagination(page, limit, total, basePath, extraParams = {}) {
    const pages = Math.ceil(total / limit) || 1;
    if (pages <= 1) return '';
    let html = '<nav class="pagination">';
    for (let p = 1; p <= pages; p++) {
      html += `<a href="${Utils.buildHash(basePath, { ...extraParams, page: p })}" class="page-link ${p === page ? 'active' : ''}">${p}</a>`;
    }
    html += '</nav>';
    return html;
  },

  jobGridHeader({ title = 'Recommended jobs', count = 0 } = {}) {
    return `
      <div class="job-grid-header">
        <div class="job-grid-header-left">
          <h2 class="job-grid-title">${Utils.escapeHtml(title)}</h2>
          ${count > 0 ? `<span class="job-grid-count">${count}</span>` : ''}
        </div>
      </div>`;
  },

  jobGridCard(job) {
    const company = job.company_name || 'Company';
    const skills = (job.required_skills || []).slice(0, 3);
    const tags = skills.map((s) => s.name);
    const salary = Utils.formatMoney(job.salary_amount, job.salary_negotiable);
    const payLabel = salary === 'Negotiable' ? 'Negotiable' : salary !== '—' ? salary : 'Competitive';
    const media = job.thumbnail_url
      ? `<img src="${Utils.escapeHtml(Utils.resolveMediaUrl(job.thumbnail_url))}" alt="" class="job-card-thumb" loading="lazy">`
      : `<div class="job-card-thumb job-card-thumb-placeholder" aria-hidden="true">
          <span class="job-card-thumb-letter">${Utils.escapeHtml(Utils.initial(company))}</span>
        </div>`;

    return `
      <article class="job-grid-card" data-job-id="${job.id}">
        <div class="job-card-media">
          <a class="job-card-media-link" data-nav="/jobs/${job.id}" tabindex="-1" aria-hidden="true">${media}</a>
        </div>
        <div class="job-card-body">
          <div class="job-card-meta">
            <time class="job-card-date">${Utils.formatDateCard(job.posted_at)}</time>
            <span class="job-card-status">${Utils.escapeHtml(Utils.formatJobStatus(job.status || 'open'))}</span>
          </div>
          <span class="job-card-company">${Utils.escapeHtml(company)}</span>
          <h3 class="job-card-title">
            <a data-nav="/jobs/${job.id}">${Utils.escapeHtml(job.title)}</a>
          </h3>
          ${tags.length ? `
            <div class="job-card-tags">
              ${tags.map((t) => `<span class="job-card-tag">${Utils.escapeHtml(t)}</span>`).join('')}
            </div>` : ''}
          <div class="job-card-foot">
            <strong class="job-card-salary">${Utils.escapeHtml(payLabel)}</strong>
            <a class="job-card-details-btn" data-nav="/jobs/${job.id}">Details</a>
          </div>
        </div>
      </article>`;
  },

  jobGrid(jobs, options = {}) {
    if (!jobs?.length) {
      return Components.emptyState(options.emptyMessage || 'No jobs found');
    }
    return `
      ${options.showHeader !== false ? Components.jobGridHeader({
        title: options.title,
        count: options.count ?? jobs.length,
      }) : ''}
      <div class="job-grid">${jobs.map(Components.jobGridCard).join('')}</div>`;
  },

  jobDetailProse(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return '';
    const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
    const isList = lines.length > 1 && lines.every((l) => /^[-•*]\s?/.test(l) || /^\d+\.\s?/.test(l));
    if (isList) {
      return `<ul class="job-detail-list">${lines.map((l) => {
        const item = l.replace(/^[-•*]\s?/, '').replace(/^\d+\.\s?/, '');
        return `<li>${Utils.escapeHtml(item)}</li>`;
      }).join('')}</ul>`;
    }
    if (lines.length > 1) {
      return lines.map((p) => `<p>${Utils.escapeHtml(p)}</p>`).join('');
    }
    return `<p>${Utils.escapeHtml(trimmed)}</p>`;
  },

  jobDetailSection(title, icon, content) {
    if (!content) return '';
    return `
      <section class="job-detail-block">
        <header class="job-detail-block-head">
          <span class="job-detail-block-icon" aria-hidden="true">${icon}</span>
          <h2>${Utils.escapeHtml(title)}</h2>
        </header>
        <div class="job-detail-prose">${content}</div>
      </section>`;
  },

  jobPartyActions(job, user, { compact = false } = {}) {
    if (!job || !user) return '';
    const isClient = user.role === 'client' && String(user.id) === String(job.client_id);
    const isHiredFreelancer = user.role === 'freelancer' && job.viewer_is_hired;
    if (!isClient && !isHiredFreelancer) return '';

    const signalled = Store.hasSignalledCompletion(job.id, job);
    const reviewed = Store.hasSubmittedReview(job.id, job);
    const btnClass = compact ? 'btn btn-sm' : 'btn btn-block';
    const doneClass = `${btnClass} is-done`;
    const parts = [];

    if (job.status === 'completed') {
      parts.push(`<span class="job-action-status">${Utils.statusBadge('completed')}</span>`);
    }

    if (['filled', 'pending_confirmation'].includes(job.status)) {
      if (signalled) {
        parts.push(`<button type="button" class="${doneClass}" disabled aria-disabled="true">Completion signalled ✓</button>`);
      } else {
        parts.push(`<button type="button" class="${btnClass}${compact ? ' btn-primary' : ''} complete-job" data-job-id="${job.id}">Mark job complete</button>`);
      }
    }

    if (job.viewer_can_submit_review) {
      if (reviewed) {
        parts.push(`<button type="button" class="${doneClass}" disabled aria-disabled="true">Review submitted ✓</button>`);
      } else {
        parts.push(`<a class="${btnClass} btn-primary" data-nav="/jobs/${job.id}/review">Submit review</a>`);
      }
    } else if (job.status === 'completed' && reviewed) {
      parts.push(`<button type="button" class="${doneClass}" disabled aria-disabled="true">Review published ✓</button>`);
    }

    return parts.join('');
  },

  jobDetailPage(job, actionsHtml = '') {
    const company = job.company_name || 'Company';
    const salary = Utils.formatMoney(job.salary_amount, job.salary_negotiable);
    const payLabel = salary === 'Negotiable' ? 'Negotiable' : salary !== '—' ? salary : 'Competitive';
    const statusLabel = Utils.formatJobStatus(job.status || 'open');
    const skills = (job.required_skills || [])
      .map((s) => `<span class="job-detail-skill">${Utils.escapeHtml(s.name)}</span>`)
      .join('');

    const heroMedia = job.thumbnail_url
      ? `<img class="job-detail-hero-img" src="${Utils.escapeHtml(Utils.resolveMediaUrl(job.thumbnail_url))}" alt="">`
      : `<div class="job-detail-hero-placeholder" aria-hidden="true">
          <span>${Utils.escapeHtml(Utils.initial(company))}</span>
        </div>`;

    const aboutContent = Components.jobDetailProse(job.about_role || job.description);
    const responsibilities = Components.jobDetailProse(job.responsibilities);
    const benefits = Components.jobDetailProse(job.other_benefits);
    const companyAbout = Components.jobDetailProse(job.company_description);

    const reqItems = [];
    if (job.requirements_education) {
      reqItems.push({ label: 'Education', value: job.requirements_education });
    }
    if (job.requirements_experience) {
      reqItems.push({ label: 'Experience', value: job.requirements_experience });
    }
    if (job.requirements_additional) {
      reqItems.push({ label: 'Additional', value: job.requirements_additional });
    }
    const requirementsBlock = reqItems.length
      ? `<section class="job-detail-block">
          <header class="job-detail-block-head">
            <span class="job-detail-block-icon" aria-hidden="true">${Components._jobDetailIcons.check}</span>
            <h2>Requirements</h2>
          </header>
          <div class="job-detail-req-grid">
            ${reqItems.map((item) => `
              <div class="job-detail-req-card">
                <span class="job-detail-req-label">${Utils.escapeHtml(item.label)}</span>
                <p>${Utils.escapeHtml(item.value)}</p>
              </div>`).join('')}
          </div>
        </section>`
      : '';

    const legacyMeta = [];
    if (job.timeline?.trim()) legacyMeta.push({ label: 'Timeline', value: job.timeline });
    if (job.budget != null && job.budget !== '') {
      legacyMeta.push({ label: 'Budget', value: `$${Number(job.budget).toLocaleString()}` });
    }
    if (job.deliverables?.trim()) legacyMeta.push({ label: 'Deliverables', value: job.deliverables });

    const factsRows = [
      { label: 'Compensation', value: payLabel, highlight: true },
      { label: 'Status', value: statusLabel },
      { label: 'Posted', value: Utils.formatDate(job.posted_at) },
      ...legacyMeta.map((m) => ({ label: m.label, value: m.value })),
    ];

    return `
      <article class="job-detail">
        <nav class="job-detail-nav">
          <a class="job-detail-back" data-nav="/jobs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
            Back to jobs
          </a>
        </nav>

        <div class="job-detail-hero">
          ${heroMedia}
          <div class="job-detail-hero-shade"></div>
          <div class="job-detail-hero-content">
            <div class="job-detail-hero-pills">
              <span class="job-detail-pill job-detail-pill-status job-detail-pill-${Utils.escapeHtml(job.status || 'open')}">${Utils.escapeHtml(statusLabel)}</span>
              <span class="job-detail-pill">${Utils.escapeHtml(payLabel)}</span>
            </div>
            <h1 class="job-detail-title">${Utils.escapeHtml(job.title)}</h1>
            <p class="job-detail-company">
              <span class="job-detail-company-avatar" aria-hidden="true">${Utils.escapeHtml(Utils.initial(company))}</span>
              ${Utils.escapeHtml(company)}
            </p>
          </div>
        </div>

        <div class="job-detail-layout">
          <div class="job-detail-main">
            ${skills ? `<div class="job-detail-skills">${skills}</div>` : ''}
            ${Components.jobDetailSection('About the role', Components._jobDetailIcons.briefcase, aboutContent)}
            ${Components.jobDetailSection('Responsibilities', Components._jobDetailIcons.list, responsibilities)}
            ${requirementsBlock}
            ${Components.jobDetailSection('Benefits', Components._jobDetailIcons.gift, benefits)}
            ${companyAbout ? `
              <section class="job-detail-company-card">
                <div class="job-detail-company-card-head">
                  <span class="job-detail-company-card-avatar" aria-hidden="true">${Utils.escapeHtml(Utils.initial(company))}</span>
                  <div>
                    <h2>About ${Utils.escapeHtml(company)}</h2>
                    <p>Learn more about who you'll work with</p>
                  </div>
                </div>
                <div class="job-detail-prose">${companyAbout}</div>
              </section>` : ''}
          </div>

          <aside class="job-detail-aside">
            <div class="job-detail-facts">
              <h3 class="job-detail-facts-title">At a glance</h3>
              <dl class="job-detail-facts-list">
                ${factsRows.map((row) => `
                  <div class="job-detail-fact${row.highlight ? ' job-detail-fact-highlight' : ''}">
                    <dt>${Utils.escapeHtml(row.label)}</dt>
                    <dd>${Utils.escapeHtml(row.value)}</dd>
                  </div>`).join('')}
              </dl>
              ${skills ? `
                <div class="job-detail-facts-skills">
                  <span class="job-detail-facts-skills-label">Skills</span>
                  <div class="job-detail-skills job-detail-skills-compact">${skills}</div>
                </div>` : ''}
              ${actionsHtml ? `<div class="job-detail-actions">${actionsHtml}</div>` : ''}
            </div>
          </aside>
        </div>
      </article>`;
  },

  _jobDetailIcons: {
    briefcase: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="7" width="18" height="13" rx="1.5"/><path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7"/></svg>',
    list: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1.25" fill="currentColor"/><circle cx="4" cy="12" r="1.25" fill="currentColor"/><circle cx="4" cy="18" r="1.25" fill="currentColor"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
    gift: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M12 8c-2-2.5-4-3-6-1s0 4 3 4h3M12 8c2-2.5 4-3 6-1s0 4-3 4h-3"/></svg>',
  },

  feedJobItem(job) {
    const thumb = job.thumbnail_url
      ? `<img src="${Utils.escapeHtml(Utils.resolveMediaUrl(job.thumbnail_url))}" alt="" class="feed-thumb" loading="lazy">`
      : '';
    const excerpt = (job.description || job.about_role || job.deliverables || '').trim();
    const excerptShort = excerpt.slice(0, 120);
    const company = job.company_name || 'Company';
    const skills = (job.required_skills || []).slice(0, 2).map((s) => s.name);
    const byline = [company, ...skills].filter(Boolean).join(' · ');
    const salary = Utils.formatMoney(job.salary_amount, job.salary_negotiable);
    const hasSalary = salary && salary !== '—';

    return `
      <article class="feed-item job-item">
        <div class="feed-content">
          <div class="feed-meta-row">
            <span class="feed-avatar" aria-hidden="true">${Utils.escapeHtml(Utils.initial(company))}</span>
            <span class="feed-byline">${Utils.escapeHtml(byline)}</span>
          </div>
          <h2 class="feed-title">
            <a data-nav="/jobs/${job.id}">${Utils.escapeHtml(job.title)}</a>
          </h2>
          ${excerptShort ? `<p class="feed-excerpt">${Utils.escapeHtml(excerptShort)}${excerpt.length > 120 ? '…' : ''}</p>` : ''}
          <footer class="feed-footer">
            <div class="feed-footer-left">
              <time class="feed-date">${Utils.formatDateShort(job.posted_at)}</time>
              ${hasSalary ? `<span class="feed-dot" aria-hidden="true">·</span><span class="feed-salary">${Utils.escapeHtml(salary)}</span>` : ''}
              <span class="feed-status">${Utils.statusBadge(job.status)}</span>
            </div>
            ${Components.feedActions()}
          </footer>
        </div>
        <a class="feed-thumb-wrap ${thumb ? '' : 'is-empty'}" data-nav="/jobs/${job.id}" aria-label="View ${Utils.escapeHtml(job.title)}">
          ${thumb || '<span class="feed-thumb-placeholder" aria-hidden="true"></span>'}
        </a>
      </article>`;
  },

  adminJobFeedItem(item) {
    const job = item.job;
    const thumb = job.thumbnail_url
      ? `<img src="${Utils.escapeHtml(Utils.resolveMediaUrl(job.thumbnail_url))}" alt="" class="feed-thumb" loading="lazy">`
      : '';
    const excerpt = (job.description || job.deliverables || '').trim();
    const excerptShort = excerpt.slice(0, 120);
    const company = job.company_name || 'Company';
    const byline = [company, `${item.application_count} applicants`].join(' · ');

    return `
      <article class="feed-item job-item">
        <div class="feed-content">
          <div class="feed-meta-row">
            <span class="feed-avatar" aria-hidden="true">${Utils.escapeHtml(Utils.initial(company))}</span>
            <span class="feed-byline">${Utils.escapeHtml(byline)}</span>
          </div>
          <h2 class="feed-title">
            <a data-nav="/admin/jobs/${job.id}/applicants">${Utils.escapeHtml(job.title)}</a>
          </h2>
          ${excerptShort ? `<p class="feed-excerpt">${Utils.escapeHtml(excerptShort)}${excerpt.length > 120 ? '…' : ''}</p>` : ''}
          <footer class="feed-footer">
            <div class="feed-footer-left">
              <time class="feed-date">${Utils.formatDateShort(job.posted_at)}</time>
              <span class="feed-status">${Utils.statusBadge(job.status)}</span>
              ${item.pending_count > 0 ? `<span class="feed-pending">${item.pending_count} pending</span>` : ''}
            </div>
            <a class="btn btn-sm btn-ghost feed-view-btn" data-nav="/admin/jobs/${job.id}/applicants">View</a>
          </footer>
        </div>
        <a class="feed-thumb-wrap ${thumb ? '' : 'is-empty'}" data-nav="/admin/jobs/${job.id}/applicants" aria-hidden="true" tabindex="-1">
          ${thumb || '<span class="feed-thumb-placeholder"></span>'}
        </a>
      </article>`;
  },

  jobCard(job) {
    return Components.jobGridCard(job);
  },

  freelancerCard(f) {
    const avatarInner = f.profile_picture_url
      ? `<img src="${Utils.escapeHtml(Utils.resolveMediaUrl(f.profile_picture_url))}" alt="">`
      : Utils.escapeHtml(Utils.initial(f.display_name));
    const skills = (f.skills || []).slice(0, 3).map(
      (s) => `<span class="tag">${Utils.escapeHtml(s.name)}</span>`,
    ).join('');

    return `
      <article class="talent-card" data-nav="/freelancers/${f.profile_id}">
        <div class="talent-card-top">
          <div class="talent-card-avatar">${avatarInner}</div>
          <div>
            <h3 class="talent-card-name">${Utils.escapeHtml(f.display_name)}</h3>
            <p class="talent-card-rating">${Utils.stars(f.avg_rating)} · ${f.review_count} reviews</p>
          </div>
        </div>
        <p class="talent-card-meta">${Utils.escapeHtml(f.availability_status || 'Available')}</p>
        ${skills ? `<div class="talent-card-skills">${skills}</div>` : ''}
      </article>`;
  },

  talentGrid(freelancers, options = {}) {
    if (!freelancers?.length) return Components.emptyState(options.emptyMessage || 'No freelancers found');
    return `<div class="portal-talent-grid">${freelancers.map(Components.freelancerCard).join('')}</div>`;
  },

  freelancerDetailPage(f, reviews = [], actionsHtml = '') {
    const available = f.availability_status === 'Available for Work';
    const avatar = f.profile_picture_url
      ? `<img class="talent-detail-avatar-img" src="${Utils.escapeHtml(Utils.resolveMediaUrl(f.profile_picture_url))}" alt="">`
      : `<span class="talent-detail-avatar-letter">${Utils.escapeHtml(Utils.initial(f.display_name))}</span>`;

    const skills = (f.skills || [])
      .map((s) => `<span class="talent-detail-skill">${Utils.escapeHtml(s.name)}</span>`)
      .join('');

    const socialLinks = [
      f.linkedin_url && { label: 'LinkedIn', url: f.linkedin_url },
      f.github_url && { label: 'GitHub', url: f.github_url },
      f.portfolio_url && { label: 'Portfolio', url: f.portfolio_url },
    ].filter(Boolean);

    const portfolioItems = [
      ...(f.portfolio_links || []).map((link) => ({
        label: link.label,
        url: link.url,
      })),
    ];

    const contactItems = [
      f.contact_email && {
        label: 'Email',
        url: `mailto:${f.contact_email}`,
        text: f.contact_email,
        primary: true,
      },
      f.resume_url && {
        label: 'Resume',
        url: Utils.resolveMediaUrl(f.resume_url),
        text: 'Download PDF',
        outline: true,
      },
    ].filter(Boolean);

    const factsRows = [
      { label: 'Availability', value: f.availability_status || '—', highlight: available },
      { label: 'Rating', value: `${Number(f.avg_rating || 0).toFixed(1)} / 5` },
      { label: 'Reviews', value: String(f.review_count || 0) },
      { label: 'Skills verified', value: String((f.skills || []).length) },
    ];
    if (f.updated_at) {
      factsRows.push({ label: 'Profile updated', value: Utils.formatDate(f.updated_at) });
    }

    const reviewHtml = reviews.length
      ? reviews.map((r) => `
          <div class="talent-detail-review">
            <p class="talent-detail-review-stars">${Utils.stars(r.rating)}</p>
            <p class="talent-detail-review-body">${Utils.escapeHtml(r.body)}</p>
            <small>${Utils.formatDate(r.published_at || r.submitted_at)}</small>
          </div>`).join('')
      : `<p class="talent-detail-empty">No published reviews yet.</p>`;

    return `
      <article class="talent-detail">
        <nav class="talent-detail-nav">
          <a class="talent-detail-back" data-nav="/freelancers">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
            Back to talent
          </a>
        </nav>

        <header class="talent-detail-hero">
          <div class="talent-detail-avatar">${avatar}</div>
          <div class="talent-detail-hero-body">
            <div class="talent-detail-pills">
              <span class="talent-detail-pill talent-detail-pill-${available ? 'available' : 'unavailable'}">${Utils.escapeHtml(f.availability_status || 'Unknown')}</span>
              <span class="talent-detail-pill">${Utils.escapeHtml(`${Number(f.avg_rating || 0).toFixed(1)}`)} ★ · ${f.review_count || 0} reviews</span>
            </div>
            <h1 class="talent-detail-name">${Utils.escapeHtml(f.display_name)}</h1>
            ${f.bio ? `<p class="talent-detail-tagline">${Utils.escapeHtml(f.bio)}</p>` : ''}
          </div>
        </header>

        <div class="talent-detail-layout">
          <div class="talent-detail-main">
            <section class="talent-detail-block">
              <header class="talent-detail-block-head">
                <span class="talent-detail-block-icon" aria-hidden="true">${Components._jobDetailIcons.briefcase}</span>
                <h2>About</h2>
              </header>
              <div class="talent-detail-prose">
                ${f.bio ? `<p>${Utils.escapeHtml(f.bio)}</p>` : '<p class="talent-detail-empty">This freelancer has not added a bio yet.</p>'}
              </div>
            </section>

            <section class="talent-detail-block">
              <header class="talent-detail-block-head">
                <span class="talent-detail-block-icon" aria-hidden="true">${Components._jobDetailIcons.check}</span>
                <h2>Verified skills</h2>
              </header>
              ${skills
                ? `<div class="talent-detail-skills">${skills}</div>`
                : '<p class="talent-detail-empty">No verified skills yet — earned by passing skill quizzes.</p>'}
            </section>

            ${socialLinks.length || portfolioItems.length ? `
              <section class="talent-detail-block">
                <header class="talent-detail-block-head">
                  <span class="talent-detail-block-icon" aria-hidden="true">${Components._jobDetailIcons.list}</span>
                  <h2>Portfolio & links</h2>
                </header>
                <div class="talent-detail-link-grid">
                  ${socialLinks.map((link) => `
                    <a class="talent-detail-link-card" href="${Utils.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                      <span class="talent-detail-link-label">${Utils.escapeHtml(link.label)}</span>
                      <span class="talent-detail-link-url">${Utils.escapeHtml(link.url)}</span>
                    </a>`).join('')}
                  ${portfolioItems.map((link) => `
                    <a class="talent-detail-link-card" href="${Utils.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                      <span class="talent-detail-link-label">${Utils.escapeHtml(link.label)}</span>
                      <span class="talent-detail-link-url">${Utils.escapeHtml(link.url)}</span>
                    </a>`).join('')}
                </div>
              </section>` : ''}

            <section class="talent-detail-block talent-detail-reviews-block">
              <header class="talent-detail-block-head">
                <span class="talent-detail-block-icon" aria-hidden="true">${Components._jobDetailIcons.gift}</span>
                <h2>Client reviews (${reviews.length})</h2>
              </header>
              <div class="talent-detail-reviews">${reviewHtml}</div>
            </section>
          </div>

          <aside class="talent-detail-aside">
            <div class="talent-detail-facts">
              <h3 class="talent-detail-facts-title">Profile overview</h3>
              <dl class="talent-detail-facts-list">
                ${factsRows.map((row) => `
                  <div class="talent-detail-fact${row.highlight ? ' talent-detail-fact-highlight' : ''}">
                    <dt>${Utils.escapeHtml(row.label)}</dt>
                    <dd>${Utils.escapeHtml(row.value)}</dd>
                  </div>`).join('')}
              </dl>

              <div class="talent-detail-contact">
                <h4>Contact & files</h4>
                ${contactItems.length
                  ? contactItems.map((item) => `
                    <a
                      class="talent-detail-contact-btn${item.outline ? ' talent-detail-contact-btn-outline' : ''}"
                      href="${Utils.escapeHtml(item.url)}"
                      ${item.url.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener noreferrer"'}
                    >
                      <span class="talent-detail-contact-btn-label">${Utils.escapeHtml(item.label)}</span>
                      <span class="talent-detail-contact-btn-text">${Utils.escapeHtml(item.text)}</span>
                    </a>`).join('')
                  : '<p class="talent-detail-empty">No contact details or files yet.</p>'}
              </div>

              ${actionsHtml ? `<div class="talent-detail-actions">${actionsHtml}</div>` : ''}
            </div>
          </aside>
        </div>
      </article>`;
  },

  courseCardMedia(course) {
    const thumbUrl = Utils.getCourseThumbnail(course);
    const isYoutube = Utils.isYoutubeUrl(course.link);
    const link = Utils.escapeHtml(course.link);
    const title = Utils.escapeHtml(course.name);
    const media = thumbUrl
      ? `<img src="${Utils.escapeHtml(thumbUrl)}" alt="" class="course-card-img" loading="lazy">`
      : `<div class="course-card-img course-card-img-placeholder" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor" stroke="none"/></svg>
        </div>`;
    const ytBadge = isYoutube
      ? `<span class="course-card-yt-badge" aria-label="YouTube video">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"/><path fill="#fff" d="M9.8 15.5V8.5l6.2 3.5-6.2 3.5z"/></svg>
        </span>`
      : '';
    return `<a class="course-card-media" href="${link}" target="_blank" rel="noopener noreferrer">${media}${ytBadge}</a>`;
  },

  courseCard(c) {
    const skill = Utils.escapeHtml(c.skill_name || 'Course');
    const name = Utils.escapeHtml(c.name);
    const link = Utils.escapeHtml(c.link);
    return `
      <article class="course-card">
        ${Components.courseCardMedia(c)}
        <div class="course-card-body">
          <span class="course-card-skill">${skill}</span>
          <h3 class="course-card-title"><a href="${link}" target="_blank" rel="noopener noreferrer">${name}</a></h3>
          <div class="course-card-foot">
            <a class="course-card-btn" href="${link}" target="_blank" rel="noopener noreferrer">Open course</a>
          </div>
        </div>
      </article>`;
  },

  courseGrid(courses, options = {}) {
    if (!courses?.length) return Components.emptyState(options.emptyMessage || 'No courses available');
    return `<div class="course-grid">${courses.map(Components.courseCard).join('')}</div>`;
  },

  recommendedCoursesBlock(courses) {
    if (!courses?.length) return '';
    return `
      <div class="recommended-courses">
        <h4 class="recommended-courses-title">Recommended courses</h4>
        ${Components.courseGrid(courses)}
      </div>`;
  },

  rightRail(jobs, freelancers) {
    const jobItems = (jobs || []).map((job) => `
      <div class="rail-item">
        <div class="rail-item-icon">${Utils.escapeHtml(Utils.initial(job.company_name))}</div>
        <div class="rail-item-body">
          <div class="rail-item-meta">${Utils.escapeHtml(job.company_name || 'Company')}</div>
          <a class="rail-item-title" data-nav="/jobs/${job.id}">${Utils.escapeHtml(job.title)}</a>
          <div class="rail-item-date">${Utils.formatDateShort(job.posted_at)}</div>
        </div>
      </div>`).join('');

    const talentItems = (freelancers || []).map((f) => `
      <div class="rail-item">
        <div class="rail-item-icon">
          ${f.profile_picture_url
            ? `<img src="${Utils.escapeHtml(Utils.resolveMediaUrl(f.profile_picture_url))}" alt="">`
            : Utils.escapeHtml(Utils.initial(f.display_name))}
        </div>
        <div class="rail-item-body">
          <div class="rail-item-meta">Freelancer</div>
          <a class="rail-item-title" data-nav="/freelancers/${f.profile_id}">${Utils.escapeHtml(f.display_name)}</a>
          <div class="rail-item-date">${Utils.stars(f.avg_rating)}</div>
        </div>
      </div>`).join('');

    return `
      <div class="rail-block">
        <h2 class="rail-title">Featured jobs</h2>
        ${jobItems || '<p class="hint">No jobs yet</p>'}
      </div>
      <div class="rail-block">
        <h2 class="rail-title">Top talent</h2>
        ${talentItems || '<p class="hint">No freelancers yet</p>'}
      </div>
      <div class="rail-cta">
        <div class="rail-brand">
          <img src="${CONFIG.LOGO_URL}" alt="" class="rail-logo" height="36" decoding="async">
          ${Components.brandNameMark()}
        </div>
        <p class="rail-cta-text">Find talent, verify skills, hire faster.</p>
        <ul>
          <li><a data-nav="/register">Post a job and find talent</a></li>
          <li><a data-nav="/freelancers">Browse skilled freelancers</a></li>
        </ul>
      </div>`;
  },

  adminNav(activePath, metrics = {}) {
    const pending = metrics.pendingReports || 0;
    const links = [
      { path: '/admin', label: 'Dashboard' },
      { path: '/admin/jobs', label: 'Jobs' },
      { path: '/admin/skills', label: 'Skills' },
      { path: '/admin/courses', label: 'Courses' },
      { path: '/admin/reports', label: 'Reports', badge: pending > 0 ? pending : null },
      { path: '/admin/users', label: 'Users' },
    ];

    const resolveActive = (path) => {
      if (path === '/admin') return activePath === '/admin';
      if (path === '/admin/jobs') {
        return activePath === '/admin/jobs' || activePath.startsWith('/admin/jobs/');
      }
      return activePath === path || activePath.startsWith(`${path}/`);
    };

    return `
      <nav class="admin-nav" aria-label="Admin sections">
        ${links.map((link) => `
          <a class="admin-nav-link ${resolveActive(link.path) ? 'active' : ''}" data-nav="${link.path}">
            ${Utils.escapeHtml(link.label)}
            ${link.badge ? `<span class="admin-nav-badge">${link.badge}</span>` : ''}
          </a>`).join('')}
      </nav>`;
  },

  adminConsoleHeader(title, subtitle = '') {
    return `
      <header class="admin-page-head">
        <h1>${Utils.escapeHtml(title)}</h1>
        ${subtitle ? `<p class="admin-console-sub">${Utils.escapeHtml(subtitle)}</p>` : ''}
      </header>`;
  },

  adminComposePanel({ label = '', title, body, footer = '', className = '', id = '' }) {
    return `
      <section class="admin-compose-panel ${className}" ${id ? `id="${id}"` : ''} ${title ? `aria-labelledby="${id || 'compose'}-title"` : ''}>
        ${label || title ? `
          <header class="admin-compose-head">
            ${label ? `<p class="admin-compose-label">${Utils.escapeHtml(label)}</p>` : ''}
            ${title ? `<h2 class="admin-compose-title" id="${id || 'compose'}-title">${Utils.escapeHtml(title)}</h2>` : ''}
          </header>` : ''}
        <div class="admin-compose-body">${body}</div>
        ${footer ? `<div class="admin-compose-foot">${footer}</div>` : ''}
      </section>`;
  },

  adminSecondaryPanel({ title, meta = '', linkHref = '', linkLabel = '', body, id = '' }) {
    return `
      <section class="admin-panel admin-panel-secondary" ${id ? `id="${id}"` : ''}>
        <div class="admin-panel-head">
          <h2${id ? ` id="${id}-title"` : ''}>${Utils.escapeHtml(title)}</h2>
          ${meta ? `<span class="admin-panel-meta">${Utils.escapeHtml(meta)}</span>` : ''}
          ${linkHref ? `<a class="admin-panel-link" data-nav="${linkHref}">${Utils.escapeHtml(linkLabel || 'View all →')}</a>` : ''}
        </div>
        ${body}
      </section>`;
  },

  adminKpiCard(label, value, hint = '') {
    return `
      <div class="admin-kpi">
        <span class="admin-kpi-label">${Utils.escapeHtml(label)}</span>
        <span class="admin-kpi-value">${Utils.escapeHtml(String(value))}</span>
        ${hint ? `<span class="admin-kpi-hint">${Utils.escapeHtml(hint)}</span>` : ''}
      </div>`;
  },

  freelancerDashboardHero(profile, stats = {}) {
    const available = profile.availability_status === 'Available for Work';
    const avatarInner = profile.profile_picture_url
      ? `<img class="freelancer-dash-avatar-img" src="${Utils.escapeHtml(Utils.resolveMediaUrl(profile.profile_picture_url))}" alt="">`
      : `<span class="freelancer-dash-avatar-letter">${Utils.escapeHtml(Utils.initial(profile.display_name))}</span>`;
    const bio = String(profile.bio || '').trim();
    const bioSnippet = bio.length > 140 ? `${bio.slice(0, 137)}…` : bio;
    const stars = Utils.stars(profile.avg_rating);

    return `
      <section class="freelancer-dash-hero" aria-label="Dashboard overview">
        <div class="freelancer-dash-hero-glow" aria-hidden="true"></div>
        <div class="freelancer-dash-hero-inner">
          <div class="freelancer-dash-identity">
            <div class="freelancer-dash-avatar" aria-hidden="true">${avatarInner}</div>
            <div class="freelancer-dash-intro">
              <p class="freelancer-dash-eyebrow">Your workspace</p>
              <h1 class="freelancer-dash-name">${Utils.escapeHtml(profile.display_name)}</h1>
              <div class="freelancer-dash-status ${available ? 'is-available' : 'is-unavailable'}">
                <span class="freelancer-dash-status-dot" aria-hidden="true"></span>
                ${Utils.escapeHtml(profile.availability_status || 'Available for Work')}
              </div>
              ${bioSnippet ? `<p class="freelancer-dash-bio">${Utils.escapeHtml(bioSnippet)}</p>` : ''}
            </div>
            <a class="btn btn-sm freelancer-dash-edit-btn" data-nav="/freelancer/profile">Edit profile</a>
          </div>
          <div class="freelancer-dash-stats">
            <div class="freelancer-dash-stat">
              <span class="freelancer-dash-stat-label">Rating</span>
              <span class="freelancer-dash-stat-value freelancer-dash-stat-stars">${stars}</span>
              <span class="freelancer-dash-stat-hint">${profile.review_count || 0} reviews</span>
            </div>
            <div class="freelancer-dash-stat">
              <span class="freelancer-dash-stat-label">Skill badges</span>
              <span class="freelancer-dash-stat-value">${stats.earnedSkills ?? 0}</span>
              <span class="freelancer-dash-stat-hint">Earned from quizzes</span>
            </div>
            <div class="freelancer-dash-stat">
              <span class="freelancer-dash-stat-label">Quizzes</span>
              <span class="freelancer-dash-stat-value">${stats.quizCount ?? 0}</span>
              <span class="freelancer-dash-stat-hint">Unlock more jobs</span>
            </div>
          </div>
        </div>
      </section>`;
  },

  freelancerQuickActions(items, icons = {}) {
    return Components.portalDashQuickActions(items, icons);
  },

  portalDashQuickActions(items, icons = {}) {
    const defaultIcons = {
      '/freelancer/profile': Icons.user,
      '/freelancer/quizzes': Icons.book,
      '/freelancer/jobs': Icons.jobs,
      '/jobs': Icons.jobs,
      '/messages': Icons.message,
      '/client/dashboard': Icons.grid,
      '/client/jobs/new': Icons.pen,
      '/client/jobs': Icons.jobs,
      '/client/profile': Icons.user,
    };
    const iconMap = { ...defaultIcons, ...icons };
    return `
      <div class="freelancer-dash-actions">
        <div class="freelancer-dash-section-head">
          <h2>Quick actions</h2>
          <p>Jump back into your workflow</p>
        </div>
        <div class="freelancer-dash-action-grid">
          ${items.map((item) => `
            <a class="freelancer-dash-action-card" data-nav="${item.path}">
              <span class="freelancer-dash-action-icon" aria-hidden="true">${iconMap[item.path] || Icons.grid}</span>
              <span class="freelancer-dash-action-text">
                <strong>${Utils.escapeHtml(item.label)}</strong>
                ${item.hint ? `<span>${Utils.escapeHtml(item.hint)}</span>` : ''}
              </span>
              <span class="freelancer-dash-action-arrow" aria-hidden="true">→</span>
            </a>`).join('')}
        </div>
      </div>`;
  },

  clientDashboardHero(profile, stats = {}) {
    const company = profile.company_name || 'Your company';
    const avatarInner = profile.profile_picture_url
      ? `<img class="freelancer-dash-avatar-img" src="${Utils.escapeHtml(Utils.resolveMediaUrl(profile.profile_picture_url))}" alt="">`
      : `<span class="freelancer-dash-avatar-letter">${Utils.escapeHtml(Utils.initial(company))}</span>`;
    const bio = String(profile.bio || '').trim();
    const bioSnippet = bio.length > 140 ? `${bio.slice(0, 137)}…` : bio;
    const stars = Utils.stars(profile.avg_rating);
    const activeJobs = stats.activeJobs ?? 0;
    const totalJobs = stats.totalJobs ?? 0;
    const statusLabel = activeJobs > 0 ? `${activeJobs} active listing${activeJobs === 1 ? '' : 's'}` : 'No open listings';

    return `
      <section class="freelancer-dash-hero" aria-label="Company dashboard overview">
        <div class="freelancer-dash-hero-glow" aria-hidden="true"></div>
        <div class="freelancer-dash-hero-inner">
          <div class="freelancer-dash-identity">
            <div class="freelancer-dash-avatar" aria-hidden="true">${avatarInner}</div>
            <div class="freelancer-dash-intro">
              <p class="freelancer-dash-eyebrow">Company workspace</p>
              <h1 class="freelancer-dash-name">${Utils.escapeHtml(company)}</h1>
              <div class="freelancer-dash-status ${activeJobs > 0 ? 'is-available' : 'is-unavailable'}">
                <span class="freelancer-dash-status-dot" aria-hidden="true"></span>
                ${Utils.escapeHtml(statusLabel)}
              </div>
              ${bioSnippet ? `<p class="freelancer-dash-bio">${Utils.escapeHtml(bioSnippet)}</p>` : ''}
            </div>
            <a class="btn btn-sm freelancer-dash-edit-btn" data-nav="/client/profile">Edit profile</a>
          </div>
          <div class="freelancer-dash-stats">
            <div class="freelancer-dash-stat">
              <span class="freelancer-dash-stat-label">Rating</span>
              <span class="freelancer-dash-stat-value freelancer-dash-stat-stars">${stars}</span>
              <span class="freelancer-dash-stat-hint">${profile.review_count || 0} reviews</span>
            </div>
            <div class="freelancer-dash-stat">
              <span class="freelancer-dash-stat-label">Active jobs</span>
              <span class="freelancer-dash-stat-value">${activeJobs}</span>
              <span class="freelancer-dash-stat-hint">Open listings</span>
            </div>
            <div class="freelancer-dash-stat">
              <span class="freelancer-dash-stat-label">Total jobs</span>
              <span class="freelancer-dash-stat-value">${totalJobs}</span>
              <span class="freelancer-dash-stat-hint">All time posted</span>
            </div>
          </div>
        </div>
      </section>`;
  },

  clientProfilePage(profile) {
    const company = profile.company_name || 'Your company';
    const avatarInner = profile.profile_picture_url
      ? `<img class="freelancer-profile-avatar-img" src="${Utils.escapeHtml(Utils.resolveMediaUrl(profile.profile_picture_url))}" alt="">`
      : `<span class="freelancer-profile-avatar-letter">${Utils.escapeHtml(Utils.initial(company))}</span>`;

    return `
      <div class="portal-console freelancer-profile client-profile">
        <section class="freelancer-profile-hero">
          <div class="freelancer-profile-hero-main">
            <div class="freelancer-profile-avatar">${avatarInner}</div>
            <div class="freelancer-profile-hero-text">
              <p class="freelancer-profile-eyebrow">Company profile</p>
              <h1 class="freelancer-profile-title">${Utils.escapeHtml(company)}</h1>
              <div class="freelancer-profile-status is-available">
                <span class="freelancer-profile-status-dot" aria-hidden="true"></span>
                Client account
              </div>
            </div>
          </div>
          <p class="freelancer-profile-hero-hint">Keep your company details and logo up to date for freelancers.</p>
        </section>

        <div class="freelancer-profile-layout">
          <section class="freelancer-profile-card freelancer-profile-card-wide">
            <div class="freelancer-profile-card-head">
              <h2>Company details</h2>
              <p>Name, bio, and website shown on your job listings.</p>
            </div>
            <form class="freelancer-profile-form" data-form="clientProfile" id="client-profile-form">
              <div class="freelancer-profile-field">
                <label for="field-company_name">Company name</label>
                <input type="text" id="field-company_name" name="company_name" value="${Utils.escapeHtml(profile.company_name || '')}">
              </div>
              <div class="freelancer-profile-field">
                <label for="field-bio">Bio</label>
                <textarea id="field-bio" name="bio" rows="4">${Utils.escapeHtml(profile.bio || '')}</textarea>
              </div>
              <div class="freelancer-profile-field">
                <label for="field-company_link">Website</label>
                <input type="url" id="field-company_link" name="company_link" value="${Utils.escapeHtml(profile.company_link || '')}">
              </div>
            </form>
            <div class="freelancer-profile-card-foot">
              <button type="submit" form="client-profile-form" class="btn btn-primary">Save changes</button>
            </div>
          </section>

          <div class="freelancer-profile-side">
            <section class="freelancer-profile-card">
              <div class="freelancer-profile-card-head">
                <h2>Company logo</h2>
                <p>Square image works best on job cards.</p>
              </div>
              <div class="freelancer-profile-media-preview" id="client-photo-preview">
                ${profile.profile_picture_url
                  ? `<img src="${Utils.escapeHtml(Utils.resolveMediaUrl(profile.profile_picture_url))}" alt="">`
                  : `<span class="freelancer-profile-media-placeholder">${Utils.escapeHtml(Utils.initial(company))}</span>`}
              </div>
              ${Components.fileUpload({
                id: 'client-picture',
                accept: 'image/jpeg,image/png,image/webp',
                label: 'Choose logo',
                placeholder: 'JPG, PNG or WebP',
                hint: 'Uploads automatically when selected.',
                className: 'freelancer-profile-upload',
              })}
            </section>
          </div>
        </div>

        <section class="freelancer-profile-danger">
          <div>
            <h2>Delete account</h2>
            <p>Permanently remove your company account and all associated jobs.</p>
          </div>
          <button type="button" class="btn btn-ghost-danger" id="delete-client-profile">Delete company account</button>
        </section>
      </div>`;
  },

  freelancerProfilePage(profile, portfolioLinks = []) {
    const available = profile.availability_status === 'Available for Work';
    const links = portfolioLinks.length ? portfolioLinks : (profile.portfolio_links || []);
    const avatarInner = profile.profile_picture_url
      ? `<img class="freelancer-profile-avatar-img" src="${Utils.escapeHtml(Utils.resolveMediaUrl(profile.profile_picture_url))}" alt="">`
      : `<span class="freelancer-profile-avatar-letter">${Utils.escapeHtml(Utils.initial(profile.display_name))}</span>`;
    const portfolioList = links.length
      ? `<div class="freelancer-profile-portfolio-list" id="profile-portfolio-list">
          ${links.map((link) => `
            <div class="freelancer-profile-portfolio-item" data-link-id="${link.id}">
              <form class="freelancer-profile-portfolio-edit-form" data-form="editPortfolio" data-link-id="${link.id}">
                <div class="freelancer-profile-field-grid freelancer-profile-field-grid-3">
                  <div class="freelancer-profile-field">
                    <label>Label</label>
                    <input type="text" name="label" value="${Utils.escapeHtml(link.label)}" required>
                  </div>
                  <div class="freelancer-profile-field">
                    <label>URL</label>
                    <input type="url" name="url" value="${Utils.escapeHtml(link.url)}" required>
                  </div>
                  <div class="freelancer-profile-field">
                    <label>Order</label>
                    <input type="number" name="position" value="${link.position}" min="1" required>
                  </div>
                </div>
                <div class="freelancer-profile-portfolio-item-actions">
                  <button type="submit" class="btn btn-sm btn-primary">Save link</button>
                  <button type="button" class="btn btn-sm btn-ghost-danger" data-delete-portfolio="${link.id}">Remove</button>
                </div>
              </form>
            </div>`).join('')}
        </div>`
      : '<p class="freelancer-profile-empty" id="profile-portfolio-empty">No portfolio links yet.</p>';

    return `
      <div class="portal-console freelancer-profile">
        <section class="freelancer-profile-hero">
          <div class="freelancer-profile-hero-main">
            <div class="freelancer-profile-avatar">${avatarInner}</div>
            <div class="freelancer-profile-hero-text">
              <p class="freelancer-profile-eyebrow">Profile settings</p>
              <h1 class="freelancer-profile-title">${Utils.escapeHtml(profile.display_name)}</h1>
              <div class="freelancer-profile-status ${available ? 'is-available' : 'is-unavailable'}">
                <span class="freelancer-profile-status-dot" aria-hidden="true"></span>
                ${Utils.escapeHtml(profile.availability_status || 'Available for Work')}
              </div>
            </div>
          </div>
          <p class="freelancer-profile-hero-hint">Keep your profile fresh so clients can find and trust you.</p>
        </section>

        <div class="freelancer-profile-layout">
          <section class="freelancer-profile-card freelancer-profile-card-wide">
            <div class="freelancer-profile-card-head">
              <h2>About you</h2>
              <p>Name, bio, and links clients will see.</p>
            </div>
            <form class="freelancer-profile-form" data-form="freelancerProfile" id="freelancer-profile-form">
              <div class="freelancer-profile-field">
                <label for="field-display_name">Display name</label>
                <input type="text" id="field-display_name" name="display_name" value="${Utils.escapeHtml(profile.display_name)}">
              </div>
              <div class="freelancer-profile-field">
                <label for="field-bio">Bio</label>
                <textarea id="field-bio" name="bio" rows="4">${Utils.escapeHtml(profile.bio || '')}</textarea>
              </div>
              <div class="freelancer-profile-field-grid">
                <div class="freelancer-profile-field">
                  <label for="field-contact_email">Contact email</label>
                  <input type="email" id="field-contact_email" name="contact_email" value="${Utils.escapeHtml(profile.contact_email || '')}">
                </div>
                <div class="freelancer-profile-field">
                  <label for="field-linkedin_url">LinkedIn</label>
                  <input type="url" id="field-linkedin_url" name="linkedin_url" value="${Utils.escapeHtml(profile.linkedin_url || '')}">
                </div>
                <div class="freelancer-profile-field">
                  <label for="field-github_url">GitHub</label>
                  <input type="url" id="field-github_url" name="github_url" value="${Utils.escapeHtml(profile.github_url || '')}">
                </div>
                <div class="freelancer-profile-field">
                  <label for="field-portfolio_url">Portfolio URL</label>
                  <input type="url" id="field-portfolio_url" name="portfolio_url" value="${Utils.escapeHtml(profile.portfolio_url || '')}">
                </div>
              </div>
              <label class="freelancer-profile-toggle">
                <input type="checkbox" id="field-available_for_work" name="available_for_work" ${available ? 'checked' : ''}>
                <span class="freelancer-profile-toggle-track" aria-hidden="true"></span>
                <span class="freelancer-profile-toggle-label">Available for work</span>
              </label>
            </form>
            <div class="freelancer-profile-card-foot">
              <button type="submit" form="freelancer-profile-form" class="btn btn-primary">Save changes</button>
            </div>
          </section>

          <div class="freelancer-profile-side">
            <section class="freelancer-profile-card">
              <div class="freelancer-profile-card-head">
                <h2>Profile photo</h2>
                <p>Square image works best.</p>
              </div>
              <div class="freelancer-profile-media-preview" id="profile-photo-preview">
                ${profile.profile_picture_url
                  ? `<img src="${Utils.escapeHtml(Utils.resolveMediaUrl(profile.profile_picture_url))}" alt="">`
                  : `<span class="freelancer-profile-media-placeholder">${Utils.escapeHtml(Utils.initial(profile.display_name))}</span>`}
              </div>
              <label class="hm-file-upload freelancer-profile-upload" for="profile-picture">
                <input type="file" id="profile-picture" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp">
                <span class="hm-file-upload-btn">Choose photo</span>
                <span class="hm-file-upload-name" data-placeholder="JPG, PNG or WebP">JPG, PNG or WebP</span>
              </label>
              <p class="hm-file-upload-hint">Uploads automatically when selected.</p>
            </section>

            <section class="freelancer-profile-card">
              <div class="freelancer-profile-card-head">
                <h2>Resume</h2>
                <p>PDF for client download.</p>
              </div>
              <div id="profile-resume-preview">
              ${profile.resume_url
                ? `<a class="freelancer-profile-resume-link" href="${Utils.escapeHtml(Utils.resolveMediaUrl(profile.resume_url))}" target="_blank" rel="noopener noreferrer">View current resume</a>`
                : '<p class="freelancer-profile-empty">No resume uploaded yet.</p>'}
              </div>
              <label class="hm-file-upload freelancer-profile-upload" for="profile-resume">
                <input type="file" id="profile-resume" accept=".pdf,application/pdf">
                <span class="hm-file-upload-btn">Choose PDF</span>
                <span class="hm-file-upload-name" data-placeholder="No file chosen">No file chosen</span>
              </label>
              <p class="hm-file-upload-hint">Uploads automatically when selected.</p>
            </section>
          </div>
        </div>

        <section class="freelancer-profile-card">
          <div class="freelancer-profile-card-head">
            <h2>Portfolio links</h2>
            <p>Showcase projects with labeled links.</p>
          </div>
          ${portfolioList}
          <form class="freelancer-profile-form freelancer-profile-portfolio-form" data-form="addPortfolio" id="add-portfolio-form" data-next-position="${links.length + 1}">
            <div class="freelancer-profile-field-grid freelancer-profile-field-grid-3">
              <div class="freelancer-profile-field">
                <label for="field-label">Label</label>
                <input type="text" id="field-label" name="label" required>
              </div>
              <div class="freelancer-profile-field">
                <label for="field-url">URL</label>
                <input type="url" id="field-url" name="url" required>
              </div>
              <div class="freelancer-profile-field">
                <label for="field-position">Order</label>
                <input type="number" id="field-position" name="position" value="${links.length + 1}" min="1" required>
              </div>
            </div>
          </form>
          <div class="freelancer-profile-card-foot">
            <button type="submit" form="add-portfolio-form" class="btn btn-primary">Add link</button>
          </div>
        </section>

        <section class="freelancer-profile-danger">
          <div>
            <h2>Delete account</h2>
            <p>Permanently remove your freelancer profile. This cannot be undone.</p>
          </div>
          <button type="button" class="btn btn-ghost-danger" id="delete-freelancer-profile">Delete profile</button>
        </section>
      </div>`;
  },

  adminPipeline(metrics) {
    const total = metrics.totalJobs || 1;
    const rows = [
      { key: 'openJobs', label: 'Open', tone: 'tone-open' },
      { key: 'filledJobs', label: 'Filled', tone: 'tone-filled' },
      { key: 'pendingConfirmationJobs', label: 'Pending confirmation', tone: 'tone-pending' },
      { key: 'completedJobs', label: 'Completed', tone: 'tone-done' },
      { key: 'closedJobs', label: 'Closed', tone: 'tone-closed' },
    ];
    return `
      <div class="admin-pipeline">
        ${rows.map((row) => {
          const count = metrics[row.key] || 0;
          const pct = Math.round((count / total) * 100);
          return `
            <div class="admin-pipeline-row">
              <div class="admin-pipeline-meta">
                <span>${row.label}</span>
                <strong>${count}</strong>
              </div>
              <div class="admin-pipeline-track">
                <div class="admin-pipeline-bar ${row.tone}" style="width:${pct}%"></div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },

  adminJobsTable(items, { applicantsLink = true } = {}) {
    if (!items?.length) {
      return `<div class="admin-empty-panel">${Components.emptyState('No jobs found')}</div>`;
    }
    const rows = items.map((item) => {
      const job = item.job;
      const action = applicantsLink
        ? `<div class="admin-row-actions"><a class="btn btn-sm btn-ghost" data-nav="/admin/jobs/${job.id}/applicants">Applicants</a></div>`
        : '';
      return `
        <tr>
          <td class="admin-td-title">
            <a class="admin-entity-name" data-nav="/admin/jobs/${job.id}/applicants">${Utils.escapeHtml(job.title)}</a>
            <span class="admin-td-sub">${Utils.escapeHtml(job.company_name || '—')}</span>
          </td>
          <td>${Utils.statusBadge(job.status)}</td>
          <td class="admin-td-metric"><span class="admin-skill-metric">${item.application_count}</span></td>
          <td class="admin-td-metric"><span class="admin-skill-metric">${item.pending_count}</span></td>
          <td class="admin-td-metric"><span class="admin-skill-metric">${item.accepted_count ?? 0}</span></td>
          <td class="admin-td-date">${Utils.formatDateShort(job.posted_at)}</td>
          <td class="admin-td-actions">${action}</td>
        </tr>`;
    }).join('');

    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Apps</th>
              <th>Pending</th>
              <th>Accepted</th>
              <th>Posted</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  adminUsersTable(users) {
    if (!users?.length) {
      return `<div class="admin-empty-panel">${Components.emptyState('No users found')}</div>`;
    }
    const rows = users.map((u) => {
      const status = u.is_deleted
        ? '<span class="badge badge-skill-inactive">Deleted</span>'
        : u.is_banned
          ? '<span class="badge badge-skill-inactive">Banned</span>'
          : '<span class="badge badge-skill-active">Active</span>';
      const roleLabel = u.role === 'client' ? 'Client' : 'Freelancer';
      const actions = !u.is_deleted
        ? `<div class="admin-row-actions">
            <button type="button" class="btn btn-sm btn-ghost-danger delete-admin-user" data-id="${u.id}" data-name="${Utils.escapeHtml(u.display_name)}" data-role="${Utils.escapeHtml(u.role)}">Delete</button>
          </div>`
        : '—';
      return `
        <tr>
          <td class="admin-td-title">
            <span class="admin-entity-name">${Utils.escapeHtml(u.display_name)}</span>
            <span class="admin-td-sub">${Utils.escapeHtml(u.email)}</span>
          </td>
          <td><span class="badge">${Utils.escapeHtml(roleLabel)}</span></td>
          <td>${status}</td>
          <td class="admin-td-date">${Utils.formatDateShort(u.created_at)}</td>
          <td class="admin-td-actions">${actions}</td>
        </tr>`;
    }).join('');

    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  adminReportsTable(reports, { withActions = false } = {}) {
    if (!reports?.length) {
      return `<div class="admin-empty-panel">${Components.emptyState('No reports')}</div>`;
    }
    const rows = reports.map((r) => `
      <tr>
        <td class="admin-td-title">
          <span class="admin-entity-name">${Utils.escapeHtml(r.description.slice(0, 100))}${r.description.length > 100 ? '…' : ''}</span>
          <span class="admin-td-sub">User ${Utils.escapeHtml(String(r.reported_user_id).slice(0, 8))}…</span>
        </td>
        <td>${Utils.statusBadge(r.status)}</td>
        <td class="admin-td-date">${Utils.formatDateShort(r.created_at)}</td>
        <td class="admin-td-actions">
          ${withActions && r.status === 'pending' ? `
            <div class="admin-row-actions">
              <button type="button" class="btn btn-sm btn-ghost-danger resolve-report" data-id="${r.id}" data-status="approved">Delete profile</button>
              <button type="button" class="btn btn-sm btn-ghost resolve-report" data-id="${r.id}" data-status="rejected">Dismiss</button>
            </div>
          ` : '—'}
        </td>
      </tr>`).join('');

    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Status</th>
              <th>Date</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  adminCoursesTable(items) {
    if (!items?.length) {
      return `<div class="admin-empty-panel">${Components.emptyState('No courses yet — add one above')}</div>`;
    }
    const rows = items.map((c) => `
      <tr>
        <td class="admin-td-title">
          <a class="admin-entity-name" href="${Utils.escapeHtml(c.link)}" target="_blank" rel="noopener">${Utils.escapeHtml(c.name)}</a>
        </td>
        <td>${Utils.escapeHtml(c.skill_name || c.skill_id)}</td>
        <td><span class="badge badge-skill-${c.is_active ? 'active' : 'inactive'}">${c.is_active ? 'Active' : 'Inactive'}</span></td>
        <td class="admin-td-actions">
          <div class="admin-row-actions">
            <button type="button" class="btn btn-sm btn-ghost toggle-course" data-id="${c.id}" data-active="${!c.is_active}">${c.is_active ? 'Deactivate' : 'Activate'}</button>
            <button type="button" class="btn btn-sm btn-ghost-danger delete-course" data-id="${c.id}">Delete</button>
          </div>
        </td>
      </tr>`).join('');

    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Skill</th>
              <th>Status</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  adminQuickActions() {
    return `
      <div class="admin-quick-actions">
        <a class="admin-quick-card" data-nav="/admin/jobs">
          <strong>Manage jobs</strong>
          <span>Search, filter, review applicants</span>
        </a>
        <a class="admin-quick-card" data-nav="/admin/reports">
          <strong>Moderation</strong>
          <span>Resolve user reports</span>
        </a>
        <a class="admin-quick-card" data-nav="/admin/skills">
          <strong>Skills & quizzes</strong>
          <span>Create verification tests</span>
        </a>
        <a class="admin-quick-card" data-nav="/admin/courses">
          <strong>Courses</strong>
          <span>Manage learning content</span>
        </a>
      </div>`;
  },

  adminRightRail(metrics = {}) {
    return `
      <div class="rail-block">
        <h2 class="rail-title">Operations</h2>
        <ul class="admin-rail-stats">
          <li><span>Pending reports</span><strong>${metrics.pendingReports ?? 0}</strong></li>
          <li><span>Open jobs</span><strong>${metrics.openJobs ?? 0}</strong></li>
          <li><span>Pending applications</span><strong>${metrics.pendingApplications ?? 0}</strong></li>
          <li><span>Freelancers</span><strong>${metrics.totalFreelancers ?? 0}</strong></li>
        </ul>
      </div>
      <div class="rail-cta">
        <h3>Quick links</h3>
        <div class="admin-rail-links">
          <a class="admin-rail-link" data-nav="/admin/jobs">Job listings</a>
          <a class="admin-rail-link" data-nav="/admin/users">All users</a>
          <a class="admin-rail-link" data-nav="/">Public site</a>
        </div>
      </div>`;
  },

  adminReportItem(report) {
    return `
      <article class="admin-report-item">
        <p>${Utils.escapeHtml(report.description.slice(0, 120))}${report.description.length > 120 ? '…' : ''}</p>
        <div class="admin-report-meta">
          ${Utils.statusBadge(report.status)}
          <span>${Utils.formatDateShort(report.created_at)}</span>
          ${report.status === 'pending' ? `<a class="btn btn-sm" data-nav="/admin/reports">Review</a>` : ''}
        </div>
      </article>`;
  },

  emptyState(msg) {
    return `<div class="empty-state">${Utils.escapeHtml(msg)}</div>`;
  },

  jobGridSkeleton(count = 6) {
    return `
      <div class="job-grid-header skeleton-header">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-sort"></div>
      </div>
      <div class="job-grid">
        ${Array.from({ length: count }, () => `
          <div class="job-grid-card skeleton-card">
            <div class="skeleton-card-media"></div>
            <div class="skeleton-card-body">
              <div class="skeleton-line sm"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line lg"></div>
              <div class="skeleton-card-foot">
                <div class="skeleton-line sm"></div>
                <div class="skeleton-pill"></div>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  },

  adminKpiSkeleton(count = 6) {
    return `<div class="admin-kpi-grid">${Array.from({ length: count }, () => `
      <div class="admin-kpi skeleton-kpi"><div class="skeleton-line sm"></div><div class="skeleton-line lg"></div></div>`).join('')}</div>`;
  },

  tableSkeleton(rows = 4) {
    return `<div class="skeleton-table">${Array.from({ length: rows }, () => `
      <div class="skeleton-table-row"><div class="skeleton-line"></div></div>`).join('')}</div>`;
  },

  fileUpload({
    id,
    name = '',
    accept = '',
    label = 'Choose file',
    placeholder = 'No file chosen',
    hint = '',
    className = '',
  } = {}) {
    const acceptAttr = accept ? ` accept="${Utils.escapeHtml(accept)}"` : '';
    const nameAttr = name ? ` name="${Utils.escapeHtml(name)}"` : '';
    return `
      <label class="hm-file-upload ${className}" for="${Utils.escapeHtml(id)}">
        <input type="file" id="${Utils.escapeHtml(id)}"${nameAttr}${acceptAttr}>
        <span class="hm-file-upload-btn">${Utils.escapeHtml(label)}</span>
        <span class="hm-file-upload-name" data-placeholder="${Utils.escapeHtml(placeholder)}">${Utils.escapeHtml(placeholder)}</span>
      </label>
      ${hint ? `<p class="hm-file-upload-hint">${Utils.escapeHtml(hint)}</p>` : ''}`;
  },

  field(label, name, type = 'text', value = '', attrs = '') {
    const id = `field-${name}`;
    if (type === 'textarea') {
      return `
        <label for="${id}">${Utils.escapeHtml(label)}</label>
        <textarea id="${id}" name="${name}" ${attrs}>${Utils.escapeHtml(value)}</textarea>`;
    }
    if (type === 'select') {
      return `
        <label for="${id}">${Utils.escapeHtml(label)}</label>
        <select id="${id}" name="${name}" ${attrs}>${value}</select>`;
    }
    if (type === 'checkbox') {
      return `
        <label class="checkbox">
          <input type="checkbox" id="${id}" name="${name}" ${value ? 'checked' : ''} ${attrs}>
          ${Utils.escapeHtml(label)}
        </label>`;
    }
    return `
      <label for="${id}">${Utils.escapeHtml(label)}</label>
      <input type="${type}" id="${id}" name="${name}" value="${Utils.escapeHtml(value)}" ${attrs}>`;
  },

  skillPicker(skills) {
    if (!skills?.length) {
      return '<p class="job-post-hint">No skills available yet. Ask an admin to add skills first.</p>';
    }
    const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));
    return `
      <div class="skill-picker" role="group" aria-label="Required skills">
        ${sorted.map((s) => {
          const hasQuiz = Boolean(s.quiz?.quiz_id);
          const noQuizClass = hasQuiz ? '' : ' skill-pill-no-quiz';
          const title = hasQuiz
            ? 'Freelancers must pass the quiz to apply'
            : 'No quiz yet — listed as a skill tag only';
          return `
          <label class="skill-pill${noQuizClass}" title="${Utils.escapeHtml(title)}">
            <input type="checkbox" name="skill_ids" value="${s.id}">
            <span>${Utils.escapeHtml(s.name)}</span>
          </label>`;
        }).join('')}
      </div>
      <p class="job-post-hint">All active skills are listed. Skills with a quiz require a verified badge to apply.</p>`;
  },
};
