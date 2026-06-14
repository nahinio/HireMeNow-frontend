const Messages = {
  activeChatId: null,
  unsubscribers: [],

  clearBindings() {
    Messages.unsubscribers.forEach((off) => off());
    Messages.unsubscribers = [];
    Messages.activeChatId = null;
  },

  bindChat(conversationId, renderMessage) {
    Messages.clearBindings();
    Messages.activeChatId = conversationId;

    const onNew = (data) => {
      if (data.conversation_id !== conversationId || !data.message) return;
      renderMessage(data.message);
    };
    const onRead = (data) => {
      if (data.conversation_id !== conversationId) return;
      const ids = new Set(data.message_ids || []);
      document.querySelectorAll('[data-message-id]').forEach((el) => {
        if (ids.has(el.dataset.messageId)) {
          const small = el.querySelector('small');
          if (small && !small.textContent.includes('read')) {
            small.textContent += ' · read';
          }
        }
      });
    };

    Messages.unsubscribers.push(Realtime.on('message.new', onNew));
    Messages.unsubscribers.push(Realtime.on('messages.read', onRead));
  },

  renderMessageHtml(message, user) {
    const mine = message.sender_id === user.id;
    const system = message.is_system;
    const cls = system ? 'system' : (mine ? 'mine' : 'theirs');
    const label = system ? 'System' : '';
    return `<div class="message ${cls}" data-message-id="${message.id}">
      ${label ? `<span class="message-label">${Utils.escapeHtml(label)}</span>` : ''}
      <p>${Utils.escapeHtml(message.body)}</p>
      <small>${Utils.formatDate(message.sent_at)}${message.is_read ? ' · read' : ''}</small>
    </div>`;
  },

  appendMessage(message, user) {
    const box = document.getElementById('message-list');
    if (!box) return;
    const existing = box.querySelector(`[data-message-id="${message.id}"]`);
    if (existing) return;
    box.insertAdjacentHTML('beforeend', Messages.renderMessageHtml(message, user));
    box.scrollTop = box.scrollHeight;
  },

  async syncConversations() {
    try {
      const items = await Api.get('/conversations');
      items.forEach((c) => Store.saveConversation(c, { job_title: c.job_title }));
      return items;
    } catch (err) {
      if (!err?.handled) Utils.showToast(Utils.parseApiError(err), 'error');
      return [];
    }
  },
};

Object.assign(Pages, {
  async messagesList() {
    if (!Auth.requireRole(['freelancer', 'client'])) return '';
    Messages.clearBindings();
    Realtime.connect();

    const convos = await Messages.syncConversations();

    const list = convos.length
      ? convos.map((c) => `
          <a class="portal-convo-card" data-nav="/messages/${c.id}">
            <span class="admin-entity-name">${Utils.escapeHtml(c.job_title || 'Job conversation')}</span>
            <span class="admin-td-sub">Phase: ${Utils.escapeHtml(c.phase)}</span>
          </a>`).join('')
      : Components.emptyState('No conversations yet. A chat opens automatically when a client hires you for a job.');

    return PortalPages.wrap('Messages', 'Client ↔ freelancer conversations', `
      ${Components.adminSecondaryPanel({
        title: `Conversations (${convos.length})`,
        body: `<div class="portal-convo-list">${list}</div>`,
      })}`);
  },

  async messagesChat({ id }) {
    if (!Auth.requireRole(['freelancer', 'client'])) return '';
    Messages.clearBindings();
    Realtime.connect();

    const user = Auth.getUser();
    let meta;
    try {
      meta = await Api.get(`/conversations/${id}`);
      Store.saveConversation(meta, { job_title: meta.job_title });
    } catch (err) {
      if (err?.handled) return false;
      return PortalPages.wrap('Conversation', '', `
        <div class="alert alert-error">${Utils.escapeHtml(Utils.parseApiError(err))}</div>
        <p class="form-footer"><a data-nav="/messages">← Back to messages</a></p>`);
    }

    let messages = [];
    try {
      messages = await Api.get(`/conversations/${id}/messages`);
    } catch (err) {
      if (err?.handled) return false;
      return PortalPages.wrap('Conversation', '', `
        <div class="alert alert-error">${Utils.escapeHtml(Utils.parseApiError(err))}</div>
        <p class="form-footer"><a data-nav="/messages">← Back to messages</a></p>`);
    }

    const renderMessages = (msgs) => msgs.map((m) => Messages.renderMessageHtml(m, user)).join('');

    Messages.bindChat(id, (message) => Messages.appendMessage(message, user));

    const locked = meta.phase === 'is_locked';
    const reportBtn = user.role === 'client' && meta.freelancer_id
      ? `<button type="button" class="btn btn-ghost-danger btn-sm" id="report-freelancer" data-user-id="${meta.freelancer_id}">Report freelancer</button>`
      : user.role === 'freelancer' && meta.client_id
        ? `<button type="button" class="btn btn-ghost-danger btn-sm" id="report-client" data-user-id="${meta.client_id}">Report client</button>`
        : '';

    requestAnimationFrame(() => {
      const box = document.getElementById('message-list');
      if (box) box.scrollTop = box.scrollHeight;
    });

    return PortalPages.wrap(meta.job_title || 'Chat', `Conversation ${id.slice(0, 8)}…`, `
      ${PortalPages.contentPanel(`
        ${locked ? '<p class="alert">This conversation is locked.</p>' : ''}
        <div id="message-list" class="message-list portal-message-list">${renderMessages(messages)}</div>
        ${locked ? '' : `
          <form class="admin-compose-form portal-message-compose" data-form="sendMessage" data-conversation-id="${id}" id="send-message-form">
            ${Components.field('Message', 'body', 'textarea', '', 'required rows="2"')}
          </form>`}`, {
        footer: locked
          ? `<a class="btn btn-ghost" data-nav="/messages">← All messages</a>${reportBtn}`
          : `<a class="btn btn-ghost" data-nav="/messages">← All messages</a>${reportBtn}<button type="submit" form="send-message-form" class="btn btn-primary">Send</button>`,
      })}`);
  },
});

FormHandlers.sendMessage = async (form) => {
  const id = form.dataset.conversationId;
  const fd = new FormData(form);
  const body = String(fd.get('body') || '').trim();
  if (!body) return;

  const user = Auth.getUser();
  const sentViaWs = Realtime.sendMessage(id, body);

  if (sentViaWs) {
    form.reset();
    return;
  }

  try {
    const message = await Api.post(`/conversations/${id}/messages`, { body });
    form.reset();
    Messages.appendMessage(message, user);
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

document.addEventListener('click', async (e) => {
  if (e.target.id === 'report-freelancer' || e.target.id === 'report-client') {
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
