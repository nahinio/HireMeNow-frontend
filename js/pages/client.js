Object.assign(Pages, {
  async clientDashboard() {
    if (!Auth.requireRole(['client'])) return '';
    const profile = await Api.get('/client/profile');
    const jobs = await Api.get('/jobs/mine', { query: { limit: 8 } }).catch(() => ({ items: [] }));

    return PortalPages.wrap(
      profile.company_name,
      'Company dashboard',
      `
        <div class="admin-kpi-grid portal-kpi-grid">
          ${Components.adminKpiCard('Company rating', Utils.stars(profile.avg_rating), `${profile.review_count} reviews`)}
          ${Components.adminKpiCard('Active jobs', jobs.total ?? jobs.items?.length ?? 0, 'Posted listings')}
        </div>
        ${PortalPages.quickActions([
          { path: '/client/jobs/new', label: 'Post a job', hint: 'Create a new listing' },
          { path: '/client/jobs', label: 'Manage jobs', hint: 'View applicants' },
          { path: '/client/profile', label: 'Company profile', hint: 'Edit details & logo' },
          { path: '/messages', label: 'Messages', hint: 'Talk to freelancers' },
        ])}
        ${Components.adminSecondaryPanel({
          title: 'Recent jobs',
          linkHref: '/client/jobs',
          linkLabel: 'View all →',
          body: PortalPages.clientJobsTable(jobs.items || []),
        })}`,
    );
  },

  async clientProfile() {
    if (!Auth.requireRole(['client'])) return '';
    const p = await Api.get('/client/profile');

    return PortalPages.wrap('Company profile', '', `
      ${Components.adminComposePanel({
        label: 'Company details',
        title: 'Edit profile',
        body: `
          <form class="admin-compose-form" data-form="clientProfile" id="client-profile-form">
            ${Components.field('Company name', 'company_name', 'text', p.company_name)}
            ${Components.field('Bio', 'bio', 'textarea', p.bio, 'rows="4"')}
            ${Components.field('Website', 'company_link', 'url', p.company_link || '')}
          </form>`,
        footer: '<button type="submit" form="client-profile-form" class="btn btn-primary">Save changes</button>',
      })}
      ${Components.adminComposePanel({
        label: 'Branding',
        title: 'Company logo',
        body: `
          <div id="client-photo-preview">
          ${p.profile_picture_url ? `<img class="preview-img portal-preview-img" src="${Utils.escapeHtml(Utils.resolveMediaUrl(p.profile_picture_url))}" alt="">` : '<p class="admin-form-hint">Upload a square logo for your company profile.</p>'}
          </div>
          ${Components.fileUpload({
            id: 'client-picture',
            accept: 'image/jpeg,image/png,image/webp',
            label: 'Choose logo',
            placeholder: 'JPG, PNG or WebP',
            hint: 'Uploads automatically when selected.',
          })}`,
        footer: '',
      })}
      ${Components.adminComposePanel({
        label: 'Danger zone',
        title: 'Delete account',
        className: 'portal-danger-panel',
        body: '<p class="admin-form-hint">Permanently delete your company account and all associated jobs.</p>',
        footer: '<button type="button" class="btn btn-danger" id="delete-client-profile">Delete company account</button>',
      })}`,
    );
  },

  async clientJobs() {
    if (!Auth.requireRole(['client'])) return '';
    const params = Utils.getQueryParams();
    const data = await Api.get('/jobs/mine', {
      query: { page: params.page || 1, limit: 20, status: params.status || undefined },
    });

    return PortalPages.wrap('My jobs', '', `
      ${Components.adminComposePanel({
        label: 'New listing',
        title: 'Post a job',
        body: '<p class="admin-form-hint">Create a job listing and review ranked applicants.</p>',
        footer: '<a class="btn btn-primary" data-nav="/client/jobs/new">Post new job</a>',
      })}
      ${Components.adminSecondaryPanel({
        title: `All jobs (${data.total || 0})`,
        body: `
          ${PortalPages.clientJobsTable(data.items || [])}
          ${Components.pagination(data.page, data.limit, data.total, '/client/jobs')}`,
      })}`,
    );
  },

  async clientJobNew() {
    if (!Auth.requireRole(['client'])) return '';
    const skills = await Store.ensureSkillsCache();
    const profile = await Api.get('/client/profile');
    const company = Utils.escapeHtml(profile.company_name || 'Your company');

    return PortalPages.wrap(
      'Post a job',
      'List the role and choose which skills applicants must verify.',
      `
        <section class="job-post-card">
          <form class="job-post-form" data-form="createJob" id="create-job-form">
            <input type="hidden" name="company_name" value="${company}">
            <p class="job-post-meta">Posting as <strong>${company}</strong></p>

            <div class="job-post-field">
              <label for="job-title">Job title</label>
              <input id="job-title" name="title" type="text" required
                placeholder="e.g. Frontend developer" autocomplete="off">
            </div>

            <div class="job-post-field">
              <span class="job-post-label">Required skills <span class="job-post-req">*</span></span>
              ${Components.skillPicker(skills)}
            </div>

            <div class="job-post-field">
              <label for="job-description">Description</label>
              <textarea id="job-description" name="description" rows="5" required
                placeholder="Briefly describe the role and what the freelancer will do."></textarea>
            </div>

            <details class="job-post-extra">
              <summary>Cover image <span class="job-post-optional">optional</span></summary>
              <div class="job-post-extra-body">
                ${Components.fileUpload({
                  id: 'job-thumbnail',
                  accept: 'image/jpeg,image/png,image/webp',
                  label: 'Choose image',
                  placeholder: 'No file chosen',
                })}
                <input type="hidden" name="thumbnail_url" id="thumbnail-url">
                <p id="thumbnail-status" class="hm-file-upload-hint">JPG, PNG or WebP · shown on the job listing</p>
              </div>
            </details>

            <div class="job-post-actions">
              <a class="btn btn-ghost" data-nav="/client/jobs">Cancel</a>
              <button type="submit" class="btn btn-primary">Publish job</button>
            </div>
          </form>
        </section>`,
    );
  },

  async clientApplicants({ id }) {
    if (!Auth.requireRole(['client'])) return '';
    const job = await Api.get(`/jobs/${id}`);
    const data = await Api.get(`/jobs/${id}/applicants`);

    return PortalPages.wrap('Applicants', job.title, `
      ${Components.adminComposePanel({
        label: 'Job status',
        title: job.title,
        body: `
          <p class="admin-form-hint">${Utils.escapeHtml(job.company_name || '')}</p>
          <div style="margin-top:0.5rem">${Utils.statusBadge(job.status)}</div>`,
        footer: '<a class="btn btn-ghost" data-nav="/client/jobs">← Back to jobs</a>',
      })}
      ${Components.adminSecondaryPanel({
        title: `Ranked applicants (${(data.items || []).length})`,
        body: PortalPages.applicantsTable(data.items || [], { jobId: id, jobStatus: job.status }),
      })}`,
    );
  },
});

FormHandlers.clientProfile = async (form) => {
  const fd = new FormData(form);
  try {
    await Api.patch('/client/profile', {
      company_name: fd.get('company_name'),
      bio: fd.get('bio'),
      company_link: fd.get('company_link') || null,
    });
    Utils.showToast('Profile saved', 'success');
    await Auth.refreshUser();
    Router.render();
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

FormHandlers.createJob = async (form) => {
  const fd = new FormData(form);
  const skillIds = [...form.querySelectorAll('input[name="skill_ids"]:checked')].map((el) => el.value);
  if (!skillIds.length) return Utils.showToast('Select at least one skill', 'error');

  const description = (fd.get('description') || '').trim();
  if (!description) return Utils.showToast('Add a short job description', 'error');

  const payload = {
    title: (fd.get('title') || '').trim(),
    description,
    company_name: (fd.get('company_name') || '').trim(),
    required_skill_ids: skillIds,
    salary_negotiable: true,
    thumbnail_url: fd.get('thumbnail_url') || null,
  };

  try {
    const job = await Api.post('/jobs', payload);
    Utils.showToast('Job posted!', 'success');
    Router.navigate(`/jobs/${job.id}`);
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

document.addEventListener('change', async (e) => {
  if (e.target.id === 'client-picture' && e.target.files?.[0]) {
    try {
      const res = await Api.upload('/client/profile/picture', e.target.files[0]);
      Utils.showToast('Logo uploaded', 'success');
      await Auth.refreshUser();
      const preview = document.getElementById('client-photo-preview');
      if (preview && res?.url) {
        preview.innerHTML = `<img class="preview-img portal-preview-img" src="${Utils.escapeHtml(Utils.cacheBustMediaUrl(res.url))}" alt="">`;
      }
      e.target.value = '';
      Utils.syncFileUpload(e.target);
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
    return;
  }
  if (e.target.id === 'job-thumbnail' && e.target.files?.[0]) {
    try {
      const res = await Api.upload('/jobs/thumbnail', e.target.files[0]);
      document.getElementById('thumbnail-url').value = res.url;
      const status = document.getElementById('thumbnail-status');
      if (status) status.textContent = 'Thumbnail uploaded ✓';
      e.target.value = '';
      Utils.syncFileUpload(e.target);
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
});

document.addEventListener('click', async (e) => {
  if (e.target.id === 'delete-client-profile') {
    if (!confirm('Delete your company account?')) return;
    try {
      await Api.delete('/client/profile');
      Auth.clearSession();
      Router.navigate('/');
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
  if (e.target.classList.contains('select-applicant')) {
    const applicationId = e.target.dataset.appId;
    const jobId = e.target.dataset.jobId;
    if (!confirm('Select this applicant? Others will be rejected.')) return;
    try {
      const res = await Api.post(`/jobs/${jobId}/select`, { application_id: applicationId });
      const job = await Api.get(`/jobs/${jobId}`);
      Store.saveConversation(res.conversation, {
        job_title: job.title || 'Selected job',
        freelancer_id: res.conversation.freelancer_id,
        client_id: res.conversation.client_id,
      });
      Utils.showToast('Applicant hired — conversation started with an automatic welcome message', 'success');
      Router.navigate(`/messages/${res.conversation.id}`);
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
});
