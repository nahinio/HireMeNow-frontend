const Store = {
  SKILLS_TTL_MS: 600000,

  getConversations() {
    return Utils.readJson(CONFIG.CONVERSATIONS_KEY, []);
  },

  saveConversation(conv, meta = {}) {
    const list = Store.getConversations();
    const idx = list.findIndex((c) => c.id === conv.id);
    const entry = {
      id: conv.id,
      client_id: conv.client_id,
      freelancer_id: conv.freelancer_id,
      job_id: conv.job_id,
      phase: conv.phase,
      created_at: conv.created_at,
      ...meta,
    };
    if (idx >= 0) list[idx] = { ...list[idx], ...entry };
    else list.unshift(entry);
    Utils.writeJson(CONFIG.CONVERSATIONS_KEY, list);
  },

  removeConversation(id) {
    Utils.writeJson(
      CONFIG.CONVERSATIONS_KEY,
      Store.getConversations().filter((c) => c.id !== id)
    );
  },

  clearSkillsCache() {
    localStorage.removeItem(CONFIG.SKILLS_CACHE_KEY);
    localStorage.removeItem(CONFIG.SKILLS_CACHE_AT_KEY);
  },

  cacheSkills(skills) {
    const existing = Utils.readJson(CONFIG.SKILLS_CACHE_KEY, []);
    const map = new Map(existing.map((s) => [s.id, s]));
    skills.forEach((s) => {
      if (s && s.id) map.set(s.id, s);
    });
    Utils.writeJson(CONFIG.SKILLS_CACHE_KEY, [...map.values()]);
    localStorage.setItem(CONFIG.SKILLS_CACHE_AT_KEY, String(Date.now()));
  },

  getCachedSkills() {
    return Utils.readJson(CONFIG.SKILLS_CACHE_KEY, []);
  },

  async refreshSkillsCache() {
    const skills = new Map();
    try {
      const data = await Api.get('/skills', { auth: false, query: { limit: 100 }, cache: true });
      (data.items || []).forEach((s) => {
        skills.set(s.id, {
          id: s.id,
          name: s.name,
          description: s.description || '',
          is_active: true,
          quiz: s.quiz || null,
        });
      });
    } catch {
      return Store.getCachedSkills();
    }

    const list = [...skills.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (list.length) {
      Utils.writeJson(CONFIG.SKILLS_CACHE_KEY, list);
      localStorage.setItem(CONFIG.SKILLS_CACHE_AT_KEY, String(Date.now()));
    }
    return list;
  },

  ensureSkillsCache(options = {}) {
    const force = Boolean(options.force);
    const cached = Store.getCachedSkills();
    const cachedAt = Number(localStorage.getItem(CONFIG.SKILLS_CACHE_AT_KEY) || 0);
    const fresh = cached.length && Date.now() - cachedAt < Store.SKILLS_TTL_MS;
    if (!force && fresh) return Promise.resolve(cached);
    return Store.refreshSkillsCache();
  },

  getAppliedJobIds() {
    return new Set(Utils.readJson(CONFIG.APPLIED_JOBS_KEY, []));
  },

  markJobApplied(jobId) {
    const ids = Store.getAppliedJobIds();
    ids.add(String(jobId));
    Utils.writeJson(CONFIG.APPLIED_JOBS_KEY, [...ids]);
  },

  hasAppliedToJob(jobId) {
    return Store.getAppliedJobIds().has(String(jobId));
  },

  getJobCompletionIds() {
    return new Set(Utils.readJson(CONFIG.JOB_COMPLETION_KEY, []));
  },

  markJobCompletionSignalled(jobId) {
    const ids = Store.getJobCompletionIds();
    ids.add(String(jobId));
    Utils.writeJson(CONFIG.JOB_COMPLETION_KEY, [...ids]);
  },

  hasSignalledCompletion(jobId, job = null) {
    return Boolean(job?.viewer_has_signalled_completion)
      || Store.getJobCompletionIds().has(String(jobId));
  },

  getJobReviewIds() {
    return new Set(Utils.readJson(CONFIG.JOB_REVIEWS_KEY, []));
  },

  markJobReviewSubmitted(jobId) {
    const ids = Store.getJobReviewIds();
    ids.add(String(jobId));
    Utils.writeJson(CONFIG.JOB_REVIEWS_KEY, [...ids]);
  },

  hasSubmittedReview(jobId, job = null) {
    return Boolean(job?.viewer_has_submitted_review)
      || Store.getJobReviewIds().has(String(jobId));
  },

  syncJobViewerState(job) {
    if (!job?.id) return;
    if (job.viewer_has_signalled_completion) Store.markJobCompletionSignalled(job.id);
    if (job.viewer_has_submitted_review) Store.markJobReviewSubmitted(job.id);
  },

  clearViewerState() {
    localStorage.removeItem(CONFIG.APPLIED_JOBS_KEY);
    localStorage.removeItem(CONFIG.JOB_COMPLETION_KEY);
    localStorage.removeItem(CONFIG.JOB_REVIEWS_KEY);
    localStorage.removeItem(CONFIG.CONVERSATIONS_KEY);
  },
};
