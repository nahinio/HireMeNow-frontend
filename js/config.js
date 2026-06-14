/** @typedef {'freelancer'|'client'|'admin'} UserRole */

const isLocalDev =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1';

const CONFIG = {
  /** True when opened from localhost / 127.0.0.1 (Live Server, etc.) */
  IS_LOCAL: isLocalDev,
  /** Local: same host as the page on port 8000. Deployed: Render API. */
  API_BASE: isLocalDev
    ? `${location.protocol}//${location.hostname}:8000`
    : 'https://hiremenow-backend-faster.onrender.com',
  API_PREFIX: '/api/v1',
  TOKEN_KEY: 'hiremenow_token',
  USER_KEY: 'hiremenow_user',
  CONVERSATIONS_KEY: 'hiremenow_conversations',
  SKILLS_CACHE_KEY: 'hiremenow_skills_cache',
  SKILLS_CACHE_AT_KEY: 'hiremenow_skills_cache_at',
  APPLIED_JOBS_KEY: 'hiremenow_applied_jobs',
  JOB_COMPLETION_KEY: 'hiremenow_job_completions',
  JOB_REVIEWS_KEY: 'hiremenow_job_reviews',
  MESSAGE_POLL_MS: 5000,
  LOGO_URL: 'assets/logo.png',
  LOGO_ALT: 'HireMeNow',
  SITE_NAME: 'HireMeNow',
};

CONFIG.API_URL = CONFIG.API_BASE + CONFIG.API_PREFIX;
