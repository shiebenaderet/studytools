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
