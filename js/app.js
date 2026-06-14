const App = {
  AUTH_PATHS: ['/login', '/register', '/forgot-password', '/reset-password', '/admin/login'],
  FOCUS_PATHS: ['/login', '/register', '/forgot-password', '/reset-password', '/admin/login'],

  isFreelancerPortalPath(path) {
    return path.startsWith('/freelancer')
      || path.startsWith('/messages')
      || path === '/jobs'
      || /^\/jobs\/[^/]+$/.test(path)
      || /^\/jobs\/[^/]+\/review$/.test(path);
  },

  isClientPortalPath(path) {
    return path.startsWith('/client')
      || path.startsWith('/messages')
      || path === '/jobs'
      || path === '/freelancers'
      || /^\/jobs\/[^/]+$/.test(path)
      || /^\/jobs\/[^/]+\/review$/.test(path)
      || /^\/freelancers\/[^/]+$/.test(path);
  },

  isFreelancerPortalUser(user, path, loggedIn = Boolean(user && Auth.getToken())) {
    return loggedIn && user?.role === 'freelancer' && App.isFreelancerPortalPath(path);
  },

  isClientPortalUser(user, path, loggedIn = Boolean(user && Auth.getToken())) {
    return loggedIn && user?.role === 'client' && App.isClientPortalPath(path);
  },

  isPublicPortalPath(path) {
    return path === '/'
      || path === '/jobs'
      || path === '/freelancers'
      || /^\/jobs\/[^/]+$/.test(path)
      || /^\/jobs\/[^/]+\/review$/.test(path)
      || /^\/freelancers\/[^/]+$/.test(path);
  },

  init() {
    App.registerRoutes();
    App.bindGlobalNav();
    App.bindSearch();

    window.addEventListener('hashchange', () => {
      App.updateShell(Router.getPath());
      Router.render();
    });

    if (Utils.handleEmailResetLink()) {
      App.updateShell(Router.getPath());
    } else if (!location.hash) {
      location.hash = '#/';
    } else {
      App.updateShell(Router.getPath());
      Router.render();
    }

    Store.ensureSkillsCache();

    FilterForms.init();
    Dropdowns.init();

    if (Auth.getToken() && typeof Realtime !== 'undefined') {
      Realtime.connect();
    }

    if (Auth.getToken()) {
      Auth.refreshUser().catch(() => {});
    }

    const prefetch = () => {
      Api.prefetch('/jobs', { auth: false, query: { limit: 12 } });
      Api.prefetch('/skills', { auth: false, query: { limit: 100 } });
      if (Auth.getUser()?.role === 'admin' && Auth.getToken()) {
        AdminPages.ensureNavMetrics();
        Api.prefetch('/admin/stats');
      }
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(prefetch, { timeout: 1500 });
    } else {
      setTimeout(prefetch, 0);
    }
  },

  bindSearch() {
    const form = document.getElementById('global-search');
    const icon = document.querySelector('.search-bar .icon');
    if (icon) icon.innerHTML = Icons.search;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = new FormData(form).get('q');
      Router.navigate(Utils.buildHash('/jobs', { q: q || undefined }).slice(1));
    });
  },

  bindGlobalNav() {
    document.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate(el.getAttribute('data-nav'));
      });
    });
  },

  bindNavIn(el) {
    el?.querySelectorAll('[data-nav]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate(link.getAttribute('data-nav'));
      });
    });
  },

  updateShell(path) {
    const user = Auth.getUser();
    const loggedIn = user && Auth.getToken();
    const isAuth = App.AUTH_PATHS.includes(path);
    const isAdmin = path.startsWith('/admin')
      && path !== '/admin/login'
      && user?.role === 'admin';
    const isClientPortal = App.isClientPortalUser(user, path, loggedIn);
    const isFreelancerPortal = App.isFreelancerPortalUser(user, path, loggedIn);
    const isPortal = isClientPortal || isFreelancerPortal;
    const isPublicPortal = !isAdmin && !isPortal && App.isPublicPortalPath(path);
    const isFocus = isAuth || path.includes('/messages/') || path.endsWith('/new');
    const params = Utils.getQueryParams();
    const isJobGrid = !isPortal && !isPublicPortal && (path === '/jobs' || (path === '/' && (params.tab || 'jobs') !== 'talent'));

    document.body.classList.toggle('layout-auth', isAuth);
    document.body.classList.toggle('layout-focus', isFocus && !isAuth && !isPortal);
    document.body.classList.toggle('layout-admin', isAdmin);
    document.body.classList.toggle('layout-client-portal', isClientPortal);
    document.body.classList.toggle('layout-portal', isFreelancerPortal);
    document.body.classList.toggle('layout-public-portal', isPublicPortal);
    document.body.classList.toggle('layout-job-grid', isJobGrid && !isAuth && !isAdmin);

    App.renderTopBar(path);
    App.updateLogoLink(path);
    App.renderLeftNav(path);
    App.renderRightRail(path);
  },

  updateLogoLink(path) {
    const logo = document.getElementById('site-logo');
    if (!logo) return;

    const user = Auth.getUser();
    const loggedIn = Boolean(user && Auth.getToken());
    const home = loggedIn ? Auth.dashboardPath() : '/';

    logo.setAttribute('data-nav', home);
    logo.setAttribute('href', `#${home}`);
  },

  renderTopNav(path) {
    const nav = document.getElementById('top-nav');
    if (!nav) return;

    const user = Auth.getUser();
    const loggedIn = Boolean(user && Auth.getToken());
    const isAdmin = path.startsWith('/admin') && path !== '/admin/login' && user?.role === 'admin';
    const isClientPortal = App.isClientPortalUser(user, path, loggedIn);
    const isFreelancerPortal = App.isFreelancerPortalUser(user, path, loggedIn);
    const isPublicPortal = !isAdmin && !isClientPortal && !isFreelancerPortal
      && App.isPublicPortalPath(path);

    let html = '';
    if (isClientPortal) html = PortalPages.clientTopNav(path);
    else if (isFreelancerPortal) html = PortalPages.freelancerTopNav(path);
    else if (isPublicPortal) html = PortalPages.publicTopNav(path);

    if (!html) {
      nav.hidden = true;
      nav.innerHTML = '';
      return;
    }

    nav.hidden = false;
    nav.innerHTML = html;
    App.bindNavIn(nav);
  },

  renderTopBar(path) {
    App.renderTopNav(path);

    const actions = document.getElementById('top-bar-actions');
    if (!actions) return;

    const user = Auth.getUser();
    const loggedIn = user && Auth.getToken();
    const isAdmin = path.startsWith('/admin') && path !== '/admin/login' && user?.role === 'admin';
    const isClientPortal = user?.role === 'client' && Auth.getToken()
      && App.isClientPortalPath(path);
    const isFreelancerPortal = App.isFreelancerPortalUser(user, path, loggedIn);
    const isPublicBrowsing = loggedIn && !isAdmin && !isClientPortal && !isFreelancerPortal
      && App.isPublicPortalPath(path);

    if (loggedIn) {
      const identity = App.getUserMenuIdentity(user);
      const menuLinks = App.getUserMenuLinks(user);
      let html = '';
      if (isAdmin) {
        html += `<span class="top-admin-badge">Admin</span>`;
      } else if (user.role === 'client' && isClientPortal) {
        html += `<a class="btn btn-sm btn-primary top-post-job" data-nav="/client/jobs/new">${Icons.pen}<span>Post job</span></a>`;
      } else if (user.role === 'client') {
        html += `<a class="btn-write" data-nav="/client/jobs/new">${Icons.pen}<span>Post job</span></a>`;
      }
      if (isPublicBrowsing && user.role !== 'admin') {
        html += `<a class="btn btn-member" data-nav="${Auth.dashboardPath()}">Go to dashboard</a>`;
      }
      html += `
        <div class="user-menu" id="user-menu">
          ${App.renderUserMenuButton(identity)}
          <div class="user-menu-dropdown" id="user-menu-dropdown">
            ${App.renderUserMenuHeader(identity)}
            ${menuLinks.map((item) => `
              <a class="user-menu-item" data-nav="${item.path}">${Utils.escapeHtml(item.label)}</a>`).join('')}
            <button type="button" class="user-menu-item user-menu-signout" id="logout-btn">Sign out</button>
          </div>
        </div>`;
      actions.innerHTML = html;

      App.bindUserMenu();

      document.getElementById('logout-btn')?.addEventListener('click', () => {
        App.closeUserMenu();
        Auth.logout();
      });
      actions.querySelectorAll('[data-nav]').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          App.closeUserMenu();
          Router.navigate(el.getAttribute('data-nav'));
        });
      });
    } else {
      actions.innerHTML = `
        <a class="top-link" data-nav="/login">Sign in</a>
        <a class="btn btn-member" data-nav="/register">Get started</a>`;
      actions.querySelectorAll('[data-nav]').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          Router.navigate(el.getAttribute('data-nav'));
        });
      });
    }
  },

  getUserMenuIdentity(user) {
    const name = user.display_name || user.company_name || user.email || 'Account';
    const avatarUrl = user.profile_picture_url
      ? Utils.resolveMediaUrl(user.profile_picture_url)
      : '';
    const initial = Utils.initial(name);
    const avatarInner = avatarUrl
      ? `<img src="${Utils.escapeHtml(avatarUrl)}" alt="" class="avatar-btn-img">`
      : Utils.escapeHtml(initial);
    return { name, email: user.email || '', avatarInner, avatarUrl };
  },

  renderUserMenuButton(identity) {
    return `<button type="button" class="avatar-btn" id="user-menu-btn"
      aria-expanded="false" aria-haspopup="true"
      title="${Utils.escapeHtml(identity.name)}">${identity.avatarInner}</button>`;
  },

  renderUserMenuHeader(identity) {
    const avatar = identity.avatarUrl
      ? `<img src="${Utils.escapeHtml(identity.avatarUrl)}" alt="" class="user-menu-avatar-img">`
      : `<span class="user-menu-avatar-letter">${Utils.escapeHtml(Utils.initial(identity.name))}</span>`;
    return `
      <div class="user-menu-head">
        <div class="user-menu-avatar" aria-hidden="true">${avatar}</div>
        <div class="user-menu-head-text">
          <p class="user-menu-name">${Utils.escapeHtml(identity.name)}</p>
          <p class="user-menu-email">${Utils.escapeHtml(identity.email)}</p>
        </div>
      </div>`;
  },

  getUserMenuLinks(user) {
    if (user.role === 'admin') {
      return [
        { label: 'Admin dashboard', path: '/admin' },
        { label: 'View public site', path: '/' },
      ];
    }
    if (user.role === 'freelancer') {
      return [
        { label: 'Dashboard', path: '/freelancer/dashboard' },
        { label: 'Previous jobs', path: '/freelancer/jobs' },
        { label: 'Profile', path: '/freelancer/profile' },
      ];
    }
    if (user.role === 'client') {
      return [
        { label: 'Dashboard', path: '/client/dashboard' },
        { label: 'My jobs', path: '/client/jobs' },
        { label: 'Profile', path: '/client/profile' },
        { label: 'Messages', path: '/messages' },
        { label: 'Browse jobs', path: '/jobs' },
        { label: 'Browse talent', path: '/freelancers' },
      ];
    }
    return [];
  },

  bindUserMenu() {
    const menu = document.getElementById('user-menu');
    const btn = document.getElementById('user-menu-btn');
    if (!menu || !btn) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    if (!App._userMenuDocBound) {
      App._userMenuDocBound = true;
      document.addEventListener('click', () => App.closeUserMenu());
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') App.closeUserMenu();
      });
    }
  },

  closeUserMenu() {
    const menu = document.getElementById('user-menu');
    const btn = document.getElementById('user-menu-btn');
    menu?.classList.remove('open');
    btn?.setAttribute('aria-expanded', 'false');
  },

  getSidebarItems(user) {
    const items = [
      { icon: Icons.home, label: 'Home', path: '/' },
      { icon: Icons.jobs, label: 'Jobs', path: '/jobs' },
      { icon: Icons.people, label: 'Freelancers', path: '/freelancers' },
    ];

    if (!user || !Auth.getToken()) return items;

    if (user.role === 'admin') {
      return [
        { icon: Icons.grid, label: 'Dashboard', path: '/admin' },
        { icon: Icons.jobs, label: 'Jobs', path: '/admin/jobs' },
        { icon: Icons.book, label: 'Skills', path: '/admin/skills' },
        { icon: Icons.book, label: 'Courses', path: '/admin/courses' },
        { icon: Icons.shield, label: 'Reports', path: '/admin/reports' },
        { icon: Icons.user, label: 'Users', path: '/admin/users' },
      ];
    }

    if (user.role === 'freelancer') {
      items.push(
        { icon: Icons.grid, label: 'Dashboard', path: '/freelancer/dashboard' },
        { icon: Icons.jobs, label: 'Previous jobs', path: '/freelancer/jobs' },
        { icon: Icons.user, label: 'Profile', path: '/freelancer/profile' },
        { icon: Icons.book, label: 'Quizzes', path: '/freelancer/quizzes' },
        { icon: Icons.message, label: 'Messages', path: '/messages' },
      );
    }

    if (user.role === 'client') {
      items.push(
        { icon: Icons.grid, label: 'Dashboard', path: '/client/dashboard' },
        { icon: Icons.user, label: 'Profile', path: '/client/profile' },
        { icon: Icons.pen, label: 'My jobs', path: '/client/jobs' },
        { icon: Icons.message, label: 'Messages', path: '/messages' },
        { icon: Icons.people, label: 'Browse talent', path: '/freelancers' },
      );
    }

    return items;
  },

  renderLeftNav(path) {
    const sidebar = document.getElementById('sidebar-left');
    if (!sidebar) return;

    if (App.AUTH_PATHS.includes(path)) {
      sidebar.innerHTML = '';
      return;
    }

    const user = Auth.getUser();
    const isAdmin = user?.role === 'admin' && path.startsWith('/admin') && path !== '/admin/login';
    const isClientPortal = App.isClientPortalUser(user, path);
    const isFreelancerPortal = App.isFreelancerPortalUser(user, path);
    const isPublicPortal = !isAdmin && !isClientPortal && !isFreelancerPortal
      && App.isPublicPortalPath(path);

    if (isAdmin) {
      sidebar.innerHTML = `
        ${Components.siteLogo({ path: '/admin', className: 'logo logo-sidebar', height: 32 })}
        ${Components.adminNav(path, AdminPages.navMetrics())}`;
      App.bindNavIn(sidebar);
      return;
    }

    if (isClientPortal) {
      sidebar.innerHTML = '';
      return;
    }

    if (isFreelancerPortal || isPublicPortal) {
      sidebar.innerHTML = '';
      return;
    }

    const items = App.getSidebarItems(user);
    const activePath = path.startsWith('/admin/jobs/') ? '/admin/jobs' : path;

    const navHtml = items.map((item) => {
      const active = activePath === item.path
        || (item.path !== '/' && item.path !== '/admin' && activePath.startsWith(item.path))
        || (item.path === '/admin' && activePath === '/admin');
      const toneClass = item.tone ? ` ${item.tone}` : '';
      return `
        <li>
          <a href="#${item.path}" data-nav="${item.path}" class="${active ? 'active' : ''}${toneClass}">
            <span class="nav-icon">${item.icon}</span>
            ${Utils.escapeHtml(item.label)}
          </a>
        </li>`;
    }).join('');

    sidebar.innerHTML = `
      <nav>
        <ul class="side-nav">${navHtml}</ul>
        <div class="side-section">
          <p class="side-section-title">Discover</p>
          <div class="side-tags">
            <a class="side-tag" data-nav="/jobs">Remote</a>
            <a class="side-tag" data-nav="/jobs">Design</a>
            <a class="side-tag" data-nav="/jobs">Development</a>
            <a class="side-tag" data-nav="/freelancers">Talent</a>
          </div>
        </div>
      </nav>`;
    App.bindNavIn(sidebar);
  },

  async renderRightRail(path) {
    const rail = document.getElementById('sidebar-right');
    if (!rail) return;

    if (
      App.AUTH_PATHS.includes(path)
      || document.body.classList.contains('layout-focus')
      || document.body.classList.contains('layout-admin')
      || document.body.classList.contains('layout-portal')
      || document.body.classList.contains('layout-client-portal')
      || document.body.classList.contains('layout-public-portal')
      || document.body.classList.contains('layout-job-grid')
    ) {
      rail.innerHTML = '';
      return;
    }

    rail.innerHTML = '<div class="loading">Loading…</div>';

    let jobs = [];
    let freelancers = [];
    try {
      const [j, f] = await Promise.all([
        Api.get('/jobs', { auth: false, query: { limit: 3 } }),
        Api.get('/freelancers', { auth: false, query: { limit: 3 } }),
      ]);
      jobs = j.items || [];
      freelancers = f.items || [];
    } catch { /* empty rail */ }

    rail.innerHTML = Components.rightRail(jobs, freelancers);
    App.bindNavIn(rail);
  },

  registerRoutes() {
    Router.register('/', Pages.home, Pages.homeShell);
    Router.register('/login', Pages.login);
    Router.register('/register', Pages.register);
    Router.register('/forgot-password', Pages.forgotPassword);
    Router.register('/reset-password', Pages.resetPassword);
    Router.register('/admin/login', Pages.adminLogin);

    Router.register('/jobs', Pages.jobs, Pages.jobsShell);
    Router.register('/jobs/:id', Pages.jobDetail);
    Router.register('/jobs/:id/review', Pages.jobReview);

    Router.register('/freelancers', Pages.freelancers);
    Router.register('/freelancers/:id', Pages.freelancerDetail);
    Router.register('/courses', async () => {
      Router.navigate('/jobs');
      return false;
    });

    Router.register('/freelancer/dashboard', Pages.freelancerDashboard);
    Router.register('/freelancer/jobs', Pages.freelancerJobs);
    Router.register('/freelancer/profile', Pages.freelancerProfile);
    Router.register('/freelancer/quizzes', Pages.freelancerQuizzes);
    Router.register('/freelancer/quizzes/:id', Pages.freelancerQuizTake);

    Router.register('/client/dashboard', Pages.clientDashboard);
    Router.register('/client/profile', Pages.clientProfile);
    Router.register('/client/jobs', Pages.clientJobs);
    Router.register('/client/jobs/new', Pages.clientJobNew);
    Router.register('/client/jobs/:id/applicants', Pages.clientApplicants);

    Router.register('/messages', Pages.messagesList);
    Router.register('/messages/:id', Pages.messagesChat);

    Router.register('/admin', Pages.adminDashboard, Pages.adminDashboardShell);
    Router.register('/admin/skills', Pages.adminSkills, Pages.adminSkillsShell);
    Router.register('/admin/skills/:id/edit', Pages.adminSkillEdit, Pages.adminSkillEditShell);
    Router.register('/admin/courses', Pages.adminCourses);
    Router.register('/admin/reports', Pages.adminReports);
    Router.register('/admin/jobs', Pages.adminJobs);
    Router.register('/admin/jobs/:id/applicants', Pages.adminJobApplicants);
    Router.register('/admin/users', Pages.adminUsers, Pages.adminUsersShell);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
