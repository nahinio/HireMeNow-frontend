Object.assign(Pages, {
  async freelancers() {
    const params = Utils.getQueryParams();
    const page = Number(params.page) || 1;
    const q = params.q || '';
    const available = params.available_for_work || '';
    const skills = await Store.ensureSkillsCache();

    const data = await Api.get('/freelancers', {
      auth: false,
      query: {
        page,
        limit: 12,
        q: q || undefined,
        available_for_work: available === 'true' ? true : available === 'false' ? false : undefined,
        skill_id: params.skill_id || undefined,
      },
    });

    const skillOptions = skills.map(
      (s) => `<option value="${s.id}" ${s.id === (params.skill_id || '') ? 'selected' : ''}>${Utils.escapeHtml(s.name)}</option>`
    ).join('');

    const chips = [];
    const clearParams = {};
    if (q) {
      chips.push({
        label: q,
        params: {
          skill_id: params.skill_id || undefined,
          available_for_work: available || undefined,
        },
      });
    }
    if (params.skill_id) {
      const skill = skills.find((s) => s.id === params.skill_id);
      chips.push({
        label: skill?.name || 'Skill',
        params: { q: q || undefined, available_for_work: available || undefined },
      });
    }
    if (available) {
      chips.push({
        label: available === 'true' ? 'Available' : 'Not available',
        params: { q: q || undefined, skill_id: params.skill_id || undefined },
      });
    }

    return PortalPages.wrap('Freelancers', 'Browse skilled talent', `
      ${Components.filterBar(
        Components.filterToolbar({
          id: 'freelancer-filters',
          path: '/freelancers',
          search: { name: 'q', placeholder: 'Search name…', value: q },
          selects: [
            {
              name: 'skill_id',
              label: 'Skill',
              value: params.skill_id || '',
              options: `<option value="">All skills</option>${skillOptions}`,
            },
            {
              name: 'available_for_work',
              label: 'Availability',
              value: available,
              options: `
                <option value="">Any availability</option>
                <option value="true" ${available === 'true' ? 'selected' : ''}>Available</option>
                <option value="false" ${available === 'false' ? 'selected' : ''}>Unavailable</option>`,
            },
          ],
          chips,
          clearParams,
        }),
        Components.filterCountBadge(`${data.total || 0} freelancers`),
      )}
      ${Components.talentGrid(data.items || [], { emptyMessage: 'No freelancers found' })}
      ${Components.pagination(data.page, data.limit, data.total, '/freelancers', {
        q: q || undefined,
        skill_id: params.skill_id || undefined,
        available_for_work: available || undefined,
      })}`);
  },

  async freelancerDetail({ id }) {
    const f = await Api.get(`/freelancers/${id}`, { auth: false });
    const reviews = await Api.get(`/users/${f.user_id}/reviews`, { auth: false }).catch(() => []);

    let actionsHtml = '';
    const user = Auth.getUser();
    if (user?.role === 'client') {
      actionsHtml = '<button type="button" class="btn btn-ghost-danger btn-block" id="report-user" data-user-id="' + f.user_id + '">Report user</button>';
    }

    return `<div class="portal-console"><div class="portal-console-body">${Components.freelancerDetailPage(f, reviews || [], actionsHtml)}</div></div>`;
  },
});

document.addEventListener('click', async (e) => {
  if (e.target.id === 'report-user') {
    const userId = e.target.dataset.userId;
    const description = await Utils.prompt({
      title: 'Report user',
      message: 'Describe the issue so our team can review it.',
      placeholder: 'What happened?',
      confirmLabel: 'Submit report',
    });
    if (!description) return;
    try {
      await Api.post('/reports', { reported_user_id: userId, description });
      Utils.showToast('Report submitted', 'success');
    } catch (err) {
      Utils.showToast(Utils.parseApiError(err), 'error');
    }
  }
});
