const SkillQuizBuilder = {
  MAX_QUESTIONS: 100,
  questions: [],
  editIndex: null,
  _escapeBound: false,

  ensureModalBindings() {
    const modal = document.getElementById('quiz-question-modal');
    if (!modal || modal.dataset.bound === '1') return;
    modal.dataset.bound = '1';

    const sync = () => SkillQuizBuilder.updateLivePreview();

    modal.addEventListener('input', (e) => {
      if (e.target.matches('#quiz-q-body, .quiz-option-input')) sync();
    });
    modal.addEventListener('change', (e) => {
      if (e.target.matches('input[name="quiz-correct"]')) sync();
    });
    modal.addEventListener('click', (e) => {
      const row = e.target.closest('.quiz-option-item');
      if (row && !e.target.classList.contains('quiz-option-input')) {
        const radio = row.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          sync();
        }
      }
    });
    document.getElementById('quiz-question-form')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        SkillQuizBuilder.saveQuestion();
      }
    });
  },

  reset() {
    SkillQuizBuilder.questions = [];
    SkillQuizBuilder.editIndex = null;
  },

  loadFromApi(detail) {
    SkillQuizBuilder.reset();
    SkillQuizBuilder.questions = (detail.questions || []).map((q) => {
      const correctIdx = q.options.findIndex((o) => o.is_correct);
      return {
        body: q.body,
        options: q.options.map((o) => o.body),
        correctIndex: correctIdx >= 0 ? correctIdx : 0,
      };
    });
    SkillQuizBuilder.renderList();
  },

  toPayload() {
    return SkillQuizBuilder.questions.map((q, i) => ({
      body: q.body,
      position: i + 1,
      options: q.options.map((body, idx) => ({
        body,
        is_correct: idx === q.correctIndex,
      })),
    }));
  },

  questionLabel(index) {
    return index !== null && index >= 0
      ? `Question ${index + 1}`
      : `Question ${SkillQuizBuilder.questions.length + 1}`;
  },

  openModal(index = null) {
    const isEdit = index !== null && index >= 0;
    SkillQuizBuilder.editIndex = isEdit ? index : null;

    const form = document.getElementById('quiz-question-form');
    if (isEdit) {
      const q = SkillQuizBuilder.questions[index];
      document.getElementById('quiz-q-body').value = q.body;
      q.options.forEach((opt, i) => {
        document.getElementById(`quiz-opt-${i}`).value = opt;
      });
      document.querySelector(`input[name="quiz-correct"][value="${q.correctIndex}"]`).checked = true;
    } else {
      form?.reset();
      const first = document.querySelector('input[name="quiz-correct"][value="0"]');
      if (first) first.checked = true;
    }

    const modal = document.getElementById('quiz-question-modal');
    modal?.classList.add('open');
    document.body.classList.add('quiz-modal-open');

    document.getElementById('quiz-modal-title').textContent =
      isEdit ? `Edit ${SkillQuizBuilder.questionLabel(index)}` : 'New question';
    document.getElementById('quiz-modal-save').textContent =
      isEdit ? 'Save changes' : 'Add to quiz';

    SkillQuizBuilder.updateModalMeta();
    SkillQuizBuilder.updateLivePreview();
    SkillQuizBuilder.ensureModalBindings();

    requestAnimationFrame(() => {
      document.getElementById('quiz-q-body')?.focus();
    });
  },

  closeModal() {
    document.getElementById('quiz-question-modal')?.classList.remove('open');
    document.body.classList.remove('quiz-modal-open');
    SkillQuizBuilder.editIndex = null;
  },

  readModalForm() {
    const body = document.getElementById('quiz-q-body')?.value.trim() || '';
    const options = [0, 1, 2, 3].map((i) =>
      document.getElementById(`quiz-opt-${i}`)?.value.trim() || ''
    );
    const correctRadio = document.querySelector('input[name="quiz-correct"]:checked');
    const correctIndex = correctRadio ? Number(correctRadio.value) : 0;
    return { body, options, correctIndex };
  },

  saveQuestion() {
    const { body, options, correctIndex } = SkillQuizBuilder.readModalForm();

    if (!body) {
      Utils.showToast('Question text is required', 'error');
      document.getElementById('quiz-q-body')?.focus();
      return;
    }
    const emptyOpt = options.findIndex((o) => !o);
    if (emptyOpt >= 0) {
      Utils.showToast(`Option ${String.fromCharCode(65 + emptyOpt)} is required`, 'error');
      document.getElementById(`quiz-opt-${emptyOpt}`)?.focus();
      return;
    }

    const entry = { body, options, correctIndex };

    if (SkillQuizBuilder.editIndex !== null) {
      SkillQuizBuilder.questions[SkillQuizBuilder.editIndex] = entry;
      Utils.showToast('Question updated', 'success');
    } else {
      if (SkillQuizBuilder.questions.length >= SkillQuizBuilder.MAX_QUESTIONS) {
        Utils.showToast(`Maximum ${SkillQuizBuilder.MAX_QUESTIONS} questions`, 'error');
        return;
      }
      SkillQuizBuilder.questions.push(entry);
      Utils.showToast('Question added', 'success');
    }

    SkillQuizBuilder.closeModal();
    SkillQuizBuilder.renderList();
  },

  async removeQuestion(index) {
    const ok = await Utils.confirm({
      title: `Remove question ${index + 1}?`,
      message: 'This question will be removed from the quiz draft.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    SkillQuizBuilder.questions.splice(index, 1);
    SkillQuizBuilder.renderList();
    Utils.showToast('Question removed', 'success');
  },

  moveQuestion(index, direction) {
    const next = index + direction;
    if (next < 0 || next >= SkillQuizBuilder.questions.length) return;
    const items = SkillQuizBuilder.questions;
    [items[index], items[next]] = [items[next], items[index]];
    SkillQuizBuilder.renderList();
  },

  duplicateQuestion(index) {
    if (SkillQuizBuilder.questions.length >= SkillQuizBuilder.MAX_QUESTIONS) {
      Utils.showToast(`Maximum ${SkillQuizBuilder.MAX_QUESTIONS} questions`, 'error');
      return;
    }
    const src = SkillQuizBuilder.questions[index];
    SkillQuizBuilder.questions.splice(index + 1, 0, {
      body: src.body,
      options: [...src.options],
      correctIndex: src.correctIndex,
    });
    SkillQuizBuilder.renderList();
    Utils.showToast('Question duplicated', 'success');
  },

  updateModalMeta() {
    const total = SkillQuizBuilder.questions.length;
    const slot = document.getElementById('quiz-modal-slot');
    if (slot) {
      const n = SkillQuizBuilder.editIndex !== null
        ? SkillQuizBuilder.editIndex + 1
        : total + 1;
      slot.textContent = `${n} / ${SkillQuizBuilder.MAX_QUESTIONS}`;
    }
  },

  updateLivePreview() {
    const panel = document.getElementById('quiz-live-preview');
    if (!panel) return;

    const { body, options, correctIndex } = SkillQuizBuilder.readModalForm();
    const hasContent = body || options.some(Boolean);

    panel.hidden = !hasContent;
    if (!hasContent) return;

    panel.innerHTML = `
      <p class="quiz-preview-question">${Utils.escapeHtml(body) || 'Question…'}</p>
      <ul class="quiz-preview-options">
        ${options.map((opt, idx) => `
          <li class="${idx === correctIndex ? 'is-correct' : ''}">
            <span>${String.fromCharCode(65 + idx)}</span>
            ${Utils.escapeHtml(opt) || '…'}
          </li>`).join('')}
      </ul>`;
  },

  updateProgress() {
    const count = SkillQuizBuilder.questions.length;
    const pct = Math.min(100, Math.round((count / SkillQuizBuilder.MAX_QUESTIONS) * 100));

    const bar = document.getElementById('quiz-progress-bar');
    if (bar) bar.style.width = `${pct}%`;

    const label = document.getElementById('quiz-count-label');
    if (label) label.textContent = `${count} / ${SkillQuizBuilder.MAX_QUESTIONS}`;

    const stat = document.getElementById('quiz-stat-ready');
    if (stat) {
      stat.textContent = count === 0
        ? 'Add at least 1 question'
        : count === 1
          ? '1 question ready'
          : `${count} questions ready`;
    }

    const addBtn = document.getElementById('btn-add-quiz-question');
    const atMax = count >= SkillQuizBuilder.MAX_QUESTIONS;
    if (addBtn) {
      addBtn.disabled = atMax;
      addBtn.classList.toggle('is-disabled', atMax);
    }

    const headAdd = document.getElementById('btn-add-quiz-head');
    if (headAdd) headAdd.disabled = atMax;
  },

  renderList() {
    const list = document.getElementById('quiz-questions-list');
    if (!list) return;

    if (!SkillQuizBuilder.questions.length) {
      list.innerHTML = `
        <div class="quiz-empty-state">
          <div class="quiz-empty-icon">${Icons.book}</div>
          <h5>No questions yet</h5>
          <p>Build a verification quiz with up to ${SkillQuizBuilder.MAX_QUESTIONS} multiple-choice questions.</p>
          <button type="button" class="btn btn-primary quiz-empty-cta" id="btn-add-quiz-empty">Add first question</button>
        </div>`;
      document.getElementById('btn-add-quiz-empty')?.addEventListener('click', () => {
        SkillQuizBuilder.openModal();
      });
      SkillQuizBuilder.updateProgress();
      return;
    }

    list.innerHTML = SkillQuizBuilder.questions.map((q, i) => `
      <article class="quiz-question-card" data-index="${i}">
        <button type="button" class="quiz-card-main quiz-edit-btn" data-index="${i}" aria-label="Edit question ${i + 1}">
          <span class="quiz-question-num">${i + 1}</span>
          <div class="quiz-question-body">
            <p class="quiz-question-text">${Utils.escapeHtml(q.body)}</p>
            <div class="quiz-question-opts-grid">
              ${q.options.map((o, idx) => `
                <div class="quiz-opt-chip ${idx === q.correctIndex ? 'is-correct' : ''}">
                  <span class="quiz-opt-mark">${String.fromCharCode(65 + idx)}</span>
                  <span class="quiz-opt-text">${Utils.escapeHtml(o)}</span>
                </div>`).join('')}
            </div>
          </div>
        </button>
        <div class="quiz-card-toolbar">
          <button type="button" class="quiz-icon-btn" data-action="up" data-index="${i}" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="quiz-icon-btn" data-action="down" data-index="${i}" title="Move down" ${i === SkillQuizBuilder.questions.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="quiz-icon-btn" data-action="dup" data-index="${i}" title="Duplicate">⧉</button>
          <button type="button" class="quiz-icon-btn quiz-icon-btn-edit quiz-edit-btn" data-index="${i}" title="Edit">${Icons.pen}</button>
          <button type="button" class="quiz-icon-btn quiz-icon-btn-danger" data-action="remove" data-index="${i}" title="Remove">×</button>
        </div>
      </article>`).join('');

    SkillQuizBuilder.updateProgress();
  },

  bindEvents() {
    SkillQuizBuilder.ensureModalBindings();

    document.getElementById('btn-add-quiz-question')?.addEventListener('click', () => {
      SkillQuizBuilder.openModal();
    });
    document.getElementById('btn-add-quiz-head')?.addEventListener('click', () => {
      SkillQuizBuilder.openModal();
    });

    document.getElementById('quiz-modal-close')?.addEventListener('click', () => {
      SkillQuizBuilder.closeModal();
    });
    document.getElementById('quiz-modal-cancel')?.addEventListener('click', () => {
      SkillQuizBuilder.closeModal();
    });
    document.getElementById('quiz-modal-save')?.addEventListener('click', () => {
      SkillQuizBuilder.saveQuestion();
    });

    document.getElementById('quiz-question-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'quiz-question-modal') SkillQuizBuilder.closeModal();
    });

    if (!SkillQuizBuilder._escapeBound) {
      SkillQuizBuilder._escapeBound = true;
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (document.getElementById('quiz-question-modal')?.classList.contains('open')) {
          SkillQuizBuilder.closeModal();
        }
      });
    }

    document.getElementById('quiz-questions-list')?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.quiz-edit-btn');
      if (editBtn) {
        SkillQuizBuilder.openModal(Number(editBtn.dataset.index));
        return;
      }

      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;
      const index = Number(actionBtn.dataset.index);
      const action = actionBtn.dataset.action;
      if (action === 'up') SkillQuizBuilder.moveQuestion(index, -1);
      else if (action === 'down') SkillQuizBuilder.moveQuestion(index, 1);
      else if (action === 'dup') SkillQuizBuilder.duplicateQuestion(index);
      else if (action === 'remove') SkillQuizBuilder.removeQuestion(index);
    });
  },

  modalHtml() {
    return `
      <div class="modal-overlay quiz-modal" id="quiz-question-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-modal-title">
        <div class="modal-panel">
          <div class="modal-head">
            <div>
              <h3 id="quiz-modal-title">New question</h3>
              <p class="quiz-modal-meta"><span id="quiz-modal-slot">1 / ${SkillQuizBuilder.MAX_QUESTIONS}</span> · click a letter to mark correct</p>
            </div>
            <button type="button" class="modal-close" id="quiz-modal-close" aria-label="Close">×</button>
          </div>
          <form id="quiz-question-form" class="quiz-modal-form" onsubmit="return false">
            <label for="quiz-q-body">Question</label>
            <textarea id="quiz-q-body" rows="2" required placeholder="What should they answer?"></textarea>

            <p class="quiz-options-label">Options</p>
            <div class="quiz-options-list">
              ${[0, 1, 2, 3].map((i) => `
                <label class="quiz-option-item">
                  <input type="radio" name="quiz-correct" value="${i}" ${i === 0 ? 'checked' : ''}>
                  <span class="quiz-option-letter">${String.fromCharCode(65 + i)}</span>
                  <input type="text" id="quiz-opt-${i}" class="quiz-option-input" placeholder="Option ${String.fromCharCode(65 + i)}" required autocomplete="off">
                </label>`).join('')}
            </div>

            <div class="quiz-preview-inline" id="quiz-live-preview" hidden aria-live="polite"></div>
          </form>
          <div class="modal-foot">
            <button type="button" class="btn btn-ghost" id="quiz-modal-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="quiz-modal-save">Add to quiz</button>
          </div>
        </div>
      </div>`;
  },

  formHtml({ mode = 'create', skill = null, quiz = null } = {}) {
    const isEdit = mode === 'edit';
    return `
      <section class="admin-compose-panel skill-compose-panel" aria-labelledby="skill-compose-title">
        <header class="admin-compose-head skill-compose-head">
          <p class="admin-compose-label skill-compose-label">${isEdit ? 'Editing skill' : 'New skill'}</p>
          <h2 class="admin-compose-title" id="skill-compose-title">${isEdit ? 'Edit skill & quiz' : 'Create skill & quiz'}</h2>
        </header>
        <form class="skill-quiz-form" id="skill-quiz-form" data-mode="${mode}" data-skill-id="${isEdit ? skill.id : ''}">
        <div class="skill-details">
          <div class="skill-field">
            <label for="skill-name">Name</label>
            <input type="text" id="skill-name" name="name" value="${Utils.escapeHtml(skill?.name || '')}" required placeholder="ReactJS, FastAPI, HTML-CSS…">
          </div>

          <div class="skill-field">
            <label for="skill-description">Description</label>
            <textarea id="skill-description" name="description" rows="2" placeholder="Briefly describe what this skill verifies">${Utils.escapeHtml(skill?.description || '')}</textarea>
          </div>

          <div class="skill-settings">
            <div class="skill-setting">
              <span class="skill-setting-label">Pass score</span>
              <div class="skill-threshold-inline">
                <input type="number" id="skill-pass-threshold" name="pass_threshold"
                  value="${quiz?.pass_threshold ?? 70}" min="0" max="100" required aria-label="Pass threshold percent">
                <span>%</span>
              </div>
            </div>
            <label class="skill-publish-toggle">
              <input type="checkbox" id="skill-published" name="published" ${quiz?.published ? 'checked' : ''}>
              <span class="skill-publish-track" aria-hidden="true"></span>
              <span class="skill-publish-text">Published</span>
            </label>
          </div>
        </div>

        <div class="quiz-builder-card">
          <div class="quiz-builder-toolbar">
            <div class="quiz-builder-toolbar-text">
              <h4>Quiz questions</h4>
              <p class="quiz-stat-ready" id="quiz-stat-ready">Add at least 1 question</p>
            </div>
            <div class="quiz-builder-toolbar-actions">
              <span class="quiz-builder-count" id="quiz-count-label">0 / ${SkillQuizBuilder.MAX_QUESTIONS}</span>
              <button type="button" class="btn btn-sm btn-primary" id="btn-add-quiz-head">+ Add question</button>
            </div>
          </div>
          <div class="quiz-progress-track" aria-hidden="true">
            <div class="quiz-progress-bar" id="quiz-progress-bar" style="width:0%"></div>
          </div>
          <div id="quiz-questions-list" class="quiz-questions-list"></div>
          <button type="button" class="btn quiz-add-btn" id="btn-add-quiz-question">+ Add another question</button>
        </div>

        <div class="skill-form-actions admin-compose-foot">
          ${isEdit ? '<a class="btn btn-ghost" data-nav="/admin/skills">Cancel</a>' : ''}
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save changes' : 'Create skill'}</button>
        </div>
        </form>
      </section>
      ${SkillQuizBuilder.modalHtml()}`;
  },
};
