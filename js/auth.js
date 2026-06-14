const Auth = {
  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  },

  getUser() {
    return Utils.readJson(CONFIG.USER_KEY, null);
  },

  isLoggedIn() {
    return !!Auth.getToken();
  },

  setSession(token, user) {
    Store.clearViewerState();
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
    Utils.writeJson(CONFIG.USER_KEY, user);
    App.updateShell(Router.getPath());
    if (typeof Realtime !== 'undefined') Realtime.connect();
  },

  clearSession() {
    if (typeof Realtime !== 'undefined') Realtime.disconnect();
    Store.clearViewerState();
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    App.updateShell(Router.getPath());
  },

  async login(email, password, admin = false) {
    const path = admin ? '/auth/admin/login' : '/auth/login';
    const data = await Api.post(path, { email, password }, { auth: false });
    localStorage.setItem(CONFIG.TOKEN_KEY, data.access_token);
    const user = await Api.get('/auth/me');
    Auth.setSession(data.access_token, user);
    return user;
  },

  async register(payload) {
    const user = await Api.post('/auth/register', payload, { auth: false });
    const loginData = await Api.post('/auth/login', {
      email: payload.email,
      password: payload.password,
    }, { auth: false });
    const me = await Api.get('/auth/me');
    Auth.setSession(loginData.access_token, me);
    return me;
  },

  logout() {
    Auth.clearSession();
    const landing = '/';
    if (Router.getPath() === landing) {
      App.updateShell(landing);
      Router.render();
    } else {
      Router.navigate(landing);
    }
    Utils.showToast('Logged out', 'success');
  },

  handleSessionExpired() {
    const user = Auth.getUser();
    const onAdmin = Router.getPath().startsWith('/admin') && Router.getPath() !== '/admin/login';
    const loginPath = user?.role === 'admin' || onAdmin ? '/admin/login' : '/login';
    Auth.clearSession();
    Api.afterMutation();
    Utils.showToast('Session expired — sign in again', 'error');
    Router.navigate(loginPath);
    return loginPath;
  },

  requireRole(roles) {
    const user = Auth.getUser();
    const path = typeof Router !== 'undefined' ? Router.getPath() : '';
    const adminRoute = path.startsWith('/admin') && path !== '/admin/login';
    const loginPath = roles.includes('admin') || adminRoute ? '/admin/login' : '/login';

    if (!user || !Auth.getToken()) {
      Router.navigate(loginPath);
      return false;
    }
    if (!roles.includes(user.role)) {
      Utils.showToast('You do not have access to this page', 'error');
      Router.navigate('/');
      return false;
    }
    return true;
  },

  async refreshUser() {
    if (!Auth.getToken()) return null;
    const user = await Api.get('/auth/me');
    Utils.writeJson(CONFIG.USER_KEY, user);
    App.updateShell(Router.getPath());
    return user;
  },

  dashboardPath() {
    const user = Auth.getUser();
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'client') return '/client/dashboard';
    return '/freelancer/dashboard';
  },
};
