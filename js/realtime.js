const Realtime = {
  ws: null,
  reconnectTimer: null,
  pingTimer: null,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  handlers: new Map(),
  intentionalClose: false,

  wsUrl() {
    const base = CONFIG.API_BASE.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'));
    const token = encodeURIComponent(Auth.getToken() || '');
    return `${base}${CONFIG.API_PREFIX}/ws/chat?token=${token}`;
  },

  shouldConnect() {
    const user = Auth.getUser();
    return Boolean(
      Auth.getToken()
      && user
      && (user.role === 'client' || user.role === 'freelancer')
    );
  },

  connect() {
    if (!Realtime.shouldConnect()) return;
    if (Realtime.ws && (Realtime.ws.readyState === WebSocket.OPEN || Realtime.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    Realtime.intentionalClose = false;
    Realtime.ws = new WebSocket(Realtime.wsUrl());

    Realtime.ws.onopen = () => {
      Realtime.reconnectDelay = 1000;
      Realtime._startPing();
    };

    Realtime.ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data);
        Realtime._emit(frame.event, frame.data || {});
      } catch { /* ignore malformed frames */ }
    };

    Realtime.ws.onclose = () => {
      Realtime._stopPing();
      Realtime.ws = null;
      if (!Realtime.intentionalClose) Realtime._scheduleReconnect();
    };

    Realtime.ws.onerror = () => {
      Realtime.ws?.close();
    };
  },

  disconnect() {
    Realtime.intentionalClose = true;
    clearTimeout(Realtime.reconnectTimer);
    Realtime.reconnectTimer = null;
    Realtime._stopPing();
    if (Realtime.ws) {
      Realtime.ws.close();
      Realtime.ws = null;
    }
  },

  _scheduleReconnect() {
    if (!Realtime.shouldConnect()) return;
    clearTimeout(Realtime.reconnectTimer);
    Realtime.reconnectTimer = setTimeout(() => {
      Realtime.connect();
      Realtime.reconnectDelay = Math.min(Realtime.reconnectDelay * 2, Realtime.maxReconnectDelay);
    }, Realtime.reconnectDelay);
  },

  _startPing() {
    Realtime._stopPing();
    Realtime.pingTimer = setInterval(() => {
      Realtime.send('ping');
    }, 25000);
  },

  _stopPing() {
    if (Realtime.pingTimer) {
      clearInterval(Realtime.pingTimer);
      Realtime.pingTimer = null;
    }
  },

  send(type, payload = {}) {
    if (Realtime.ws?.readyState !== WebSocket.OPEN) return false;
    Realtime.ws.send(JSON.stringify({ type, ...payload }));
    return true;
  },

  sendMessage(conversationId, body) {
    return Realtime.send('send_message', {
      conversation_id: conversationId,
      body,
    });
  },

  on(event, handler) {
    if (!Realtime.handlers.has(event)) Realtime.handlers.set(event, new Set());
    Realtime.handlers.get(event).add(handler);
    return () => Realtime.handlers.get(event)?.delete(handler);
  },

  _emit(event, data) {
    const handlers = Realtime.handlers.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch { /* handler errors should not break the socket */ }
    });
  },
};

Realtime.on('conversation.created', (data) => {
  if (!data?.conversation) return;
  Store.saveConversation(data.conversation, { job_title: data.conversation.job_title });
  const path = Router.getPath();
  if (path === '/messages') Router.render();
});

Realtime.on('conversation.locked', (data) => {
  if (!data?.conversation_id) return;
  const convos = Store.getConversations();
  const entry = convos.find((c) => c.id === data.conversation_id);
  if (entry) {
    Store.saveConversation({ ...entry, phase: data.phase || 'is_locked' });
  }
  const path = Router.getPath();
  if (path === `/messages/${data.conversation_id}` || path === '/messages') {
    Router.render();
  }
});
