const PortalPages = {
  wrap(title, subtitle = '', body = '') {
    return `
      <div class="portal-console">
        ${Components.adminConsoleHeader(title, subtitle)}
        <div class="portal-console-body">${body}</div>
      </div>`;
  },

  filterBar(body, meta = '') {
    return Components.filterBar(body, meta);
  },

  contentPanel(body, { footer = '' } = {}) {
    return `
      <section class="portal-content-panel">
        <div class="portal-content-body">${body}</div>
        ${footer ? `<div class="portal-content-foot">${footer}</div>` : ''}
      </section>`;
  },

  publicNavLinks() {
    return [
      { path: '/', label: 'Home' },
      { path: '/jobs', label: 'Jobs' },
      { path: '/freelancers', label: 'Talent' },
    ];
  },

  freelancerNavLinks() {
    return [
      { path: '/freelancer/dashboard', label: 'Dashboard' },
      { path: '/freelancer/quizzes', label: 'Quizzes' },
      { path: '/jobs', label: 'Jobs' },
      { path: '/freelancer/jobs', label: 'Previous jobs' },
      { path: '/messages', label: 'Messages' },
      { path: '/freelancer/profile', label: 'Profile' },
    ];
  },

  resolvePublicNavActive(activePath, path) {
    if (path === '/') return activePath === '/';
    if (path === '/jobs') {
      return activePath === '/jobs' || (activePath.startsWith('/jobs/') && !activePath.endsWith('/review'));
    }
    return activePath === path || activePath.startsWith(`${path}/`);
  },

  resolveFreelancerNavActive(activePath, path) {
    if (path === '/freelancer/quizzes') {
      return activePath === '/freelancer/quizzes' || activePath.startsWith('/freelancer/quizzes/');
    }
    if (path === '/jobs') {
      return activePath === '/jobs' || (activePath.startsWith('/jobs/') && !activePath.endsWith('/review'));
    }
    if (path === '/freelancer/jobs') {
      return activePath === '/freelancer/jobs'
        || (activePath.startsWith('/jobs/') && activePath.endsWith('/review'));
    }
    if (path === '/messages') {
      return activePath === '/messages' || activePath.startsWith('/messages/');
    }
    return activePath === path || activePath.startsWith(`${path}/`);
  },

  topNavLinks(links, activePath, resolveActive) {
    return links.map((link) => `
      <a class="top-nav-link ${resolveActive(activePath, link.path) ? 'active' : ''}"
        data-nav="${link.path}">${Utils.escapeHtml(link.label)}</a>`).join('');
  },

  publicTopNav(activePath) {
    return PortalPages.topNavLinks(
      PortalPages.publicNavLinks(),
      activePath,
      PortalPages.resolvePublicNavActive,
    );
  },

  freelancerTopNav(activePath) {
    return PortalPages.topNavLinks(
      PortalPages.freelancerNavLinks(),
      activePath,
      PortalPages.resolveFreelancerNavActive,
    );
  },

  clientTopNav(activePath) {
    return PortalPages.topNavLinks(
      PortalPages.clientNavLinks(),
      activePath,
      PortalPages.isClientNavActive,
    );
  },

  quickActions(items) {
    return `
      <div class="admin-quick-actions portal-quick-actions">
        ${items.map((item) => `
          <a class="admin-quick-card" data-nav="${item.path}">
            <strong>${Utils.escapeHtml(item.label)}</strong>
            ${item.hint ? `<span>${Utils.escapeHtml(item.hint)}</span>` : ''}
          </a>`).join('')}
      </div>`;
  },

  clientNavLinks() {
    return [
      { path: '/client/dashboard', label: 'Dashboard' },
      { path: '/client/jobs', label: 'My jobs' },
      { path: '/messages', label: 'Messages' },
      { path: '/freelancers', label: 'Talent' },
      { path: '/client/profile', label: 'Profile' },
    ];
  },

  isClientNavActive(activePath, path) {
    if (path === '/client/jobs') {
      return activePath === '/client/jobs'
        || activePath === '/client/jobs/new'
        || /^\/client\/jobs\/[^/]+\/applicants$/.test(activePath);
    }
    if (path === '/freelancers') {
      return activePath === '/freelancers' || activePath.startsWith('/freelancers/');
    }
    if (path === '/messages') {
      return activePath === '/messages' || activePath.startsWith('/messages/');
    }
    return activePath === path || activePath.startsWith(`${path}/`);
  },

  clientJobsTable(jobs) {
    if (!jobs?.length) {
      return `<div class="admin-empty-panel">${Components.emptyState('No jobs posted yet')}</div>`;
    }
    const user = Auth.getUser();
    jobs.forEach((job) => Store.syncJobViewerState(job));

    const rows = jobs.map((job) => {
      const partyActions = Components.jobPartyActions(job, user, { compact: true });
      const actions = [
        partyActions,
        `<a class="btn btn-sm btn-ghost" data-nav="/client/jobs/${job.id}/applicants">Applicants</a>`,
        `<a class="btn btn-sm btn-ghost" data-nav="/jobs/${job.id}">View</a>`,
      ].filter(Boolean).join('');

      return `
      <tr>
        <td class="admin-td-title">
          <a class="admin-entity-name" data-nav="/jobs/${job.id}">${Utils.escapeHtml(job.title)}</a>
          <span class="admin-td-sub">${Utils.escapeHtml(job.company_name || '—')}</span>
        </td>
        <td>${Utils.statusBadge(job.status)}</td>
        <td class="admin-td-date">${Utils.formatDateShort(job.posted_at)}</td>
        <td class="admin-td-actions">
          <div class="admin-row-actions">${actions}</div>
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Posted</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  freelancerJobsTable(jobs) {
    if (!jobs?.length) {
      return `<div class="admin-empty-panel">${Components.emptyState('No previous jobs yet')}</div>`;
    }
    const user = Auth.getUser();
    jobs.forEach((job) => Store.syncJobViewerState(job));

    const rows = jobs.map((job) => {
      const partyActions = Components.jobPartyActions(job, user, { compact: true });
      const actions = [
        partyActions,
        `<a class="btn btn-sm btn-ghost" data-nav="/jobs/${job.id}">View job</a>`,
        `<a class="btn btn-sm btn-ghost" data-nav="/messages">Messages</a>`,
      ].filter(Boolean).join('');

      return `
      <tr>
        <td class="admin-td-title">
          <a class="admin-entity-name" data-nav="/jobs/${job.id}">${Utils.escapeHtml(job.title)}</a>
          <span class="admin-td-sub">${Utils.escapeHtml(job.company_name || '—')}</span>
        </td>
        <td>${Utils.statusBadge(job.status)}</td>
        <td class="admin-td-date">${Utils.formatDateShort(job.updated_at)}</td>
        <td class="admin-td-actions">
          <div class="admin-row-actions">${actions}</div>
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Updated</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  applicantsTable(items, { jobId, jobStatus }) {
    if (!items?.length) {
      return `<div class="admin-empty-panel">${Components.emptyState('No applicants yet')}</div>`;
    }
    const rows = items.map((a) => `
      <tr>
        <td class="admin-td-title">
          <span class="admin-entity-name">${Utils.escapeHtml(a.profile.display_name)}</span>
          <span class="admin-td-sub">${Utils.escapeHtml(a.user.email)}</span>
        </td>
        <td>${Utils.stars(a.profile.avg_rating)}</td>
        <td class="admin-td-metric"><span class="admin-skill-metric">${a.quiz_score_snapshot}</span><span class="admin-skill-metric-label">%</span></td>
        <td class="admin-td-metric"><span class="admin-skill-metric">${a.composite_score}</span></td>
        <td>${Utils.statusBadge(a.status)}</td>
        <td class="admin-td-actions">
          ${a.status === 'pending' && jobStatus === 'open'
            ? `<button type="button" class="btn btn-sm btn-primary select-applicant" data-app-id="${a.application_id}" data-job-id="${jobId}">Select</button>`
            : '—'}
        </td>
      </tr>`).join('');

    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Freelancer</th>
              <th>Rating</th>
              <th>Quiz</th>
              <th>Score</th>
              <th>Status</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  quizListTable(quizzes, earnedIds) {
    if (!quizzes?.length) {
      return `<div class="admin-empty-panel">${Components.emptyState('No published quizzes yet')}</div>`;
    }
    const rows = quizzes.map((s) => `
      <tr>
        <td class="admin-td-title">
          <span class="admin-entity-name">${Utils.escapeHtml(s.name)}</span>
        </td>
        <td class="admin-td-metric">
          <span class="admin-skill-metric">${s.quiz.question_count}</span>
          <span class="admin-skill-metric-label">questions</span>
        </td>
        <td class="admin-td-metric">
          <span class="admin-skill-metric">${s.quiz.pass_threshold}</span>
          <span class="admin-skill-metric-label">% pass</span>
        </td>
        <td>
          ${earnedIds.has(s.id)
            ? '<span class="badge badge-skill-published">Badge earned</span>'
            : '<span class="badge badge-skill-draft">Not taken</span>'}
        </td>
        <td class="admin-td-actions">
          <a class="btn btn-sm btn-ghost" data-nav="/freelancer/quizzes/${s.quiz.quiz_id}">Take quiz</a>
        </td>
      </tr>`).join('');

    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Questions</th>
              <th>Pass</th>
              <th>Status</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },
};
