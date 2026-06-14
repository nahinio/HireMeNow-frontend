Object.assign(Pages, {
  async freelancerDashboard() {
    if (!Auth.requireRole(['freelancer'])) return '';
    const profile = await Api.get('/freelancer/profile');
    const [jobs, skills, publicProfile] = await Promise.all([
      Api.get('/jobs', { query: { limit: 3 } }).catch(() => ({ items: [] })),
      Api.get('/skills', { auth: false, query: { limit: 100 } }).catch(() => ({ items: [] })),
      Api.get(`/freelancers/${profile.id}`, { auth: false }).catch(() => ({ skills: [] })),
    ]);
    const quizCount = (skills.items || []).filter((s) => s.quiz).length;
    const earnedSkills = publicProfile.skills || [];

    return `
      <div class="portal-console freelancer-dash">
        ${Components.freelancerDashboardHero(profile, {
          earnedSkills: earnedSkills.length,
          quizCount,
        })}
        <div class="portal-console-body freelancer-dash-body">
          ${Components.freelancerQuickActions([
            { path: '/freelancer/profile', label: 'Edit profile', hint: 'Bio, links & resume' },
            { path: '/freelancer/quizzes', label: 'Take quizzes', hint: 'Earn skill badges' },
            { path: '/jobs', label: 'Browse jobs', hint: 'Find open roles' },
            { path: '/freelancer/jobs', label: 'Previous jobs', hint: 'Complete work & review clients' },
            { path: '/messages', label: 'Messages', hint: 'Client conversations' },
          ])}
          ${Components.adminSecondaryPanel({
            title: 'Open jobs',
            linkHref: '/jobs',
            linkLabel: 'Browse all →',
            body: Components.jobGrid(jobs.items || [], {
              showHeader: false,
              emptyMessage: 'No open jobs',
            }),
          })}
        </div>
      </div>`;
  },

  async freelancerProfile() {
    if (!Auth.requireRole(['freelancer'])) return '';
    const p = await Api.get('/freelancer/profile', { cache: false });

    return Components.freelancerProfilePage(p, p.portfolio_links || []);
  },

  async freelancerJobs() {
    if (!Auth.requireRole(['freelancer'])) return '';
    const params = Utils.getQueryParams();
    const data = await Api.get('/jobs/engagements', {
      query: { page: params.page || 1, limit: 20, status: params.status || undefined },
    });
    (data.items || []).forEach((job) => Store.syncJobViewerState(job));

    const status = params.status || '';
    const filters = `
      <form class="admin-filter-form portal-filter-form" id="freelancer-jobs-filter">
        <label class="admin-filter-field">
          <span>Status</span>
          <select name="status" id="freelancer-jobs-status">
            <option value="">All statuses</option>
            <option value="filled" ${status === 'filled' ? 'selected' : ''}>Filled</option>
            <option value="pending_confirmation" ${status === 'pending_confirmation' ? 'selected' : ''}>Pending confirmation</option>
            <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="closed" ${status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </label>
      </form>`;

    return PortalPages.wrap(
      'Previous jobs',
      'Mark work complete and submit reviews for clients you were hired by.',
      `
        ${Components.adminComposePanel({
          label: 'Your engagements',
          title: 'Hired jobs',
          body: `
            <p class="admin-form-hint">After a client selects you, the job appears here. Mark it complete when finished, then submit your review of the client.</p>
            ${filters}`,
          footer: '',
        })}
        ${Components.adminSecondaryPanel({
          title: `Jobs (${data.total || 0})`,
          body: `
            ${PortalPages.freelancerJobsTable(data.items || [])}
            ${Components.pagination(data.page, data.limit, data.total, '/freelancer/jobs', { status: status || undefined })}`,
        })}`,
    );
  },

  async freelancerQuizzes() {
    if (!Auth.requireRole(['freelancer'])) return '';
    const data = await Api.get('/skills', { auth: false, query: { limit: 100 } });
    const profile = await Api.get('/freelancer/profile');
    const publicProfile = await Api.get(`/freelancers/${profile.id}`, { auth: false }).catch(() => ({ skills: [] }));
    const earned = new Set((publicProfile.skills || []).map((s) => s.id));
    const quizzes = (data.items || []).filter((s) => s.quiz);

    return PortalPages.wrap('Skill quizzes', 'Earn badges to apply for jobs', `
      ${Components.adminSecondaryPanel({
        title: `Available quizzes (${quizzes.length})`,
        body: PortalPages.quizListTable(quizzes, earned),
      })}`,
    );
  },

  async freelancerQuizTake({ id }) {
    if (!Auth.requireRole(['freelancer'])) return '';
    let quiz;
    try {
      quiz = await Api.get(`/quizzes/${id}`, { auth: false });
    } catch {
      return PortalPages.wrap('Quiz not found', '', `
        <div class="admin-empty-panel">${Components.emptyState('This quiz is unavailable or not published.')}</div>
        <p class="form-footer"><a data-nav="/freelancer/quizzes">← Back to quizzes</a></p>`);
    }

    const questions = [...(quiz.questions || [])].sort((a, b) => a.position - b.position);
    const questionHtml = questions.map((q, i) => {
      const options = (q.options || []).map(
        (o) => `<label class="radio portal-quiz-option"><input type="radio" name="q_${q.id}" value="${o.id}" required> ${Utils.escapeHtml(o.body)}</label>`
      ).join('');
      return `
        <div class="portal-quiz-question">
          <p class="portal-quiz-q-label">Question ${i + 1}</p>
          <p class="portal-quiz-q-body">${Utils.escapeHtml(q.body)}</p>
          <div class="portal-quiz-options">${options}</div>
        </div>`;
    }).join('');

    return PortalPages.wrap(quiz.skill_name || 'Skill quiz', `${questions.length} questions`, `
      ${Components.adminComposePanel({
        label: 'Quiz',
        title: quiz.skill_name || 'Verification quiz',
        body: `
          <form id="quiz-attempt-form" class="portal-quiz-form" data-form="quizAttempt" data-quiz-id="${id}">
            ${questionHtml}
            <p class="portal-quiz-submit-hint" id="quiz-submit-hint">Answer every question — your quiz submits automatically.</p>
          </form>
          <div id="quiz-result" hidden class="portal-quiz-result"></div>`,
      })}`,
    );
  },
});

FormHandlers.freelancerProfile = async (form) => {
  const fd = new FormData(form);
  const payload = {};
  ['display_name', 'bio', 'contact_email', 'linkedin_url', 'github_url', 'portfolio_url'].forEach((k) => {
    const v = fd.get(k);
    if (v !== '') payload[k] = v;
  });
  payload.available_for_work = fd.get('available_for_work') === 'on';
  try {
    await Api.patch('/freelancer/profile', payload);
    Utils.showToast('Profile updated', 'success');
    await Auth.refreshUser();
    Router.render();
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

FormHandlers.addPortfolio = async (form) => {
  const fd = new FormData(form);
  try {
    await Api.post('/freelancer/portfolio', {
      label: fd.get('label'),
      url: fd.get('url'),
      position: Number(fd.get('position')),
    });
    Utils.showToast('Portfolio link added', 'success');
    form.reset();
    const nextPos = Number(form.dataset.nextPosition || 1) + 1;
    form.dataset.nextPosition = String(nextPos);
    const posInput = form.querySelector('input[name="position"]');
    if (posInput) posInput.value = String(nextPos);
    Router.render();
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

FormHandlers.editPortfolio = async (form) => {
  const linkId = form.dataset.linkId;
  const fd = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  const defaultLabel = submitBtn?.textContent || 'Save link';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
  }
  try {
    await Api.patch(`/freelancer/portfolio/${linkId}`, {
      label: fd.get('label'),
      url: fd.get('url'),
      position: Number(fd.get('position')),
    });
    Utils.showToast('Portfolio link updated', 'success');
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = defaultLabel;
    }
  }
};

function updateFreelancerPhotoPreview(url) {
  const busted = Utils.cacheBustMediaUrl(url);
  const preview = document.getElementById('profile-photo-preview');
  if (preview) {
    preview.innerHTML = `<img src="${Utils.escapeHtml(busted)}" alt="">`;
  }
  document.querySelectorAll('.freelancer-profile-avatar-img').forEach((img) => {
    img.src = busted;
  });
  const letter = document.querySelector('.freelancer-profile-avatar-letter');
  if (letter) {
    const avatar = letter.closest('.freelancer-profile-avatar');
    if (avatar) {
      avatar.innerHTML = `<img class="freelancer-profile-avatar-img" src="${Utils.escapeHtml(busted)}" alt="">`;
    }
  }
}

function updateFreelancerResumePreview(url) {
  const preview = document.getElementById('profile-resume-preview');
  if (!preview) return;
  const href = Utils.resolveMediaUrl(url);
  preview.innerHTML = `<a class="freelancer-profile-resume-link" href="${Utils.escapeHtml(href)}" target="_blank" rel="noopener noreferrer">View current resume</a>`;
}

FormHandlers.quizAttempt = async (form) => {
  if (form.dataset.submitting === '1') return;

  const quizId = form.dataset.quizId;
  const questions = form.querySelectorAll('.portal-quiz-question');
  const payload = [...questions].map((block) => {
    const input = block.querySelector('input[type="radio"]:checked');
    if (!input) return null;
    return {
      question_id: input.name.replace(/^q_/, ''),
      selected_option_id: input.value,
    };
  }).filter(Boolean);

  if (payload.length !== questions.length) {
    Utils.showToast('Please answer every question.', 'error');
    return;
  }

  form.dataset.submitting = '1';
  form.classList.add('is-submitting');
  const hint = document.getElementById('quiz-submit-hint');
  if (hint) hint.textContent = 'Submitting your answers…';

  try {
    const result = await Api.post(`/quizzes/${quizId}/attempt`, payload);
    const panel = form.closest('.admin-compose-panel');
    const el = document.getElementById('quiz-result');
    if (el) {
      el.hidden = false;
      if (result.result === 'pass') {
        el.innerHTML = `
          <h3>Passed — ${result.score}%</h3>
          <p>Skill badge earned. You can now apply to jobs requiring this skill.</p>
          <div class="portal-quiz-result-actions">
            <a class="btn btn-primary" data-nav="/freelancer/dashboard">Back to dashboard</a>
            <a class="btn btn-ghost" data-nav="/freelancer/quizzes">All quizzes</a>
          </div>`;
        el.className = 'portal-quiz-result alert-success';
      } else {
        el.innerHTML = `
          <h3>Failed — ${result.score}%</h3>
          <p>${(result.resources || []).join(' ')}</p>
          ${Components.recommendedCoursesBlock(result.recommended_courses || [])}
          <div class="portal-quiz-result-actions">
            <a class="btn portal-quiz-retry-btn" data-nav="/freelancer/quizzes/${quizId}">Retry quiz</a>
            <a class="btn btn-primary" data-nav="/freelancer/quizzes">All quizzes</a>
            <a class="btn btn-ghost" data-nav="/freelancer/dashboard">Back to dashboard</a>
          </div>`;
        el.className = 'portal-quiz-result alert-error';
      }
      App.bindNavIn(el);
    }
    form.remove();
    panel?.querySelector('.admin-compose-foot')?.remove();
    panel?.querySelector('#quiz-submit-btn')?.remove();
  } catch (err) {
    form.dataset.submitting = '0';
    form.classList.remove('is-submitting');
    if (hint) hint.textContent = 'Answer every question — your quiz submits automatically.';
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

async function uploadFreelancerProfileFile(input, { path, successMessage, refreshUser = false, onSuccess }) {
  const file = input?.files?.[0];
  if (!file) return;

  const zone = input.closest('.hm-file-upload');
  const btn = zone?.querySelector('.hm-file-upload-btn');
  const defaultLabel = btn?.dataset.defaultLabel || btn?.textContent || 'Upload';
  if (btn) {
    btn.dataset.defaultLabel = defaultLabel;
    btn.textContent = 'Uploading…';
  }
  zone?.classList.add('is-uploading');

  try {
    const result = await Api.upload(path, file);
    if (typeof onSuccess === 'function') onSuccess(result?.url);
    Utils.showToast(successMessage, 'success');
    if (refreshUser) await Auth.refreshUser();
    Api.invalidateCache('/freelancers');
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  } finally {
    if (btn) btn.textContent = defaultLabel;
    zone?.classList.remove('is-uploading');
    input.value = '';
    Utils.syncFileUpload(input);
  }
}

document.addEventListener('change', async (e) => {
  if (e.target.id === 'freelancer-jobs-status') {
    Router.navigate(Utils.buildHash('/freelancer/jobs', {
      status: e.target.value || undefined,
    }).slice(1));
  }
  if (e.target.id === 'profile-picture') {
    await uploadFreelancerProfileFile(e.target, {
      path: '/freelancer/profile/picture',
      successMessage: 'Photo uploaded',
      refreshUser: true,
      onSuccess: updateFreelancerPhotoPreview,
    });
    return;
  }
  if (e.target.id === 'profile-resume') {
    await uploadFreelancerProfileFile(e.target, {
      path: '/freelancer/profile/resume',
      successMessage: 'Resume uploaded',
      onSuccess: updateFreelancerResumePreview,
    });
  }
});

document.addEventListener('click', async (e) => {
  const deletePortfolioBtn = e.target.closest('[data-delete-portfolio]');
  if (deletePortfolioBtn) {
    const linkId = deletePortfolioBtn.dataset.deletePortfolio;
    if (!linkId) return;
    const ok = await Utils.confirm({
      title: 'Remove portfolio link?',
      message: 'This link will be removed from your profile.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    deletePortfolioBtn.disabled = true;
    try {
      await Api.delete(`/freelancer/portfolio/${linkId}`);
      deletePortfolioBtn.closest('.freelancer-profile-portfolio-item')?.remove();
      const list = document.getElementById('profile-portfolio-list');
      if (list && !list.querySelector('.freelancer-profile-portfolio-item')) {
        list.outerHTML = '<p class="freelancer-profile-empty" id="profile-portfolio-empty">No portfolio links yet.</p>';
      }
      Utils.showToast('Portfolio link removed', 'success');
    } catch (err) {
      deletePortfolioBtn.disabled = false;
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
    return;
  }

  if (e.target.id === 'delete-freelancer-profile') {
    const ok = await Utils.confirm({
      title: 'Delete your account?',
      message: 'Permanently remove your freelancer profile. This cannot be undone.',
      confirmLabel: 'Delete account',
      danger: true,
    });
    if (!ok) return;
    try {
      await Api.delete('/freelancer/profile');
      Auth.clearSession();
      Utils.showToast('Account deleted', 'success');
      Router.navigate('/');
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
});
