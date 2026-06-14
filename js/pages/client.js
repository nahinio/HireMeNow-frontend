Object.assign(Pages, {
  async clientDashboard() {
    if (!Auth.requireRole(['client'])) return '';
    const [profile, openJobs, allJobs] = await Promise.all([
      Api.get('/client/profile'),
      Api.get('/jobs/mine', { query: { limit: 1, status: 'open' } }).catch(() => ({ total: 0, items: [] })),
      Api.get('/jobs/mine', { query: { limit: 8 } }).catch(() => ({ total: 0, items: [] })),
    ]);
    const items = allJobs.items || [];
    const activeJobs = openJobs.total ?? 0;
    const totalJobs = allJobs.total ?? items.length;

    return `
      <div class="portal-console client-dash">
        ${Components.clientDashboardHero(profile, { activeJobs, totalJobs })}
        <div class="portal-console-body client-dash-body">
          ${Components.portalDashQuickActions([
            { path: '/client/jobs/new', label: 'Post a job', hint: 'Create a new listing' },
            { path: '/client/jobs', label: 'Manage jobs', hint: 'View applicants' },
            { path: '/client/profile', label: 'Company profile', hint: 'Edit details & logo' },
            { path: '/messages', label: 'Messages', hint: 'Talk to freelancers' },
          ])}
          ${Components.adminSecondaryPanel({
            title: 'Recent jobs',
            linkHref: '/client/jobs',
            linkLabel: 'View all →',
            body: PortalPages.clientJobsTable(items),
          })}
        </div>
      </div>`;
  },

  async clientProfile() {
    if (!Auth.requireRole(['client'])) return '';
    const p = await Api.get('/client/profile', { cache: false });
    return Components.clientProfilePage(p);
  },

  async clientJobs() {
    if (!Auth.requireRole(['client'])) return '';
    const params = Utils.getQueryParams();
    const data = await Api.get('/jobs/mine', {
      query: { page: params.page || 1, limit: 20, status: params.status || undefined },
    });

    return `
      <div class="portal-console client-dash">
        <div class="portal-console-body client-dash-body">
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
          })}
        </div>
      </div>`;
  },

  async clientJobNew() {
    if (!Auth.requireRole(['client'])) return '';
    const skills = await Store.ensureSkillsCache();
    const profile = await Api.get('/client/profile');
    const company = Utils.escapeHtml(profile.company_name || 'Your company');

    return `
      <div class="portal-console client-dash">
        <div class="portal-console-body client-dash-body">
          <section class="job-post-card">
            <header class="job-post-card-head">
              <p class="job-post-card-eyebrow">New listing</p>
              <h1>Post a job</h1>
              <p class="job-post-card-sub">List the role and choose which skills applicants must verify.</p>
            </header>
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

              <div class="job-post-sections">
                <p class="job-post-sections-title">Job details</p>

                <div class="job-post-field">
                  <label for="job-about-role">About the role <span class="job-post-req">*</span></label>
                  <textarea id="job-about-role" name="about_role" rows="3" required
                    placeholder="Summarize the project, team, and what success looks like in this role."></textarea>
                </div>

                <div class="job-post-field">
                  <label for="job-responsibilities">Responsibilities <span class="job-post-req">*</span></label>
                  <textarea id="job-responsibilities" name="responsibilities" rows="4" required
                    placeholder="List day-to-day tasks, deliverables, tools, and collaboration expectations."></textarea>
                </div>

                <div class="job-post-field">
                  <label for="job-req-education">Requirements — Education</label>
                  <textarea id="job-req-education" name="requirements_education" rows="2"
                    placeholder="e.g. BS in Computer Science or equivalent practical experience."></textarea>
                </div>

                <div class="job-post-field">
                  <label for="job-req-experience">Requirements — Experience</label>
                  <textarea id="job-req-experience" name="requirements_experience" rows="2"
                    placeholder="e.g. 3+ years building production apps with the skills listed above."></textarea>
                </div>

                <div class="job-post-field">
                  <label for="job-req-additional">Requirements — Additional</label>
                  <textarea id="job-req-additional" name="requirements_additional" rows="2"
                    placeholder="e.g. Git, CI/CD, timezone overlap, language, or nice-to-have skills."></textarea>
                </div>

                <div class="job-post-field">
                  <label for="job-benefits">Compensation &amp; benefits</label>
                  <textarea id="job-benefits" name="other_benefits" rows="2"
                    placeholder="e.g. Remote-friendly, learning stipend, flexible hours, or stock options."></textarea>
                </div>

                <div class="job-post-field">
                  <label for="job-company-description">About the company</label>
                  <textarea id="job-company-description" name="company_description" rows="2"
                    placeholder="Brief intro — mission, industry, team size, and why freelancers enjoy working with you."></textarea>
                </div>
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
          </section>
        </div>
      </div>`;
  },

  async clientApplicants({ id }) {
    if (!Auth.requireRole(['client'])) return '';
    const job = await Api.get(`/jobs/${id}`);
    const data = await Api.get(`/jobs/${id}/applicants`);

    return `
      <div class="portal-console client-dash">
        <div class="portal-console-body client-dash-body">
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
          })}
        </div>
      </div>`;
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

  const aboutRole = (fd.get('about_role') || '').trim();
  const responsibilities = (fd.get('responsibilities') || '').trim();
  if (!aboutRole) return Utils.showToast('Add a short summary under About the role', 'error');
  if (!responsibilities) return Utils.showToast('Add responsibilities for this role', 'error');

  const payload = {
    title: (fd.get('title') || '').trim(),
    about_role: aboutRole,
    responsibilities,
    requirements_education: (fd.get('requirements_education') || '').trim(),
    requirements_experience: (fd.get('requirements_experience') || '').trim(),
    requirements_additional: (fd.get('requirements_additional') || '').trim(),
    other_benefits: (fd.get('other_benefits') || '').trim(),
    company_description: (fd.get('company_description') || '').trim(),
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
        preview.innerHTML = `<img src="${Utils.escapeHtml(Utils.cacheBustMediaUrl(res.url))}" alt="">`;
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
    const ok = await Utils.confirm({
      title: 'Delete company account?',
      message: 'Permanently delete your company account and all associated jobs.',
      confirmLabel: 'Delete account',
      danger: true,
    });
    if (!ok) return;
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
    const ok = await Utils.confirm({
      title: 'Select this applicant?',
      message: 'All other applicants for this job will be rejected.',
      confirmLabel: 'Select applicant',
    });
    if (!ok) return;
    try {
      const res = await Api.post(`/jobs/${jobId}/select`, { application_id: applicationId });
      const job = await Api.get(`/jobs/${jobId}`);
      Store.saveConversation(res.conversation, {
        job_title: job.title || 'Selected job',
      });
      Utils.showToast('Applicant selected!', 'success');
      Router.navigate('/messages');
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
});
