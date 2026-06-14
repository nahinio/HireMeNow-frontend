const Pages = {
  notFound() {
    return PortalPages.wrap('Page not found', '', `
      <div class="admin-empty-panel">${Components.emptyState('The page you requested does not exist.')}</div>
      <p class="form-footer"><a data-nav="/">← Go home</a></p>`);
  },

  homeShell() {
    const params = Utils.getQueryParams();
    const tab = params.tab || 'jobs';
    return PortalPages.wrap(
      'Home',
      tab === 'talent' ? 'Discover freelancers' : 'Recommended jobs',
      `
        ${Components.filterBar(`
          <div class="filter-home-tabs">
            <button type="button" class="btn btn-sm ${tab === 'jobs' ? 'btn-primary' : 'btn-ghost'}" data-tab="jobs">Jobs</button>
            <button type="button" class="btn btn-sm ${tab === 'talent' ? 'btn-primary' : 'btn-ghost'}" data-tab="talent">Talent</button>
          </div>`, `<a class="filter-bar-link" data-nav="${tab === 'talent' ? '/freelancers' : '/jobs'}">See all →</a>`)}
        <div id="home-feed" class="portal-job-grid">
          ${tab === 'jobs' ? Components.jobGridSkeleton(6) : '<div class="skeleton-feed"><div class="skeleton-line"></div><div class="skeleton-line"></div></div>'}
        </div>`,
    );
  },

  async home() {
    const params = Utils.getQueryParams();
    const tab = params.tab || 'jobs';
    const slot = document.getElementById('home-feed');
    if (!slot) return Pages.homeShell();

    try {
      if (tab === 'talent') {
        const f = await Api.get('/freelancers', { auth: false, query: { limit: 9 } });
        const freelancers = f.items || [];
        slot.className = '';
        slot.innerHTML = freelancers.length
          ? Components.talentGrid(freelancers)
          : Components.emptyState('No freelancers yet');
        App.bindNavIn(slot);
      } else {
        const j = await Api.get('/jobs', { auth: false, query: { limit: 12 } });
        const jobs = j.items || [];
        jobs.forEach((job) => Store.cacheSkills(job.required_skills || []));
        slot.className = 'portal-job-grid feed-jobs-grid';
        slot.innerHTML = Components.jobGrid(jobs, {
          emptyMessage: 'No open jobs yet',
          showHeader: false,
        });
        App.bindNavIn(slot);
      }
    } catch {
      slot.innerHTML = Components.emptyState('Could not load content');
    }
    return false;
  },
};

document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-tab]');
  if (!tab || Router.getPath() !== '/') return;
  e.preventDefault();
  Router.navigate(Utils.buildHash('/', { tab: tab.dataset.tab }).slice(1));
});
