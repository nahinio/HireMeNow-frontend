Object.assign(Pages, {
  jobsShell() {
    const params = Utils.getQueryParams();
    const q = params.q || '';
    const skill_id = params.skill_id || '';
    const skills = Store.getCachedSkills();
    const skillOptions = skills.map(
      (s) => `<option value="${s.id}" ${s.id === skill_id ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`
    ).join('');

    const chips = [];
    const clearParams = {};

    if (q) {
      chips.push({
        label: q,
        params: { skill_id: skill_id || undefined },
      });
    }
    if (skill_id) {
      const skill = skills.find((s) => s.id === skill_id);
      chips.push({
        label: skill?.name || 'Skill',
        params: { q: q || undefined },
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

      slot.innerHTML = Components.jobGrid(items, {
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
          { q: q || undefined, skill_id: skill_id || undefined },
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
    Store.syncJobViewerState(job);

    let actions = '';
    const hasApplied = Boolean(job.viewer_has_applied || Store.hasAppliedToJob(job.id));
    const isClient = user?.role === 'client' && String(user?.id) === String(job.client_id);

    if (user?.role === 'freelancer' && job.status === 'open') {
      if (hasApplied) {
        actions += `<button type="button" class="btn btn-primary btn-block is-applied" disabled>Applied</button>`;
      } else {
        actions += `<button type="button" class="btn btn-primary btn-block" id="apply-job" data-job-id="${job.id}">Apply to this job</button>`;
      }
    }
    if (isClient) {
      actions += `<a class="btn btn-block" data-nav="/client/jobs/${job.id}/applicants">View applicants</a>`;
    }
    if (user) {
      actions += Components.jobPartyActions(job, user);
      if (isClient || job.viewer_is_hired) {
        actions += `<a class="btn btn-block" data-nav="/messages">Messages</a>`;
      }
    }

    return `<div class="portal-console"><div class="portal-console-body">${Components.jobDetailPage(job, actions)}</div></div>`;
  },

  async jobReview({ id }) {
    if (!Auth.requireRole(['freelancer', 'client'])) return '';
    const job = await Api.get(`/jobs/${id}`, { cache: false });
    Store.syncJobViewerState(job);
    const user = Auth.getUser();
    const backPath = user?.role === 'freelancer' ? '/freelancer/jobs' : `/jobs/${id}`;

    if (Store.hasSubmittedReview(id, job)) {
      return PortalPages.wrap('Submit review', job.title, `
        <div class="admin-empty-panel">
          <p class="admin-form-hint">You already submitted your review for this job.</p>
          <a class="btn btn-primary" data-nav="${backPath}">← Back</a>
        </div>`);
    }

    if (!job.viewer_can_submit_review) {
      return PortalPages.wrap('Submit review', job.title, `
        <div class="admin-empty-panel">
          <p class="admin-form-hint">Reviews unlock after both you and the other party mark the job complete.</p>
          <a class="btn btn-primary" data-nav="${backPath}">← Back</a>
        </div>`);
    }

    return PortalPages.wrap('Submit review', job.title, `
      ${PortalPages.contentPanel(`
        <form class="admin-compose-form" data-form="submitReview" data-job-id="${id}" id="submit-review-form">
          ${Components.field('Rating (1-5)', 'rating', 'number', '5', 'min="1" max="5" required')}
          ${Components.field('Review (min 20 characters)', 'body', 'textarea', '', 'minlength="20" required rows="5"')}
          <p class="admin-form-hint">Reviews publish when both parties submit.</p>
        </form>`, { footer: `
          <a class="btn btn-ghost" data-nav="${backPath}">← Back</a>
          <button type="submit" form="submit-review-form" class="btn btn-primary">Submit review</button>` })}`);
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

  if (e.target.closest('.complete-job')) {
    const btn = e.target.closest('.complete-job');
    const jobId = btn.dataset.jobId;
    if (!jobId) return;
    btn.disabled = true;
    try {
      await Api.post(`/jobs/${jobId}/complete`);
      Store.markJobCompletionSignalled(jobId);
      Api.invalidateCache('/jobs');
      Utils.showToast('Job marked complete', 'success');
      Router.render();
    } catch (err) {
      btn.disabled = false;
      if (err?.status === 409) {
        Store.markJobCompletionSignalled(jobId);
        Api.invalidateCache('/jobs');
        Router.render();
        Utils.showToast('Completion already signalled', 'success');
        return;
      }
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
    return;
  }
});


FormHandlers.submitReview = async (form) => {
  const jobId = form.dataset.jobId;
  const fd = new FormData(form);
  try {
    await Api.post(`/jobs/${jobId}/review`, {
      rating: Number(fd.get('rating')),
      body: fd.get('body'),
    });
    Store.markJobReviewSubmitted(jobId);
    Api.invalidateCache('/jobs');
    Utils.showToast('Review submitted', 'success');
    const user = Auth.getUser();
    Router.navigate(user?.role === 'freelancer' ? '/freelancer/jobs' : `/jobs/${jobId}`);
  } catch (err) {
    if (err?.status === 409) {
      Store.markJobReviewSubmitted(jobId);
      Api.invalidateCache('/jobs');
      Utils.showToast('Review already submitted', 'success');
      const user = Auth.getUser();
      Router.navigate(user?.role === 'freelancer' ? '/freelancer/jobs' : `/jobs/${jobId}`);
      return;
    }
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};
