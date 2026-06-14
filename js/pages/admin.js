const AdminPages = {
  _metricsCache: null,
  _metricsCacheAt: 0,
  METRICS_TTL_MS: 120000,

  mapStats(stats) {
    return {
      pendingReports: stats.pending_reports || 0,
      totalJobs: stats.total_jobs || 0,
      openJobs: stats.open_jobs || 0,
      filledJobs: stats.filled_jobs || 0,
      pendingConfirmationJobs: stats.pending_confirmation_jobs || 0,
      completedJobs: stats.completed_jobs || 0,
      closedJobs: stats.closed_jobs || 0,
      totalCourses: stats.total_courses || 0,
      totalFreelancers: stats.total_freelancers || 0,
      totalSkills: stats.total_skills || 0,
      totalApplications: stats.total_applications || 0,
      pendingApplications: stats.pending_applications || 0,
    };
  },

  navMetrics() {
    return AdminPages._metricsCache || { pendingReports: 0 };
  },

  async fetchMetrics(force = false) {
    if (
      !force
      && AdminPages._metricsCache
      && Date.now() - AdminPages._metricsCacheAt < AdminPages.METRICS_TTL_MS
    ) {
      return AdminPages._metricsCache;
    }
    try {
      const stats = await Api.get('/admin/stats');
      AdminPages._metricsCache = AdminPages.mapStats(stats);
      AdminPages._metricsCacheAt = Date.now();
      return AdminPages._metricsCache;
    } catch {
      return AdminPages.navMetrics();
    }
  },

  ensureNavMetrics() {
    if (
      AdminPages._metricsCache
      && Date.now() - AdminPages._metricsCacheAt < AdminPages.METRICS_TTL_MS
    ) {
      return;
    }
    Api.get('/admin/stats')
      .then((stats) => {
        AdminPages._metricsCache = AdminPages.mapStats(stats);
        AdminPages._metricsCacheAt = Date.now();
        AdminPages.refreshNavBadge();
      })
      .catch(() => {});
  },

  refreshNavBadge() {
    const pending = AdminPages._metricsCache?.pendingReports || 0;
    document.querySelectorAll('.admin-nav-link[data-nav="/admin/reports"]').forEach((link) => {
      let badge = link.querySelector('.admin-side-badge');
      if (pending > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'admin-nav-badge';
          link.appendChild(badge);
        }
        badge.textContent = String(pending);
      } else if (badge) {
        badge.remove();
      }
    });
  },

  invalidateMetrics() {
    AdminPages._metricsCache = null;
    AdminPages._metricsCacheAt = 0;
  },

  wrap(activePath, title, subtitle, body) {
    return `
      <div class="admin-console">
        ${Components.adminConsoleHeader(title, subtitle)}
        <div class="admin-console-body">${body}</div>
      </div>`;
  },
};

Object.assign(Pages, {
  adminDashboardShell() {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();
    const body = `
      <div id="admin-dash-kpis">${Components.adminKpiSkeleton(6)}</div>
      ${Components.adminQuickActions()}
      <div class="admin-panel-grid">
        <section class="admin-panel">
          <div class="admin-panel-head">
            <h2>Recent job listings</h2>
            <a class="admin-panel-link" data-nav="/admin/jobs">View all jobs →</a>
          </div>
          <div id="admin-dash-jobs">${Components.tableSkeleton(5)}</div>
        </section>
        <section class="admin-panel admin-panel-secondary">
          <div class="admin-panel-head"><h2>Job pipeline</h2></div>
          <div id="admin-dash-pipeline">${Components.tableSkeleton(3)}</div>
        </section>
      </div>
      <section class="admin-panel admin-panel-secondary">
        <div class="admin-panel-head">
          <h2>Moderation queue</h2>
          <a class="admin-panel-link" data-nav="/admin/reports">Open reports →</a>
        </div>
        <div id="admin-dash-reports">${Components.tableSkeleton(3)}</div>
      </section>`;
    return AdminPages.wrap(
      '/admin',
      'Dashboard',
      '',
      body,
    );
  },

  async adminDashboard() {
    if (!Auth.requireRole(['admin'])) return '';
    const kpiSlot = document.getElementById('admin-dash-kpis');
    if (!kpiSlot) return Pages.adminDashboardShell();

    const [metrics, reports, jobs] = await Promise.all([
      AdminPages.fetchMetrics(),
      Api.get('/admin/reports', { query: { status: 'pending', limit: 5 } }).catch(() => ({ items: [] })),
      Api.get('/admin/jobs', { query: { limit: 8 } }).catch(() => ({ items: [] })),
    ]);

    kpiSlot.innerHTML = `
      <div class="admin-kpi-grid">
        ${Components.adminKpiCard('Total jobs', metrics.totalJobs, 'All listings')}
        ${Components.adminKpiCard('Open jobs', metrics.openJobs, 'Accepting apps')}
        ${Components.adminKpiCard('Applications', metrics.totalApplications, `${metrics.pendingApplications} pending`)}
        ${Components.adminKpiCard('Freelancers', metrics.totalFreelancers, 'Talent pool')}
        ${Components.adminKpiCard('Skills', metrics.totalSkills, 'Categories')}
        ${Components.adminKpiCard('Pending reports', metrics.pendingReports, 'Needs review')}
      </div>`;

    const pipelineSlot = document.getElementById('admin-dash-pipeline');
    if (pipelineSlot) pipelineSlot.innerHTML = Components.adminPipeline(metrics);

    const jobsSlot = document.getElementById('admin-dash-jobs');
    if (jobsSlot) {
      jobsSlot.innerHTML = Components.adminJobsTable(jobs.items || []);
      App.bindNavIn(jobsSlot);
    }

    const reportsSlot = document.getElementById('admin-dash-reports');
    if (reportsSlot) {
      reportsSlot.innerHTML = Components.adminReportsTable(reports.items || [], { withActions: true });
      App.bindNavIn(reportsSlot);
    }

    AdminPages.refreshNavBadge();
    return false;
  },

  async adminSkills() {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();
    const slot = document.getElementById('admin-skills-table-body');
    if (!slot) {
      AdminSkills.pageMode = 'create';
      AdminSkills.deferTableLoad = true;
      return Pages.adminSkillsShell?.() || '';
    }
    AdminSkills.initPage();
    return false;
  },

  adminSkillsShell() {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();
    AdminSkills.pageMode = 'create';
    AdminSkills.deferTableLoad = true;

    const body = `
      ${SkillQuizBuilder.formHtml({ mode: 'create' })}
      <section class="admin-panel admin-panel-secondary" id="admin-skills-table-panel">
        <div class="admin-panel-head"><h2 id="admin-skills-table-title">All skills</h2></div>
        <div class="admin-table-wrap" id="admin-skills-table-body">
          <div class="loading-inline">Loading skills…</div>
        </div>
      </section>`;

    return AdminPages.wrap(
      '/admin/skills',
      'Skills & quizzes',
      '',
      body,
    );
  },

  async adminSkillEdit({ id }) {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();
    Api.invalidateCache('/admin/skills');

    let detail;
    try {
      detail = await Api.get(`/admin/skills/${id}`, { cache: false });
    } catch (err) {
      const msg = AdminSkills.apiErrorMessage(err, 'load this skill for editing');
      return AdminPages.wrap(
        '/admin/skills',
        'Cannot open skill',
        '',
        `${Components.emptyState(msg)}
         <p class="form-footer"><a data-nav="/admin/skills">← Back to skills</a></p>`,
      );
    }

    const body = SkillQuizBuilder.formHtml({
      mode: 'edit',
      skill: detail.skill,
      quiz: detail.quiz,
    });

    AdminSkills.pageMode = 'edit';
    AdminSkills.pendingDetail = detail;
    return AdminPages.wrap(
      '/admin/skills',
      `Edit: ${detail.skill.name}`,
      '',
      body,
    );
  },

  async adminCourses() {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();
    const data = await Api.get('/admin/courses', { query: { limit: 50 } });
    const skills = Store.getCachedSkills();

    const rows = (data.items || []);

    const skillOptions = skills.map(
      (s) => `<option value="${s.id}">${Utils.escapeHtml(s.name)}</option>`
    ).join('');

    const body = `
      ${Components.adminComposePanel({
        label: 'New course',
        title: 'Add course',
        body: `
          <form class="admin-compose-form" data-form="adminCreateCourse" id="admin-create-course-form">
            <div class="admin-form-grid admin-form-grid-inline">
              ${Components.field('Skill', 'skill_id', 'select', `<option value="">Select skill</option>${skillOptions}`, 'required')}
              ${Components.field('Course name', 'name', 'text', '', 'required')}
              ${Components.field('Link', 'link', 'url', 'https://www.youtube.com/watch?v=…', 'required')}
            </div>
            <div class="admin-file-field">
              <label for="course-thumbnail-url-text">Thumbnail <span class="field-optional">(optional)</span></label>
              <p class="field-hint">Upload an image or paste a URL. YouTube course links show the video thumbnail automatically when left empty.</p>
              <input type="url" name="thumbnail_url_text" id="course-thumbnail-url-text" placeholder="https://… thumbnail URL">
              ${Components.fileUpload({
                id: 'course-thumbnail',
                accept: 'image/*',
                label: 'Choose image',
                placeholder: 'Or use URL above',
              })}
              <input type="hidden" name="thumbnail_url" id="course-thumbnail-url">
            </div>
          </form>`,
        footer: '<button type="submit" form="admin-create-course-form" class="btn btn-primary">Add course</button>',
      })}
      ${Components.adminSecondaryPanel({
        title: `All courses (${data.total || 0})`,
        body: Components.adminCoursesTable(rows),
      })}`;

    return AdminPages.wrap('/admin/courses', 'Courses', '', body);
  },

  async adminReports() {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();
    let data;
    try {
      data = await Api.get('/admin/reports', { query: { limit: 50 }, cache: false });
    } catch (err) {
      if (err?.handled) return false;
      data = { items: [], total: 0 };
    }
    const pending = AdminPages.navMetrics().pendingReports;

    const body = Components.adminSecondaryPanel({
      title: `All reports (${data.total || 0})`,
      meta: `${pending} pending`,
      body: Components.adminReportsTable(data.items || [], { withActions: true }),
    });

    return AdminPages.wrap('/admin/reports', 'Reports', 'Review reported users and delete profiles when approved', body);
  },

  async adminJobs() {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();
    const params = Utils.getQueryParams();
    const page = Number(params.page) || 1;
    const q = params.q || '';
    const status = params.status || '';

    const data = await Api.get('/admin/jobs', {
      query: {
        page,
        limit: 20,
        q: q || undefined,
        status: status || undefined,
      },
    }).catch(() => ({ items: [], page: 1, limit: 20, total: 0 }));

    const filterParams = { q: q || undefined, status: status || undefined };

    const chips = [];
    const clearParams = {};
    if (q) chips.push({ label: q, params: { status: status || undefined } });
    if (status) {
      const statusLabel = {
        open: 'Open',
        filled: 'Filled',
        pending_confirmation: 'Pending confirmation',
        completed: 'Completed',
        closed: 'Closed',
      }[status] || status;
      chips.push({ label: statusLabel, params: { q: q || undefined } });
    }

    const body = `
      ${Components.adminComposePanel({
        label: 'Search',
        title: 'Filter jobs',
        body: Components.filterToolbarBlock({
          id: 'admin-job-filters',
          path: '/admin/jobs',
          search: { name: 'q', placeholder: 'Search job title…', value: q },
          selects: [
            {
              name: 'status',
              label: 'Status',
              value: status,
              options: `
                <option value="">All statuses</option>
                <option value="open" ${status === 'open' ? 'selected' : ''}>Open</option>
                <option value="filled" ${status === 'filled' ? 'selected' : ''}>Filled</option>
                <option value="pending_confirmation" ${status === 'pending_confirmation' ? 'selected' : ''}>Pending confirmation</option>
                <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="closed" ${status === 'closed' ? 'selected' : ''}>Closed</option>`,
            },
          ],
          chips,
          clearParams,
        }),
        footer: `<span class="admin-compose-meta">${data.total || 0} jobs total</span>`,
      })}
      ${Components.adminSecondaryPanel({
        title: 'Job listings',
        body: `
          ${Components.adminJobsTable(data.items || [])}
          ${Components.pagination(data.page, data.limit, data.total, '/admin/jobs', filterParams)}`,
      })}`;

    return AdminPages.wrap('/admin/jobs', 'Job management', '', body);
  },

  async adminJobApplicants({ id }) {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();
    const data = await Api.get(`/admin/jobs/${id}/applicants`);
    const rows = (data.applicants?.items || []).map((a) => `
      <tr>
        <td class="admin-td-title"><span class="admin-entity-name">${Utils.escapeHtml(a.profile.display_name)}</span></td>
        <td class="admin-td-metric"><span class="admin-skill-metric">${a.composite_score}</span></td>
        <td>${Utils.statusBadge(a.status)}</td>
      </tr>`).join('');

    const body = Components.adminSecondaryPanel({
      title: 'Applicant rankings',
      linkHref: '/admin/jobs',
      linkLabel: '← Back to jobs',
      body: `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Freelancer</th><th>Score</th><th>Status</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="admin-empty-cell">No applicants</td></tr>'}</tbody>
          </table>
        </div>`,
    });

    return AdminPages.wrap('/admin/jobs', `Applicants · ${id.slice(0, 8)}…`, '', body);
  },

  adminUsersShell() {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();
    return AdminPages.wrap(
      '/admin/users',
      'Users',
      '',
      '<div class="loading-inline">Loading users…</div>',
    );
  },

  async adminUsers() {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();

    const params = Utils.getQueryParams();
    const page = Number(params.page) || 1;
    const q = params.q || '';
    const role = params.role || '';

    let data;
    let loadError = '';
    try {
      data = await Api.get('/admin/users', {
        query: {
          page,
          limit: 50,
          q: q || undefined,
          role: role || undefined,
        },
        cache: false,
      });
    } catch (err) {
      if (err?.handled) return false;
      if (err?.status === 401) {
        loadError = 'Session expired or not signed in. Log in again as admin.';
        Auth.handleSessionExpired();
        return false;
      }
      loadError = Utils.parseApiError(err);
      data = { items: [], page: 1, limit: 50, total: 0 };
    }

    const userTable = loadError
      ? `<div class="admin-empty-panel admin-error-panel">${Components.emptyState(loadError)}</div>`
      : Components.adminUsersTable(data.items || []);

    const filterParams = { q: q || undefined, role: role || undefined };
    const chips = [];
    if (q) chips.push({ label: q, params: { role: role || undefined } });
    if (role) {
      chips.push({
        label: role === 'client' ? 'Clients' : 'Freelancers',
        params: { q: q || undefined },
      });
    }

    const body = `
      ${Components.adminComposePanel({
        label: 'Directory',
        title: 'Clients & freelancers',
        meta: `${data.total || 0} total`,
        body: `
          ${Components.filterToolbarBlock({
            id: 'admin-user-filters',
            path: '/admin/users',
            search: { name: 'q', placeholder: 'Search name or email…', value: q },
            selects: [{
              name: 'role',
              label: 'Role',
              value: role,
              options: `
                <option value="">All roles</option>
                <option value="freelancer"${role === 'freelancer' ? ' selected' : ''}>Freelancers</option>
                <option value="client"${role === 'client' ? ' selected' : ''}>Clients</option>`,
            }],
            chips,
            clearParams: filterParams,
          })}
          ${userTable}
          ${Components.pagination(data.page, data.limit, data.total, '/admin/users', filterParams)}`,
      })}`;

    return AdminPages.wrap('/admin/users', 'Users', 'All clients and freelancers', body);
  },

  adminSkillEditShell() {
    if (!Auth.requireRole(['admin'])) return '';
    AdminPages.ensureNavMetrics();
    return AdminPages.wrap(
      '/admin/skills',
      'Loading skill…',
      '',
      '<div class="loading-inline">Loading skill…</div>',
    );
  },
});

const AdminSkills = {
  pageMode: null,
  pendingDetail: null,
  deferTableLoad: false,
  adminApiAvailable: true,

  apiErrorMessage(err, action = 'complete this action') {
    const status = err?.status;
    const detail = typeof err?.detail === 'string' ? err.detail : '';
    if (status === 0 || detail.includes('Network error')) {
      return detail || `Could not reach the API to ${action}.`;
    }
    if (status === 500) {
      return CONFIG.IS_LOCAL
        ? `Server error while trying to ${action}. Restart the local backend (port 8000).`
        : `Server error while trying to ${action}. Redeploy the latest backend.`;
    }
    if (status === 405 || (status === 404 && detail === 'Not Found')) {
      return CONFIG.IS_LOCAL
        ? `Admin skills API failed (cannot ${action}). Restart the local backend with the latest code on port 8000.`
        : `Admin skills API is outdated (cannot ${action}). Redeploy HireMeNow-backend to Render, then hard-refresh.`;
    }
    if (detail === 'Skill not found') {
      return 'This skill no longer exists. Go back to Skills and pick a current entry.';
    }
    return Utils.parseApiError(err) || `Could not ${action}.`;
  },

  mapPublicSkills(items = []) {
    return items.map((s) => ({
      id: s.id,
      name: s.name,
      question_count: s.quiz?.question_count ?? 0,
      pass_threshold: s.quiz?.pass_threshold ?? null,
      published: Boolean(s.quiz),
      is_active: true,
    }));
  },

  skillsTableHtml(items, { readOnly = false } = {}) {
    if (!items?.length) {
      return `<div class="admin-skills-empty">${Components.emptyState('No skills yet — create one above')}</div>`;
    }

    const rows = items.map((s) => {
      const hasQuiz = Boolean(s.quiz_id);
      const published = Boolean(s.published);
      const active = Boolean(s.is_active);
      const quizBadge = hasQuiz
        ? `<span class="badge badge-skill-${published ? 'published' : 'draft'}">${published ? 'Published' : 'Draft'}</span>`
        : '<span class="badge badge-skill-no-quiz">No quiz</span>';
      const deleteBtn = readOnly
        ? ''
        : `<button type="button" class="btn btn-sm btn-ghost-danger delete-skill" data-id="${s.id}" data-name="${Utils.escapeHtml(s.name)}" title="Delete skill">Delete</button>`;

      return `
        <tr class="admin-skills-row">
          <td class="admin-td-skill">
            <a class="admin-entity-name admin-skill-name" data-nav="/admin/skills/${s.id}/edit">${Utils.escapeHtml(s.name)}</a>
          </td>
          <td class="admin-td-metric">
            <span class="admin-skill-metric">${s.question_count || 0}</span>
            <span class="admin-skill-metric-label">questions</span>
          </td>
          <td class="admin-td-metric">
            <span class="admin-skill-metric">${s.pass_threshold != null ? s.pass_threshold : '—'}</span>
            ${s.pass_threshold != null ? '<span class="admin-skill-metric-label">%</span>' : ''}
          </td>
          <td>
            ${quizBadge}
          </td>
          <td>
            <span class="badge badge-skill-${active ? 'active' : 'inactive'}">${active ? 'Active' : 'Inactive'}</span>
          </td>
          <td class="admin-td-actions">
            <div class="admin-row-actions">
              <a class="btn btn-sm btn-ghost" data-nav="/admin/skills/${s.id}/edit">Edit</a>
              ${deleteBtn}
            </div>
          </td>
        </tr>`;
    }).join('');

    return `
      <table class="admin-table admin-skills-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Questions</th>
            <th>Pass</th>
            <th>Quiz</th>
            <th>Status</th>
            <th aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  },

  async deleteSkill(id, name) {
    if (!AdminSkills.adminApiAvailable) {
      Utils.showToast('Delete requires the admin API', 'error');
      return;
    }
    const label = name || 'this skill';
    const ok = await Utils.confirm({
      title: `Delete "${label}"?`,
      message: 'This removes the quiz, courses, badges, and job requirements tied to this skill.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await Api.delete(`/admin/skills/${id}`);
      Api.invalidateCache('/admin/skills');
      Api.invalidateCache('/skills');
      AdminPages.invalidateMetrics();
      Utils.showToast(`"${label}" deleted`, 'success');
      if (/^\/admin\/skills\/[^/]+\/edit$/.test(Router.getPath())) {
        const editingId = Router.getPath().match(/^\/admin\/skills\/([^/]+)\/edit$/)?.[1];
        if (editingId === id) {
          Router.navigate('/admin/skills');
          return;
        }
      }
      AdminSkills.loadSkillsTable();
    } catch (err) {
      Utils.showToast(AdminSkills.apiErrorMessage(err, 'delete this skill'), 'error');
    }
  },

  loadSkillsTable() {
    const body = document.getElementById('admin-skills-table-body');
    const title = document.getElementById('admin-skills-table-title');
    if (!body) return;

    Api.invalidateCache('/admin/skills');
    Api.get('/admin/skills', { query: { limit: 100 }, cache: false })
      .then((data) => {
        AdminSkills.adminApiAvailable = true;
        if (title) title.textContent = `All skills (${data.total || 0})`;
        body.innerHTML = AdminSkills.skillsTableHtml(data.items, { readOnly: false });
        App.bindNavIn(body);
      })
      .catch(async (err) => {
        AdminSkills.adminApiAvailable = false;
        try {
          const data = await Api.get('/skills', { auth: false, query: { limit: 100 }, cache: false });
          const items = AdminSkills.mapPublicSkills(data.items);
          if (title) title.textContent = `All skills (${data.total || items.length})`;
          body.innerHTML = `
            <p class="admin-form-hint">Showing read-only list — ${Utils.escapeHtml(AdminSkills.apiErrorMessage(err, 'load the admin skills list'))}</p>
            ${AdminSkills.skillsTableHtml(items, { readOnly: true })}`;
          App.bindNavIn(body);
        } catch {
          body.innerHTML = `<div class="admin-empty-panel">${Components.emptyState(AdminSkills.apiErrorMessage(err, 'load skills'))}</div>`;
        }
      });
  },

  initPage() {
    const path = Router.getPath();
    const isSkills = path === '/admin/skills';
    const isEdit = /^\/admin\/skills\/[^/]+\/edit$/.test(path);
    if (!isSkills && !isEdit) return;

    if (AdminSkills.deferTableLoad) {
      AdminSkills.deferTableLoad = false;
      AdminSkills.loadSkillsTable();
    }

    SkillQuizBuilder.reset();
    SkillQuizBuilder.bindEvents();
    if (isEdit && AdminSkills.pendingDetail) {
      SkillQuizBuilder.loadFromApi(AdminSkills.pendingDetail);
    } else {
      SkillQuizBuilder.renderList();
    }

    const form = document.getElementById('skill-quiz-form');
    form?.addEventListener('submit', AdminSkills.handleSubmit);
  },

  async handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const mode = form.dataset.mode;
    const skillId = form.dataset.skillId;

    if (!SkillQuizBuilder.questions.length) {
      Utils.showToast('Add at least one quiz question', 'error');
      return;
    }

    const name = form.name.value.trim();
    const description = form.description.value.trim();
    const pass_threshold = Number(form.pass_threshold.value) || 80;
    const published = form.published.checked;
    const questions = SkillQuizBuilder.toPayload();

    try {
      if (mode === 'edit') {
        await Api.patch(`/admin/skills/${skillId}`, { name, description });
        await Api.put(`/admin/skills/${skillId}/quiz`, { pass_threshold, published, questions });
        Utils.showToast('Skill updated', 'success');
        Router.navigate('/admin/skills');
      } else {
        const res = await Api.post('/admin/skills/with-quiz', {
          name,
          description,
          pass_threshold,
          published,
          questions,
        });
        Store.cacheSkills([res.skill]);
        AdminPages.invalidateMetrics();
        Utils.showToast(`Skill "${res.skill.name}" created`, 'success');
        SkillQuizBuilder.reset();
        form.reset();
        SkillQuizBuilder.renderList();
        Router.render();
      }
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  },
};

FormHandlers.adminCreateCourse = async (form) => {
  const fd = new FormData(form);
  const thumbnailUrl = (fd.get('thumbnail_url') || fd.get('thumbnail_url_text') || '').trim() || null;
  try {
    await Api.post('/admin/courses', {
      skill_id: fd.get('skill_id'),
      name: fd.get('name'),
      link: fd.get('link'),
      thumbnail_url: thumbnailUrl,
    });
    Utils.showToast('Course created', 'success');
    Router.render();
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

document.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('.delete-admin-user');
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    const name = deleteBtn.dataset.name || 'this user';
    const role = deleteBtn.dataset.role || 'user';
    const ok = await Utils.confirm({
      title: `Delete ${name}?`,
      message: `Their ${role} profile will be removed and they cannot log in again.`,
      confirmLabel: 'Delete profile',
      danger: true,
    });
    if (!ok) return;
    try {
      await Api.delete(`/admin/users/${id}`);
      Utils.showToast(`${name} deleted`, 'success');
      Router.render();
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
    return;
  }

  if (e.target.classList.contains('resolve-report')) {
    const id = e.target.dataset.id;
    const status = e.target.dataset.status;
    const ok = await Utils.confirm(
      status === 'approved'
        ? {
            title: 'Delete reported profile?',
            message: 'This permanently deletes the reported user\'s profile.',
            confirmLabel: 'Delete profile',
            danger: true,
          }
        : {
            title: 'Dismiss report?',
            message: 'The report will be closed without deleting the user.',
            confirmLabel: 'Dismiss',
          },
    );
    if (!ok) return;
    try {
      await Api.patch(`/admin/reports/${id}`, { status });
      AdminPages.invalidateMetrics();
      Utils.showToast(status === 'approved' ? 'User profile deleted' : 'Report dismissed', 'success');
      Router.render();
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
  if (e.target.classList.contains('toggle-course')) {
    try {
      await Api.patch(`/admin/courses/${e.target.dataset.id}`, { is_active: e.target.dataset.active === 'true' });
      Utils.showToast('Course updated', 'success');
      Router.render();
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
  if (e.target.classList.contains('delete-course')) {
    const ok = await Utils.confirm({
      title: 'Delete course?',
      message: 'This course will be removed from recommendations.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await Api.delete(`/admin/courses/${e.target.dataset.id}`);
      Utils.showToast('Course deleted', 'success');
      Router.render();
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
  if (e.target.classList.contains('delete-skill')) {
    AdminSkills.deleteSkill(e.target.dataset.id, e.target.dataset.name);
  }
});


document.addEventListener('change', async (e) => {
  if (e.target.id === 'course-thumbnail' && e.target.files?.[0]) {
    try {
      const res = await Api.upload('/admin/courses/thumbnail', e.target.files[0]);
      document.getElementById('course-thumbnail-url').value = res.url;
      Utils.showToast('Thumbnail uploaded', 'success');
      e.target.value = '';
      Utils.syncFileUpload(e.target);
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
});
