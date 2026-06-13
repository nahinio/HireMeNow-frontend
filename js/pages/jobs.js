Object.assign(Pages, {
  jobsShell() {
    const params = Utils.getQueryParams();
    const q = params.q || '';
    const skill_id = params.skill_id || '';
    const skills = Store.getCachedSkills();
    const skillOptions = skills.map(
      (s) => `<option value="${s.id}" ${s.id === skill_id ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`
    ).join('');

    const sort = params.sort || 'updated';
    const chips = [];
    const clearParams = { sort: sort !== 'updated' ? sort : undefined };
    const keepParams = clearParams;

    if (q) {
      chips.push({
        label: q,
        params: { skill_id: skill_id || undefined, sort: keepParams.sort },
      });
    }
    if (skill_id) {
      const skill = skills.find((s) => s.id === skill_id);
      chips.push({
        label: skill?.name || 'Skill',
        params: { q: q || undefined, sort: keepParams.sort },
      });
    }

    return PortalPages.wrap('Jobs', 'Find your next role', `
      ${Components.filterBar(
        Components.filterToolbar({
          id: 'job-filters',
          path: '/jobs',
          search: { name: 'q', placeholder: 'Search title…', value: q },
          selects: [
            {
              name: 'skill_id',
              label: 'Skill',
              value: skill_id,
              options: `<option value="">All skills</option>${skillOptions}`,
            },
          ],
          chips,
          clearParams,
          keepParams,
        }),
        Components.filterCountBadge('Loading…', 'jobs-count-meta'),
      )}
      <div id="jobs-grid-slot" class="portal-job-grid">${Components.jobGridSkeleton(6)}</div>
      <div id="jobs-pagination-slot"></div>`);
  },

  async jobs() {
    const params = Utils.getQueryParams();
    const page = Number(params.page) || 1;
    const q = params.q || '';
    const skill_id = params.skill_id || '';
    const sort = params.sort || 'updated';
    const slot = document.getElementById('jobs-grid-slot');

    Store.ensureSkillsCache().then(() => {
      const select = document.querySelector('#job-filters select[name="skill_id"]');
      if (!select || select.options.length > 1) return;
      const skills = Store.getCachedSkills();
      skills.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        if (s.id === skill_id) opt.selected = true;
        select.appendChild(opt);
      });
      Dropdowns.refresh(select);
    });

    if (!slot) return Pages.jobsShell();

    try {
      const data = await Api.get('/jobs', {
        auth: false,
        query: { page, limit: 12, q: q || undefined, skill_id: skill_id || undefined },
      });
      (data.items || []).forEach((j) => Store.cacheSkills(j.required_skills || []));

      let items = data.items || [];
      if (sort === 'title') {
        items = [...items].sort((a, b) => a.title.localeCompare(b.title));
      }

      slot.innerHTML = Components.jobGrid(items, {
        sort,
        emptyMessage: 'No jobs match your filters',
        showHeader: false,
      });
      App.bindNavIn(slot);

      const countMeta = document.getElementById('jobs-count-meta');
      if (countMeta) countMeta.textContent = `${data.total || items.length} jobs`;

      const pagSlot = document.getElementById('jobs-pagination-slot');
      if (pagSlot) {
        pagSlot.innerHTML = Components.pagination(
          data.page,
          data.limit,
          data.total,
          '/jobs',
          { q: q || undefined, skill_id: skill_id || undefined, sort: sort !== 'updated' ? sort : undefined },
        );
        App.bindNavIn(pagSlot);
      }
    } catch {
      slot.innerHTML = Components.emptyState('Could not load jobs');
    }
    return false;
  },

  async jobDetail({ id }) {
    const user = Auth.getUser();
    const job = await Api.get(`/jobs/${id}`, {
      auth: Boolean(user && Auth.getToken()),
      cache: false,
    });
    Store.cacheSkills(job.required_skills || []);

    let actions = '';
    const hasApplied = Boolean(job.viewer_has_applied || Store.hasAppliedToJob(job.id));

    if (user?.role === 'freelancer' && job.status === 'open') {
      if (hasApplied) {
        actions += `<button type="button" class="btn btn-primary btn-block is-applied" disabled>Applied</button>`;
      } else {
        actions += `<button type="button" class="btn btn-primary btn-block" id="apply-job" data-job-id="${job.id}">Apply to this job</button>`;
      }
    }
    if (user?.role === 'client' && user.id === job.client_id) {
      actions += `<a class="btn btn-block" data-nav="/client/jobs/${job.id}/applicants">View applicants</a>`;
    }
    if (user && (user.id === job.client_id || job.status !== 'open')) {
      if (['filled', 'pending_confirmation'].includes(job.status)) {
        actions += `<button class="btn btn-block" id="complete-job" data-job-id="${job.id}">Signal job complete</button>`;
      }
      if (job.status === 'pending_confirmation') {
        actions += `<a class="btn btn-primary btn-block" data-nav="/jobs/${job.id}/review">Submit review</a>`;
      }
      actions += `<a class="btn btn-block" data-nav="/messages">Messages</a>`;
    }

    return `<div class="portal-console"><div class="portal-console-body">${Components.jobDetailPage(job, actions)}</div></div>`;
  },

  async jobReview({ id }) {
    if (!Auth.requireRole(['freelancer', 'client'])) return '';
    const job = await Api.get(`/jobs/${id}`);

    return PortalPages.wrap('Submit review', job.title, `
      ${PortalPages.contentPanel(`
        <form class="admin-compose-form" data-form="submitReview" data-job-id="${id}" id="submit-review-form">
          ${Components.field('Rating (1-5)', 'rating', 'number', '5', 'min="1" max="5" required')}
          ${Components.field('Review (min 20 characters)', 'body', 'textarea', '', 'minlength="20" required rows="5"')}
          <p class="admin-form-hint">Reviews publish when both parties submit.</p>
        </form>`, { footer: '<button type="submit" form="submit-review-form" class="btn btn-primary">Submit review</button>' })}`);
  },
});

function setJobApplyButtonApplied(btn, jobId) {
  btn.disabled = true;
  btn.removeAttribute('id');
  btn.removeAttribute('data-job-id');
  btn.textContent = 'Applied';
  btn.classList.remove('is-applying');
  btn.classList.add('is-applied');
  if (jobId) Store.markJobApplied(jobId);
}

document.addEventListener('click', async (e) => {
  const applyBtn = e.target.closest('#apply-job');
  if (applyBtn) {
    const jobId = applyBtn.dataset.jobId;
    const originalText = applyBtn.textContent;
    applyBtn.disabled = true;
    applyBtn.textContent = 'Applying…';
    applyBtn.classList.add('is-applying');

    try {
      await Api.post(`/jobs/${jobId}/apply`);
      setJobApplyButtonApplied(applyBtn, jobId);
      Utils.showToast('Application submitted!', 'success');
    } catch (err) {
      if (err?.status === 409) {
        setJobApplyButtonApplied(applyBtn, jobId);
        Utils.showToast('You already applied to this job', 'success');
        return;
      }
      applyBtn.disabled = false;
      applyBtn.textContent = originalText;
      applyBtn.classList.remove('is-applying');
      const missing = Utils.getMissingSkillBadges(err);
      if (missing?.length) {
        Utils.showSkillBadgeModal(missing);
      } else {
        Utils.showToast(Utils.parseApiError(err), 'error');
      }
    }
    return;
  }

  if (e.target.id === 'complete-job') {
    const jobId = e.target.dataset.jobId;
    try {
      await Api.post(`/jobs/${jobId}/complete`);
      Utils.showToast('Completion signalled', 'success');
      Router.render();
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
});


document.addEventListener('click', (e) => {
  const sortBtn = e.target.closest('.job-grid-sort-btn');
  if (!sortBtn || Router.getPath() !== '/jobs') return;
  e.preventDefault();
  const params = Utils.getQueryParams();
  const next = (params.sort || 'updated') === 'updated' ? 'title' : 'updated';
  Router.navigate(Utils.buildHash('/jobs', {
    q: params.q || undefined,
    skill_id: params.skill_id || undefined,
    page: params.page || undefined,
    sort: next,
  }).slice(1));
});

FormHandlers.submitReview = async (form) => {
  const jobId = form.dataset.jobId;
  const fd = new FormData(form);
  try {
    await Api.post(`/jobs/${jobId}/review`, {
      rating: Number(fd.get('rating')),
      body: fd.get('body'),
    });
    Utils.showToast('Review submitted', 'success');
    Router.navigate(`/jobs/${jobId}`);
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};
