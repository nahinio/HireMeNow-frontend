/** @typedef {'freelancer'|'client'|'admin'} UserRole */

const isLocalDev =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1';

const CONFIG = {
  API_BASE: isLocalDev
    ? 'http://localhost:8000'
    : 'https://hiremenow-backend-8la2.onrender.com',
  API_PREFIX: '/api/v1',
  TOKEN_KEY: 'hiremenow_token',
  USER_KEY: 'hiremenow_user',
  CONVERSATIONS_KEY: 'hiremenow_conversations',
  SKILLS_CACHE_KEY: 'hiremenow_skills_cache',
  MESSAGE_POLL_MS: 5000,
};

CONFIG.API_URL = CONFIG.API_BASE + CONFIG.API_PREFIX;
