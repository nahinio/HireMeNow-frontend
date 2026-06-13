const Api = {
  _cache: new Map(),
  _inflight: new Map(),
  CACHE_TTL_MS: 300000,

  _cacheKey(method, path, query) {
    const q = query
      ? Object.entries(query)
        .filter(([, v]) => v != null && v !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
      : '';
    return `${method}:${path}?${q}`;
  },

  useGetCache(path, auth, cache) {
    if (cache === false) return false;
    if (cache === true) return true;
    if (auth) return false;
    if (path.startsWith('/admin/')) return false;
    if (path.startsWith('/auth/')) return false;
    if (path === '/jobs/mine' || path.startsWith('/jobs/mine')) return false;
    if (path.startsWith('/client/') || path.startsWith('/freelancer/')) return false;
    if (path.startsWith('/conversations')) return false;
    if (/^\/jobs\/[^/]+$/.test(path)) return false;
    return (
      path === '/jobs'
      || path.startsWith('/jobs/')
      || path === '/skills'
      || path === '/freelancers'
      || path.startsWith('/freelancers/')
      || path.startsWith('/quizzes/')
      || path.startsWith('/users/')
    );
  },

  invalidateCache(prefix = '') {
    if (!prefix) {
      Api._cache.clear();
      Api._inflight.clear();
      return;
    }
    for (const key of [...Api._cache.keys()]) {
      if (key.includes(prefix)) Api._cache.delete(key);
    }
    for (const key of [...Api._inflight.keys()]) {
      if (key.includes(prefix)) Api._inflight.delete(key);
    }
  },

  afterMutation(method = 'POST', path = '') {
    const userPrefixes = [
      '/client/',
      '/freelancer/',
      '/jobs/mine',
      '/conversations',
      '/conversations/',
      '/admin/',
      '/auth/me',
    ];
    const touchesJobs = path.startsWith('/jobs') && method !== 'GET';
    const touchesSkills = path.includes('/skills') || path.includes('/admin/skills');
    const touchesCourses = path.includes('/courses') || path.includes('/admin/courses');
    const touchesFreelancers = path.startsWith('/freelancer') && method !== 'GET';
    const touchesQuizAttempt = path.startsWith('/quizzes/') && path.endsWith('/attempt');

    for (const key of [...Api._cache.keys()]) {
      let drop = userPrefixes.some((prefix) => key.includes(prefix));
      if (!drop && touchesJobs) drop = key.includes('/jobs');
      if (!drop && touchesSkills) drop = key.includes('/skills');
      if (!drop && touchesCourses) drop = key.includes('/courses');
      if (!drop && touchesFreelancers) drop = key.includes('/freelancers');
      if (!drop && touchesQuizAttempt) {
        drop = key.includes('/freelancers') || key.includes('/skills') || key.includes('/quizzes/');
      }
      if (drop) Api._cache.delete(key);
    }
    for (const key of [...Api._inflight.keys()]) {
      if (!Api._cache.has(key)) Api._inflight.delete(key);
    }
    if ((touchesSkills || touchesQuizAttempt) && typeof Store !== 'undefined' && Store.clearSkillsCache) {
      Store.clearSkillsCache();
    }
    if (path.startsWith('/admin/') && typeof AdminPages !== 'undefined' && AdminPages.invalidateMetrics) {
      AdminPages.invalidateMetrics();
    }
  },

  prefetch(path, opts = {}) {
    Api.get(path, { ...opts, cache: opts.cache ?? true }).catch(() => {});
  },

  async request(method, path, { body, auth = true, formData = false, query, cache } = {}) {
    const url = new URL(CONFIG.API_URL + path);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== '' && v != null) url.searchParams.set(k, v);
      });
    }

    const isGet = method === 'GET';
    const useCache = isGet && Api.useGetCache(path, auth, cache);
    const key = Api._cacheKey(method, path, query);

    if (useCache) {
      const hit = Api._cache.get(key);
      if (hit && hit.expires > Date.now()) return hit.data;
      if (Api._inflight.has(key)) return Api._inflight.get(key);
    }

    const run = async () => {
      /** @type {RequestInit} */
      const opts = { method, headers: {} };

      if (auth) {
        const token = Auth.getToken();
        if (token) opts.headers.Authorization = `Bearer ${token}`;
      }

      if (formData) {
        opts.body = body;
      } else if (body != null) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }

      let res;
      try {
        res = await fetch(url.toString(), opts);
      } catch {
        const hint = CONFIG.IS_LOCAL
          ? `Cannot reach ${CONFIG.API_BASE}. Start the backend: cd HireMeNow-backend, then run uvicorn on port 8000.`
          : 'Check your connection or backend CORS settings.';
        throw { detail: `Network error — ${hint}`, status: 0 };
      }

      if (res.status === 204) return null;

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('json') ? await res.json() : await res.text();

      if (!res.ok) {
        if (res.status === 401 && auth) {
          Auth.handleSessionExpired();
          throw { detail: 'Session expired', status: 401, handled: true };
        }
        if (data && typeof data === 'object' && data.status == null) {
          data.status = res.status;
        }
        throw data;
      }

      if (useCache) {
        Api._cache.set(key, { data, expires: Date.now() + Api.CACHE_TTL_MS });
      }
      return data;
    };

    if (useCache) {
      const pending = run().finally(() => Api._inflight.delete(key));
      Api._inflight.set(key, pending);
      return pending;
    }

    const data = await run();
    if (!isGet) Api.afterMutation(method, path);
    return data;
  },

  get(path, opts) {
    return Api.request('GET', path, opts);
  },
  post(path, body, opts = {}) {
    return Api.request('POST', path, { body, ...opts });
  },
  put(path, body, opts = {}) {
    return Api.request('PUT', path, { body, ...opts });
  },
  patch(path, body, opts = {}) {
    return Api.request('PATCH', path, { body, ...opts });
  },
  delete(path, opts = {}) {
    return Api.request('DELETE', path, opts);
  },
  upload(path, file, opts = {}) {
    const fd = new FormData();
    fd.append('file', file);
    return Api.request('POST', path, { body: fd, formData: true, ...opts });
  },
};
