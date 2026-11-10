// Response capture: sends a student's finished written answer to the teacher's
// `responses` table through the save_response() database function
// (database/migrate-responses.sql). Students cannot read the table; the
// function only writes their one row and returns the saved word count.
//
// Used by the textbook's Read More Check ('read-more') and by Short Answer and
// the Response Builder ('short-answer'). The local copy of an answer is always
// kept by the caller, so a failed send never loses work.
//
//   ResponseCapture.capture(unitId, source, itemKey, questionText, answerText)
//     -> Promise<{ ok: true, words } | { ok: false, reason }>
//        reason: 'guest' | 'empty' | 'offline' | 'rejected'
//
//   ResponseCapture.saveShortAnswer(unitId, index, questionText, answerText)
//     Short Answer and Response Builder "Save": saves locally, sends, and marks
//     the answer complete for study points.
//
//   ResponseCapture.guardPaste(textarea)
//     Blocks paste and drag-and-drop into a response box with a friendly toast.
const ResponseCapture = {
    countWords(text) {
        var t = (text || '').trim();
        return t ? t.split(/\s+/).length : 0;
    },

    canSend() {
        var pm = typeof ProgressManager !== 'undefined' ? ProgressManager : null;
        return !!(pm && pm.studentId && !(pm.studentInfo && pm.studentInfo.isGuest));
    },

    async capture(unitId, source, itemKey, questionText, answerText) {
        var answer = (answerText || '').trim();
        if (!answer) return { ok: false, reason: 'empty' };
        if (!this.canSend()) return { ok: false, reason: 'guest' };
        var pm = ProgressManager;
        if (!pm.supabase) return { ok: false, reason: 'offline' };
        try {
            var info = pm.studentInfo || {};
            var res = await pm.supabase.rpc('save_response', {
                p_student: pm.studentId,
                p_unit: unitId,
                p_source: source,
                p_item: String(itemKey),
                p_question: questionText || null,
                p_answer: answer,
                p_student_name: info.name || null,
                p_class_code: info.classCode || null
            });
            if (res.error) return { ok: false, reason: 'offline' };
            if (typeof res.data !== 'number' || res.data < 0) return { ok: false, reason: 'rejected' };
            return { ok: true, words: res.data };
        } catch (e) {
            return { ok: false, reason: 'offline' };
        }
    },

    // ---- Short Answer and Response Builder ----------------------------------
    // Both write the same progress key, short-answer-<index>:
    //   { answer, words, savedAt, sent, complete }
    // `complete` is set the first time an answer of SHORT_ANSWER_MIN_WORDS or
    // more reaches the teacher, and is never cleared, so the points stay once
    // earned (LeaderboardManager.writtenWorkPts).
    SHORT_ANSWER_MIN_WORDS: 20,

    // How many short-answer questions in this unit have any saved text.
    answeredCount(unitId, config) {
        var qs = (config && config.shortAnswerQuestions) || [];
        var n = 0;
        for (var i = 0; i < qs.length; i++) {
            var p = ProgressManager.getActivityProgress(unitId, 'short-answer-' + i);
            if (p && p.answer && p.answer.trim()) n++;
        }
        return n;
    },

    // Keystroke autosave that keeps savedAt, sent and complete from the last Save.
    autosaveShortAnswer(unitId, index, answerText) {
        var prev = ProgressManager.getActivityProgress(unitId, 'short-answer-' + index) || {};
        var rec = {};
        ['savedAt', 'sent', 'complete', 'words'].forEach(function(k) { if (k in prev) rec[k] = prev[k]; });
        rec.answer = answerText;
        if (rec.sent && answerText.trim() !== (prev.answer || '').trim()) rec.sent = false;
        ProgressManager.saveActivityProgress(unitId, 'short-answer-' + index, rec);
    },

    // The deliberate "this one is done" save. Saves locally first, then sends.
    // Resolves to { ok, reason, words, earned, complete }.
    async saveShortAnswer(unitId, index, questionText, answerText) {
        var key = 'short-answer-' + index;
        var prev = ProgressManager.getActivityProgress(unitId, key) || {};
        var answer = (answerText || '').trim();
        var words = this.countWords(answer);
        var rec = { answer: answerText || '', words: words, savedAt: Date.now(), sent: false, complete: !!prev.complete };
        ProgressManager.saveActivityProgress(unitId, key, rec);
        if (!answer) return { ok: false, reason: 'empty', words: 0, earned: false, complete: rec.complete };
        var res = await this.capture(unitId, 'short-answer', String(index), questionText, answer);
        var earned = false;
        if (res.ok) {
            rec.sent = true;
            if (!rec.complete && words >= this.SHORT_ANSWER_MIN_WORDS) { rec.complete = true; earned = true; }
            ProgressManager.saveActivityProgress(unitId, key, rec);
        }
        return { ok: res.ok, reason: res.reason || null, words: words, earned: earned, complete: rec.complete };
    },

    // Toast text for a saveShortAnswer result.
    shortAnswerMessage(r, points) {
        var min = this.SHORT_ANSWER_MIN_WORDS;
        if (r.reason === 'empty') return { text: 'Write your response first, then save it.', type: 'info' };
        if (r.reason === 'guest') return { text: 'Saved on this device. Sign in with your class code to send it to your teacher and earn study points.', type: 'info' };
        if (!r.ok) return { text: 'Saved on this device, but it could not be sent right now. Tap Save again later.', type: 'info' };
        if (r.earned) return { text: 'Saved and sent to your teacher. +' + points + ' study points!', type: 'success' };
        if (r.complete) return { text: 'Saved and sent to your teacher.', type: 'success' };
        return { text: 'Saved and sent. Write at least ' + min + ' words to earn ' + points + ' study points.', type: 'info' };
    },

    // A small "N words" line that updates as the student types.
    attachWordCounter(textarea, parent) {
        var min = this.SHORT_ANSWER_MIN_WORDS;
        var line = document.createElement('div');
        line.className = 'sa-word-count';
        line.setAttribute('aria-live', 'polite');
        var self = this;
        var update = function() {
            var n = self.countWords(textarea.value);
            line.textContent = n + (n === 1 ? ' word' : ' words') + (n < min ? ' (' + min + ' to earn study points)' : '');
            line.classList.toggle('sa-word-count-ok', n >= min);
        };
        textarea.addEventListener('input', update);
        update();
        parent.appendChild(line);
        return update;
    },

    guardPaste(textarea) {
        var warn = function(e) {
            e.preventDefault();
            if (typeof StudyUtils !== 'undefined' && StudyUtils.showToast) {
                StudyUtils.showToast('Write it in your own words. Typing it yourself helps you remember it.', 'info');
            }
        };
        textarea.addEventListener('paste', warn);
        textarea.addEventListener('drop', warn);
    }
};

if (typeof window !== 'undefined') window.ResponseCapture = ResponseCapture;
