// Feedback submission: floating button + modal. Posts to Supabase `feedback` table.
// Auto-captures student/class identity, current activity/unit, and app version.

const FeedbackManager = {
    _appVersion: null,

    init() {
        this._loadVersion();
        this._renderFab();
    },

    async _loadVersion() {
        try {
            const resp = await fetch('version.json');
            if (resp.ok) {
                const v = await resp.json();
                this._appVersion = v.version || null;
            }
        } catch (e) {
            // ignore — version is best-effort metadata
        }
    },

    _renderFab() {
        if (document.getElementById('feedback-fab')) return;
        const btn = document.createElement('button');
        btn.id = 'feedback-fab';
        btn.className = 'feedback-fab';
        btn.title = 'Send feedback';
        btn.setAttribute('aria-label', 'Send feedback');
        const icon = document.createElement('i');
        icon.className = 'fas fa-comment-dots';
        btn.appendChild(icon);
        btn.addEventListener('click', () => this._openModal());
        document.body.appendChild(btn);
    },

    _openModal() {
        if (document.getElementById('feedback-modal')) return;

        const overlay = document.createElement('div');
        overlay.id = 'feedback-modal';
        overlay.className = 'feedback-modal-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this._closeModal();
        });

        const card = document.createElement('div');
        card.className = 'feedback-modal-card';

        const header = document.createElement('div');
        header.className = 'feedback-modal-header';
        const title = document.createElement('h3');
        title.textContent = 'Send feedback';
        header.appendChild(title);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'feedback-modal-close';
        closeBtn.setAttribute('aria-label', 'Close');
        const closeIcon = document.createElement('i');
        closeIcon.className = 'fas fa-times';
        closeBtn.appendChild(closeIcon);
        closeBtn.addEventListener('click', () => this._closeModal());
        header.appendChild(closeBtn);
        card.appendChild(header);

        const body = document.createElement('div');
        body.className = 'feedback-modal-body';

        // Type selector
        const typeGroup = document.createElement('div');
        typeGroup.className = 'feedback-type-group';
        const types = [
            { value: 'bug', label: 'Bug', icon: 'fas fa-bug' },
            { value: 'suggestion', label: 'Suggestion', icon: 'fas fa-lightbulb' }
        ];
        types.forEach((t, i) => {
            const label = document.createElement('label');
            label.className = 'feedback-type-option';
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'feedback-type';
            input.value = t.value;
            if (i === 0) input.checked = true;
            input.addEventListener('change', () => this._onTypeChange());
            const tIcon = document.createElement('i');
            tIcon.className = t.icon;
            const tText = document.createElement('span');
            tText.textContent = t.label;
            label.appendChild(input);
            label.appendChild(tIcon);
            label.appendChild(tText);
            typeGroup.appendChild(label);
        });
        body.appendChild(typeGroup);

        // Description
        const descLabel = document.createElement('label');
        descLabel.className = 'feedback-field-label';
        descLabel.textContent = 'What happened or what would you like to see?';
        body.appendChild(descLabel);
        const desc = document.createElement('textarea');
        desc.id = 'feedback-description';
        desc.className = 'feedback-textarea';
        desc.rows = 4;
        desc.placeholder = 'Describe the bug or suggestion';
        body.appendChild(desc);

        // Context (only shown for bugs)
        const ctxLabel = document.createElement('label');
        ctxLabel.className = 'feedback-field-label feedback-ctx-label';
        ctxLabel.textContent = 'What were you doing when it happened? (optional)';
        body.appendChild(ctxLabel);
        const ctx = document.createElement('textarea');
        ctx.id = 'feedback-context';
        ctx.className = 'feedback-textarea feedback-ctx-input';
        ctx.rows = 2;
        ctx.placeholder = 'e.g. Clicked the next button on flashcards';
        body.appendChild(ctx);

        // Status / submit
        const status = document.createElement('div');
        status.id = 'feedback-status';
        status.className = 'feedback-status';
        body.appendChild(status);

        const submit = document.createElement('button');
        submit.className = 'feedback-submit-btn';
        submit.textContent = 'Send';
        submit.addEventListener('click', () => this._submit());
        body.appendChild(submit);

        card.appendChild(body);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        setTimeout(() => desc.focus(), 50);
    },

    _onTypeChange() {
        // Hide the "what were you doing" field for suggestions.
        const isSuggestion = document.querySelector('input[name="feedback-type"]:checked')?.value === 'suggestion';
        const ctxLabel = document.querySelector('.feedback-ctx-label');
        const ctxInput = document.querySelector('.feedback-ctx-input');
        if (ctxLabel) ctxLabel.style.display = isSuggestion ? 'none' : '';
        if (ctxInput) ctxInput.style.display = isSuggestion ? 'none' : '';
    },

    _closeModal() {
        const m = document.getElementById('feedback-modal');
        if (m) m.parentNode.removeChild(m);
    },

    async _submit() {
        const status = document.getElementById('feedback-status');
        const type = document.querySelector('input[name="feedback-type"]:checked')?.value;
        const description = document.getElementById('feedback-description').value.trim();
        const context = document.getElementById('feedback-context').value.trim();

        if (!description) {
            status.textContent = 'Please write something before sending.';
            status.className = 'feedback-status feedback-status-error';
            return;
        }

        const payload = {
            type: type,
            description: description,
            context: (type === 'bug' && context) ? context : null,
            student_id: (typeof ProgressManager !== 'undefined') ? ProgressManager.studentId : null,
            student_name: (typeof ProgressManager !== 'undefined' && ProgressManager.studentInfo && !ProgressManager.studentInfo.isGuest) ? ProgressManager.studentInfo.name : null,
            class_code: (typeof ProgressManager !== 'undefined' && ProgressManager.studentInfo) ? ProgressManager.studentInfo.classCode : null,
            activity: (typeof StudyEngine !== 'undefined') ? StudyEngine.activeActivity : null,
            unit_id: (typeof StudyEngine !== 'undefined' && StudyEngine.config && StudyEngine.config.unit) ? StudyEngine.config.unit.id : null,
            app_version: this._appVersion
        };

        const supabase = (typeof ProgressManager !== 'undefined') ? ProgressManager.supabase : null;
        if (!supabase) {
            status.textContent = 'Cannot send right now. Try again in a moment.';
            status.className = 'feedback-status feedback-status-error';
            return;
        }

        status.textContent = 'Sending…';
        status.className = 'feedback-status';

        try {
            const { error } = await supabase.from('feedback').insert(payload);
            if (error) throw error;
            status.textContent = 'Thanks — sent!';
            status.className = 'feedback-status feedback-status-success';
            setTimeout(() => this._closeModal(), 1200);
        } catch (e) {
            status.textContent = 'Could not send. Please try again.';
            status.className = 'feedback-status feedback-status-error';
            console.error('Feedback submit failed:', e);
        }
    }
};
