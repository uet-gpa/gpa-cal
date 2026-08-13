/* =============================================================================
 * js/app.js
 * UI orchestration: theme, nav, SGPA subjects, CGPA semesters, what-if,
 * CGPA target, print/download, FAQ, reset, and local-storage sync.
 * Calculation logic lives in gpa.js; persistence lives in storage.js.
 * ========================================================================== */
'use strict';
(function () {
    var $ = function (id) { return document.getElementById(id); };
    var $$ = function (sel, ctx) { return (ctx || document).querySelectorAll(sel); };

    var els = {
        navToggle: $('nav-toggle'), navMenu: $('nav-menu'),
        themeToggle: document.querySelector('.theme-toggle'), currentYear: $('current-year'),
        subjectList: $('subject-list'), subjectEmpty: $('subject-empty'),
        addSubjectBtn: $('add-subject'), calcSgpaBtn: $('calc-sgpa'),
        resetSgpaBtn: $('reset-sgpa'), sgpaResult: $('sgpa-result'),
        resultSgpa: $('result-sgpa'), resultRemark: $('result-remark'), resultTotalSubjects: $('result-total-subjects'),
        resultTotalCredits: $('result-total-credits'), resultTotalQP: $('result-total-qp'),
        improvementAdvice: $('improvement-advice'), printBtn: $('print-result'),
        downloadBtn: $('download-result'),
        semesterList: $('semester-list'), semesterEmpty: $('semester-empty'),
        addSemesterBtn: $('add-semester'), calcCgpaBtn: $('calc-cgpa'),
        resetCgpaBtn: $('reset-cgpa'), cgpaResult: $('cgpa-result'),
        resultCgpa: $('result-cgpa'),
        resultRemarkCgpa: $('result-remark-cgpa'), resultTotalSems: $('result-total-sems'),
        resultCgpaCredits: $('result-cgpa-credits'), resultCgpaQP: $('result-cgpa-qp'),
        whatifSubject: $('whatif-subject'), whatifGrade: $('whatif-grade'),
        whatifCurrent: $('whatif-current'), whatifCalc: $('whatif-calc'),
        whatifResult: $('whatif-result'),
        tCurrentCgpa: $('t-current-cgpa'), tCompletedCredits: $('t-completed-credits'),
        tTargetCgpa: $('t-target-cgpa'), tRemainingCredits: $('t-remaining-credits'),
        tCalc: $('t-calc'), tResult: $('t-result')
    };

    var state = { subjects: [], semesters: [], theme: null };
    var uid = 0;
    function nextId() { uid++; return 'uet_' + Date.now() + '_' + uid; }

    /* ---- Toast ---- */
    var toastContainer = null;
    function getToastContainer() {
        if (!toastContainer) {
            toastContainer = document.getElementById('toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toast-container';
                toastContainer.className = 'toast-container';
                document.body.appendChild(toastContainer);
            }
        }
        return toastContainer;
    }
    function toast(message, type) {
        type = type || 'info';
        var el = document.createElement('div');
        el.className = 'toast toast--' + type;
        el.setAttribute('role', 'alert');
        el.textContent = message;
        getToastContainer().appendChild(el);
        setTimeout(function () { el.classList.add('toast--show'); }, 10);
        setTimeout(function () {
            el.classList.remove('toast--show');
            setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
        }, 3200);
    }

    /* ---- Theme ---- */
    function prefersDark() { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
    function applyTheme(theme) {
        state.theme = theme;
        var root = document.documentElement;
        if (theme === 'dark') root.setAttribute('data-theme', 'dark');
        else if (theme === 'light') root.setAttribute('data-theme', 'light');
        else root.removeAttribute('data-theme');
        if (els.themeToggle) els.themeToggle.textContent = (theme === 'dark') ? 'Light' : 'Dark';
    }
    function initTheme() { applyTheme(Storage.loadTheme() || (prefersDark() ? 'dark' : 'light')); }
    function toggleTheme() {
        var cur = document.documentElement.getAttribute('data-theme');
        var next = (cur === 'dark') ? 'light' : 'dark';
        applyTheme(next); Storage.saveTheme(next);
    }

    /* ---- Navigation ---- */
    function initNav() {
        if (els.navToggle && els.navMenu) {
            els.navToggle.addEventListener('click', function () {
                var expanded = els.navToggle.getAttribute('aria-expanded') === 'true';
                els.navToggle.setAttribute('aria-expanded', !expanded);
                els.navMenu.classList.toggle('nav-open');
            });
        }
        $$('a[href^="#"]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                var id = a.getAttribute('href').slice(1);
                if (id && document.getElementById(id)) { e.preventDefault(); document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }
            });
        });
        $$('#nav-menu a[data-nav]').forEach(function (l) {
            l.addEventListener('click', function () {
                if (els.navMenu) els.navMenu.classList.remove('nav-open');
                if (els.navToggle) els.navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }
    
    /* ---- Grade options ---- */
    function gradeOptionHTML() {
        var html = '';
        for (var i = 0; i < GPA.GRADES.length; i++) html += '<option value="' + GPA.GRADES[i].label + '">' + GPA.GRADES[i].label + '</option>';
        return html;
    }

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    }

    /* ---- Subject row template ---- */
    function createSubjectRow(subject) {
        var row = document.createElement('div');
        row.className = 'subject-row';
        row.dataset.id = subject.id;
        row.innerHTML =
            '<div class="subject-cell">' +
              '<input type="text" class="sub-name" placeholder="Subject name" value="' + esc(subject.name) + '" aria-label="Subject name">' +
              '<span class="field-error" aria-live="polite"></span>' +
            '</div>' +
            '<div class="subject-cell">' +
              '<input type="number" class="sub-credits" min="0.5" step="0.5" inputmode="decimal" value="' + (subject.credits == null ? '' : subject.credits) + '" aria-label="Credit hours">' +
              '<span class="field-error" aria-live="polite"></span>' +
            '</div>' +
            '<div class="subject-cell"><select class="sub-grade" aria-label="Grade">' + gradeOptionHTML() + '</select></div>' +
            '<div class="subject-cell"><span class="sub-point" aria-label="Grade point">0.00</span></div>' +
            '<div class="subject-cell"><span class="sub-qp" aria-label="Quality points">0.00</span></div>' +
            '<div class="subject-cell"><button type="button" class="sub-remove" aria-label="Remove subject">&times;</button></div>';
        setGrade(row, subject.grade || GPA.GRADES[0].label);
        row.querySelector('.sub-name').addEventListener('input', onSubjectInput);
        row.querySelector('.sub-credits').addEventListener('input', onSubjectInput);
        row.querySelector('.sub-credits').addEventListener('change', validateAndPersist);
        row.querySelector('.sub-grade').addEventListener('change', function () {
            setGrade(row, row.querySelector('.sub-grade').value); onSubjectInput.call(this);
        });
        row.querySelector('.sub-remove').addEventListener('click', function () { removeSubject(row); });
        updateRowPoints(row);
        return row;
    }

    function readSubject(row) {
        return { id: row.dataset.id, name: row.querySelector('.sub-name').value.trim(), credits: row.querySelector('.sub-credits').value, grade: row.querySelector('.sub-grade').value };
    }

    function setGrade(row, label) { row.querySelector('.sub-grade').value = label; }

    /* ---- Live grade point / quality points ---- */
    function updateRowPoints(row) {
        var credits = Number(row.querySelector('.sub-credits').value);
        var grade = row.querySelector('.sub-grade').value;
        var point = GPA.getGradePoint(grade);
        var qp = (point !== null && !isNaN(credits) && credits > 0) ? (credits * point) : 0;
        row.querySelector('.sub-point').textContent = (point !== null) ? point.toFixed(2) : '—';
        row.querySelector('.sub-qp').textContent = (!isNaN(qp)) ? qp.toFixed(2) : '0.00';
    }
    function onSubjectInput(evt) {
        var el = (evt && evt.currentTarget) || (typeof this !== 'undefined' ? this : null);
        var row = el ? el.closest('.subject-row') : null;
        if (row) { clearRowErrors(row); updateRowPoints(row); }
        syncSubjects();
    }

    /* ---- Validation + inline errors ---- */
    function validateRow(row) {
        var name = row.querySelector('.sub-name').value.trim();
        var credits = row.querySelector('.sub-credits').value;
        var grade = row.querySelector('.sub-grade').value;
        var errors = [];
        var nv = GPA.validateSubjectName(name);
        if (!nv.valid) errors.push(nv.message);
        var cv = GPA.validateCredits(credits);
        if (!cv.valid) errors.push(cv.message);
        if (!GPA.validateGrade(grade)) errors.push('Select a valid grade.');
        return { valid: errors.length === 0, errors: errors };
    }
    function showRowErrors(row, errors) {
        clearRowErrors(row);
        if (!errors.length) return;
        var cells = row.querySelectorAll('.subject-cell');
        cells[0].querySelector('.field-error').textContent = errors[0];
        if (errors.length > 1) cells[1].querySelector('.field-error').textContent = errors[1];
        row.querySelectorAll('input, select').forEach(function (f) { f.classList.add('input-error'); });
    }
    function clearRowErrors(row) {
        row.querySelectorAll('.field-error').forEach(function (e) { e.textContent = ''; });
        row.querySelectorAll('input, select').forEach(function (f) { f.classList.remove('input-error'); });
    }
    function validateAndPersist() {
        var row = this.closest('.subject-row');
        var res = validateRow(row);
        if (!res.valid) showRowErrors(row, res.errors); else { clearRowErrors(row); updateRowPoints(row); }
        syncSubjects();
    }

    /* ---- Sync + empty state ---- */
    function syncSubjects() {
        state.subjects = [];
        if (els.subjectList) {
            $$('.subject-row', els.subjectList).forEach(function (row) { state.subjects.push(readSubject(row)); });
        }
        Storage.saveSubjects(state.subjects);
        updateEmptyState();
        if (els.whatifSubject) buildWhatIfOptions();
    }
    function updateEmptyState() {
        if (els.subjectEmpty) els.subjectEmpty.style.display = (state.subjects.length === 0) ? 'flex' : 'none';
        if (els.subjectList) els.subjectList.style.display = (state.subjects.length === 0) ? 'none' : 'grid';
    }

    function addSubject(subject) {
        var s = subject || { id: nextId(), name: '', credits: '', grade: GPA.GRADES[0].label };
        state.subjects.push(s);
        if (els.subjectList) els.subjectList.appendChild(createSubjectRow(s));
        Storage.saveSubjects(state.subjects);
        updateEmptyState();
        setTimeout(function () { var f = els.subjectList && els.subjectList.querySelector('.subject-row:last-child .sub-name'); if (f) f.focus(); }, 0);
    }
    function removeSubject(row) {
        var id = row.dataset.id;
        state.subjects = state.subjects.filter(function (s) { return s.id !== id; });
        Storage.saveSubjects(state.subjects);
        row.remove();
        updateEmptyState();
        if (els.whatifSubject) buildWhatIfOptions();
        if (state.subjects.length === 0) { hideSgpaResult(); }
    }
    
    /* ---- SGPA result ---- */
    function hideSgpaResult() {
        if (els.sgpaResult) els.sgpaResult.classList.add('hidden');
        if (els.improvementAdvice) els.improvementAdvice.classList.add('hidden');
    }
    function renderSgpaResult(res) {
        if (!els.sgpaResult) return;
        els.sgpaResult.classList.remove('hidden');
        setText(els.resultSgpa, res.sgpaDisplay.toFixed(2));
        setText(els.resultRemark, res.remark);
        setText(els.resultTotalSubjects, res.totalSubjects);
        setText(els.resultTotalCredits, res.totalCredits.toFixed(2));
        setText(els.resultTotalQP, res.totalQualityPoints.toFixed(2));
        // ring visualization
        var ring = els.sgpaResult.querySelector('.sgpa-ring');
        if (ring) {
            var pct = (res.sgpaDisplay / GPA.MAX_GPA) * 100;
            ring.style.setProperty('--gp', pct);
        }
    }

    function renderImprovementAdvice(advice) {
        if (!els.improvementAdvice) return;
        els.improvementAdvice.classList.remove('hidden');
        var box = els.improvementAdvice.querySelector('.advice-body');
        if (!box) return;
        if (!advice.count) { box.innerHTML = '<p class="advice-empty">Calculate your SGPA to see improvement suggestions.</p>'; return; }
        var html = '<p class="advice-summary">' + esc(advice.summary) + '</p>';
        if (advice.lowest) {
            html += '<div class="advice-row">' +
                '<span class="advice-badge advice-badge--low">Lowest grade</span>' +
                '<div class="advice-text">' +
                    '<span class="advice-name">' + esc(advice.lowest.name) + '</span>' +
                    '<span class="advice-meta">Grade ' + esc(advice.lowest.grade) + ' (' + advice.lowest.gradePoint.toFixed(2) + ' pts)' +
                    (advice.lowest.credits ? ' &middot; ' + advice.lowest.credits + ' credit hour' + (advice.lowest.credits === 1 ? '' : 's') : '') + '</span>' +
                '</div>' +
            '</div>';
        }
        if (advice.top) {
            html += '<div class="advice-row advice-row--top">' +
                '<span class="advice-badge advice-badge--top">Best to improve</span>' +
                '<div class="advice-text">' +
                    '<span class="advice-name">' + esc(advice.top.name) + '</span>' +
                    '<span class="advice-meta">Grade ' + esc(advice.top.grade) + ' &middot; ' + advice.top.credits + ' credit hour' + (advice.top.credits === 1 ? '' : 's') + '</span>' +
                    '<span class="advice-gain">Improving this adds +' + advice.top.potentialGain.toFixed(2) + ' quality points to your GPA.</span>' +
                '</div>' +
            '</div>';
        }
        box.innerHTML = html;
    }

    function onCalcSgpa() {
        // final validation pass
        var rows = els.subjectList ? $$('.subject-row', els.subjectList) : [];
        var firstInvalid = null;
        rows.forEach(function (row) {
            var res = validateRow(row);
            if (!res.valid) {
                showRowErrors(row, res.errors);
                if (!firstInvalid) firstInvalid = row.querySelector('.input-error') || row.querySelector('input, select');
            } else { clearRowErrors(row); updateRowPoints(row); }
        });
        if (firstInvalid) {
            try { firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
            try { firstInvalid.focus({ preventScroll: true }); } catch (e) { try { firstInvalid.focus(); } catch (e2) {} }
            toast('Please fix the highlighted field(s) before calculating.', 'error');
            return;
        }

        var res = GPA.calculateSGPA(state.subjects);
        renderSgpaResult(res);
        var advice = GPA.getImprovementAdvice(state.subjects, res.sgpa);
        renderImprovementAdvice(advice);
        els.whatifSubject && buildWhatIfOptions();
    }

    function onResetSgpa() {
        showConfirm('Are you sure you want to clear your current calculation?', function () {
            state.subjects = [];
            Storage.saveSubjects([]);
            if (els.subjectList) els.subjectList.innerHTML = '';
            if (els.subjectEmpty) els.subjectEmpty.style.display = 'flex';
            if (els.subjectList) els.subjectList.style.display = 'none';
            hideSgpaResult();
            toast('Calculator cleared.', 'info');
        });
    }
    
    /* ---- Tiny DOM helpers ---- */
    function setText(el, val) { if (el) el.textContent = val; }

    function showConfirm(message, onConfirm) {
        var modal = document.getElementById('confirm-modal');
        if (!modal) return;
        modal.querySelector('.confirm-message').textContent = message;
        modal.classList.remove('hidden');
        modal.querySelector('#confirm-yes').onclick = function () {
            modal.classList.add('hidden');
            onConfirm && onConfirm();
        };
        modal.querySelector('#confirm-no').onclick = function () { modal.classList.add('hidden'); };
        modal.focus();
    }

    /* ---- What-If GPA Calculator (Section 15) ---- */
    function buildWhatIfOptions() {
        if (!els.whatifSubject) return;
        var html = '';
        if (state.subjects.length === 0) {
            els.whatifSubject.innerHTML = '<option value="">No subjects yet</option>';
            return;
        }
        for (var i = 0; i < state.subjects.length; i++) {
            var s = state.subjects[i];
            html += '<option value="' + i + '">' + esc(s.name || ('Subject ' + (i + 1))) + ' (' + esc(s.grade) + ')</option>';
        }
        els.whatifSubject.innerHTML = html;
        onWhatIfSubjectChanged();
    }
    function buildGradeOptions(selectEl) {
        if (!selectEl) return;
        var html = '';
        for (var i = 0; i < GPA.GRADES.length; i++) {
            var g = GPA.GRADES[i];
            html += '<option value="' + esc(g.label) + '">' + esc(g.label) + ' (' + g.point.toFixed(2) + ')</option>';
        }
        selectEl.innerHTML = html;
    }
    function onWhatIfSubjectChanged() {
        var idx = Number(els.whatifSubject.value);
        var sub = state.subjects[idx];
        if (!sub) { setText(els.whatifCurrent, '—'); return; }
        setText(els.whatifCurrent, 'Grade ' + esc(sub.grade) + ' (' + GPA.getGradePoint(sub.grade).toFixed(2) + ' pts), ' + sub.credits + ' cr');
    }
    function onWhatIfCalc() {
        var idx = Number(els.whatifSubject.value);
        var newGrade = els.whatifGrade.value;
        var sub = state.subjects[idx];
        if (!sub || !GPA.validateGrade(newGrade)) { toast('Select a subject and a new grade.', 'error'); return; }
        var res = GPA.calculateWhatIf(state.subjects, idx, newGrade);
        renderWhatIfResult(res);
    }
    function renderWhatIfResult(res) {
        if (!els.whatifResult) return;
        els.whatifResult.classList.remove('hidden');
        setText(els.whatifResult.querySelector('.wif-current'), res.currentSGPA.toFixed(2));
        setText(els.whatifResult.querySelector('.wif-projected'), res.projectedSGPA.toFixed(2));
        setText(els.whatifResult.querySelector('.wif-improvement'), res.improvementDisplay);
    }
    function hideWhatIf() { if (els.whatifResult) els.whatifResult.classList.add('hidden'); }
    
    /* ---- CGPA Calculator (Sections 16/17) ---- */
        // Locate the cell/input/error for each field reliably (no fragile nth-child indexing).
    function cellParts(row) {
        var nameInput = row.querySelector('.sem-name');
        var sgpaInput = row.querySelector('.sem-sgpa');
        var creditsInput = row.querySelector('.sem-credits');
        return {
            name:    { input: nameInput,    cell: nameInput && nameInput.parentElement,    error: row.querySelector('.sem-name + .field-error')    },
            sgpa:    { input: sgpaInput,    cell: sgpaInput && sgpaInput.parentElement,    error: row.querySelector('.sem-sgpa + .field-error')    },
            credits: { input: creditsInput, cell: creditsInput && creditsInput.parentElement, error: row.querySelector('.sem-credits + .field-error') }
        };
    }
    function clearFieldErrors(row) {
        row.querySelectorAll('.field-error').forEach(function (e) { e.textContent = ''; });
        row.querySelectorAll('input').forEach(function (f) { f.classList.remove('input-error'); });
    }
    function fieldError(field, r) {
        var v = r[field], num;
        if (field === 'name') { if (v === '') return 'Semester name cannot be empty.'; return ''; }
        if (field === 'sgpa') {
            if (v === '' || v === null || v === undefined) return 'SGPA cannot be empty.';
            num = Number(v); if (isNaN(num)) return 'Enter a valid SGPA.';
            if (num < 0) return 'SGPA cannot be negative.';
            if (num > GPA.MAX_GPA) return 'SGPA cannot exceed ' + GPA.MAX_GPA.toFixed(2) + '.';
            return '';
        }
        if (field === 'credits') {
            if (v === '' || v === null || v === undefined) return 'Credit hours cannot be empty.';
            num = Number(v); if (isNaN(num)) return 'Enter valid credit hours.';
            if (num <= 0) return 'Credit hours must be greater than zero.';
            return '';
        }
        return '';
    }
    function validateField(row, field) {
        var msg = fieldError(field, readSemester(row));
        clearFieldErrors(row);
        if (msg) {
            var p = cellParts(row)[field];
            if (p.error) p.error.textContent = msg;
            if (p.input) p.input.classList.add('input-error');
            return { valid: false };
        }
        return { valid: true };
    }
    function createSemesterRow(sem) {
        var row = document.createElement('div');
        row.className = 'semester-row';
        row.dataset.id = sem.id;
        row.innerHTML =
            '<div class="sem-cell">' +
              '<label class="field-label">Semester</label>' +
              '<input type="text" class="sem-name" placeholder="Enter semester name" value="' + esc(sem.name) + '">' +
              '<span class="field-error" aria-live="polite"></span>' +
            '</div>' +
            '<div class="sem-cell">' +
              '<label class="field-label">Enter SGPA</label>' +
              '<input type="number" class="sem-sgpa" min="0" max="' + GPA.MAX_GPA + '" step="0.01" value="' + (sem.sgpa == null ? '' : sem.sgpa) + '" aria-label="Semester SGPA">' +
              '<span class="field-error" aria-live="polite"></span>' +
            '</div>' +
            '<div class="sem-cell">' +
              '<label class="field-label">Enter credit hours</label>' +
              '<input type="number" class="sem-credits" min="0.5" step="0.5" value="' + (sem.credits == null ? '' : sem.credits) + '" aria-label="Semester credit hours">' +
              '<span class="field-error" aria-live="polite"></span>' +
            '</div>' +
            '<div class="sem-cell"><button type="button" class="sem-remove" aria-label="Remove semester">&times;</button></div>';
        // Validate only the touched field on blur (no premature whole-row errors).
        var parts = cellParts(row);
        parts.name.input.addEventListener('blur', function () { validateField(row, 'name'); syncSemesters(); });
        parts.sgpa.input.addEventListener('blur', function () { validateField(row, 'sgpa'); syncSemesters(); });
        parts.credits.input.addEventListener('blur', function () { validateField(row, 'credits'); syncSemesters(); });
        row.querySelector('.sem-remove').addEventListener('click', function () { removeSemester(row); });
        return row;
    }
    function readSemester(row) {
        var p = cellParts(row);
        return { id: row.dataset.id, name: p.name.input.value.trim(), sgpa: p.sgpa.input.value, credits: p.credits.input.value };
    }
    function validateSemesterRow(row) {
        var r = readSemester(row);
        clearFieldErrors(row);
        var fields = ['name', 'sgpa', 'credits'];
        var errors = {}, allValid = true;
        fields.forEach(function (f) {
            var msg = fieldError(f, r);
            if (msg) { errors[f] = msg; allValid = false; }
        });
        // Render each error under its OWN field (correct mapping — no off-by-one).
        fields.forEach(function (f) {
            if (errors[f]) {
                var p = cellParts(row)[f];
                if (p.error) p.error.textContent = errors[f];
                if (p.input) p.input.classList.add('input-error');
            }
        });
        return { valid: allValid, errors: errors };
    }
    function validateAndPersistSem() {
        var row = this.closest('.semester-row');
        validateSemesterRow(row);
        syncSemesters();
    }
    function syncSemesters() {
        state.semesters = [];
        if (els.semesterList) $$('.semester-row', els.semesterList).forEach(function (row) { state.semesters.push(readSemester(row)); });
        Storage.saveSemesters(state.semesters);
        updateSemesterEmpty();
    }
    function updateSemesterEmpty() {
        if (els.semesterEmpty) els.semesterEmpty.style.display = (state.semesters.length === 0) ? 'flex' : 'none';
        if (els.semesterList) els.semesterList.style.display = (state.semesters.length === 0) ? 'none' : 'grid';
    }
    function addSemester(sem) {
        var n = state.semesters.length + 1;
        var s = sem || { id: nextId(), name: 'Semester ' + n, sgpa: '', credits: '' };
        state.semesters.push(s);
        if (els.semesterList) els.semesterList.appendChild(createSemesterRow(s));
        Storage.saveSemesters(state.semesters);
        updateSemesterEmpty();
        setTimeout(function () { var f = els.semesterList && els.semesterList.querySelector('.semester-row:last-child .sem-name'); if (f) f.focus(); }, 0);
    }
    function removeSemester(row) {
        var id = row.dataset.id;
        state.semesters = state.semesters.filter(function (s) { return s.id !== id; });
        Storage.saveSemesters(state.semesters);
        row.remove();
        updateSemesterEmpty();
        if (state.semesters.length === 0) hideCgpaResult();
    }
    function hideCgpaResult() { if (els.cgpaResult) els.cgpaResult.classList.add('hidden'); }
    function onCalcCgpa() {
        var rows = els.semesterList ? $$('.semester-row', els.semesterList) : [];
        var firstInvalid = null;
        rows.forEach(function (row) {
            if (!validateSemesterRow(row).valid && !firstInvalid) {
                firstInvalid = row.querySelector('.input-error') || row.querySelector('input, select');
            }
        });
        if (firstInvalid) {
            try { firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
            try { firstInvalid.focus({ preventScroll: true }); } catch (e) { try { firstInvalid.focus(); } catch (e2) {} }
            toast('Please fix the highlighted field(s) before calculating.', 'error');
            return;
        }
        var res = GPA.calculateCGPA(state.semesters);
        renderCgpaResult(res);
    }
    function renderCgpaResult(res) {
        if (!els.cgpaResult) return;
        els.cgpaResult.classList.remove('hidden');
        setText(els.resultCgpa, (res.cgpaDisplay).toFixed(2));
        setText(els.resultRemarkCgpa, res.remark);
        setText(els.resultTotalSems, res.totalSemesters);
        setText(els.resultCgpaCredits, res.totalCredits.toFixed(2));
        setText(els.resultCgpaQP, res.totalQualityPoints.toFixed(2));
    }
    function onResetCgpa() {
        showConfirm('Are you sure you want to clear your semester data?', function () {
            state.semesters = [];
            Storage.saveSemesters([]);
            if (els.semesterList) els.semesterList.innerHTML = '';
            updateSemesterEmpty();
            hideCgpaResult();
            toast('Semester data cleared.', 'info');
        });
    }
    
    /* ---- CGPA Target Calculator (Section 18) ---- */
    function onTargetCalc() {
        var res = GPA.calculateCGPATarget(
            els.tCurrentCgpa.value, els.tCompletedCredits.value,
            els.tTargetCgpa.value, els.tRemainingCredits.value);
        renderTargetResult(res);
    }
    function renderTargetResult(res) {
        if (!els.tResult) return;
        var msg = els.tResult.querySelector('.tgt-message');
        var req = els.tResult.querySelector('.tgt-required');
        var wrap = els.tResult.querySelector('.tgt-content');
        if (!res.valid) {
            wrap.classList.add('hidden');
            els.tResult.classList.remove('hidden');
            setText(req, '—');
            msg.textContent = 'Please fill in all fields with valid numbers.';
            msg.classList.remove('tgt-ok'); msg.classList.add('tgt-warn');
            return;
        }
        wrap.classList.remove('hidden');
        els.tResult.classList.remove('hidden');
        setText(req, res.requiredGPA.toFixed(2));
        if (res.achievable) {
            msg.textContent = 'You need an average of ' + res.requiredGPA.toFixed(2) + ' GPA over ' + res.remainingCredits.toFixed(2) + ' remaining credit hour(s) to reach ' + res.targetCGPA.toFixed(2) + '.';
            msg.classList.remove('tgt-warn'); msg.classList.add('tgt-ok');
        } else {
            msg.textContent = 'This target is not mathematically achievable with the entered remaining credit hours under the current maximum GPA of ' + GPA.MAX_GPA.toFixed(2) + '.';
            msg.classList.remove('tgt-ok'); msg.classList.add('tgt-warn');
        }
    }
    
    /* ---- Print / Download (Sections 23/24) ---- */
    function onPrint() {
        if (state.subjects.length === 0) { toast('Nothing to print yet — add subjects first.', 'error'); return; }
        var res = GPA.calculateSGPA(state.subjects);
        var stamp = 'UET GPA Calculator — ' + (new Date()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        var html = '<div class="print-wrap"><h1>' + stamp + '</h1>';
        html += renderPrintSubjects(state.subjects);
        html += '<h2>SGPA Result</h2><p><strong>SGPA: ' + res.sgpaDisplay.toFixed(2) + '</strong> — ' + res.remark + '</p>';
        html += '<p>Total Subjects: ' + res.totalSubjects + ' | Total Credit Hours: ' + res.totalCredits.toFixed(2) + ' | Total Quality Points: ' + res.totalQualityPoints.toFixed(2) + '</p>';
        if (state.semesters.length) {
            var cr = GPA.calculateCGPA(state.semesters);
            html += '<h2>CGPA</h2><p><strong>CGPA: ' + cr.cgpaDisplay.toFixed(2) + '</strong> — ' + cr.remark + '</p>';
            html += '<p>Total Semesters: ' + cr.totalSemesters + ' | Total Credit Hours: ' + cr.totalCredits.toFixed(2) + '</p>';
        }
        html += '</div>';
        var w = window.open('', '_blank', 'width=800,height=600');
        if (!w) { toast('Please allow pop-ups to print your result.', 'error'); return; }
        w.document.write(buildPrintHTML(html));
        w.document.close();
        setTimeout(function () { w.focus(); w.print(); }, 500);
        toast('Preparing your resultâ€¦', 'info');
    }
    function renderPrintSubjects(subjects) {
        if (subjects.length === 0) return '<p>No subjects.</p>';
        var h = '<table class="print-table"><thead><tr><th>Subject</th><th>Credits</th><th>Grade</th><th>Grade Point</th><th>Quality Points</th></tr></thead><tbody>';
        for (var i = 0; i < subjects.length; i++) {
            var s = GPA.enrichSubject(subjects[i]);
            h += '<tr><td>' + esc(s.name) + '</td><td>' + s.credits.toFixed(2) + '</td><td>' + esc(s.grade) + '</td><td>' + (s.gradePoint != null ? s.gradePoint.toFixed(2) : '—') + '</td><td>' + s.qualityPoints.toFixed(2) + '</td></tr>';
        }
        return h + '</tbody></table>';
    }
    function buildPrintHTML(body) {
        return '<!doctype html><html><head><meta charset="utf-8"><title>UET GPA Result</title>' +
            '<style>body{font-family:system-ui,Arial,sans-serif;margin:0;padding:20mm;color:#111;background:#fff}' +
            'h1{font-size:22pt;margin-bottom:4mm}h2{font-size:14pt;margin-top:6mm;border-bottom:1px solid #ccc;padding-bottom:2mm}table{width:100%;border-collapse:collapse;margin:4mm 0}' +
            'th,td{border:1px solid #ccc;padding:4px 6px;text-align:center}th{background:#f0f0f0}' +
            '.print-wrap{max-width:180mm;margin:0 auto}.print-table{font-size:10pt}</style></head><body>' + body + '</body></html>';
    }
    function onDownload() {
        if (state.subjects.length === 0) { toast('Nothing to download yet — add subjects first.', 'error'); return; }
        var res = GPA.calculateSGPA(state.subjects);
        var lines = [];
        lines.push('UET GPA Calculator — Result');
        lines.push('Generated: ' + (new Date()).toLocaleString());
        lines.push('');
        lines.push('Subjects:');
        for (var i = 0; i < state.subjects.length; i++) {
            var s = GPA.enrichSubject(state.subjects[i]);
            lines.push('  - ' + s.name + ' | Credits: ' + s.credits.toFixed(2) + ' | Grade: ' + s.grade + ' | GP: ' + (s.gradePoint != null ? s.gradePoint.toFixed(2) : '—') + ' | QP: ' + s.qualityPoints.toFixed(2));
        }
        lines.push('');
        lines.push('Total Credit Hours: ' + res.totalCredits.toFixed(2));
        lines.push('Total Quality Points: ' + res.totalQualityPoints.toFixed(2));
        lines.push('SGPA: ' + res.sgpaDisplay.toFixed(2) + ' — ' + res.remark);
        if (state.semesters.length) {
            var cr = GPA.calculateCGPA(state.semesters);
            lines.push('');
            lines.push('CGPA: ' + cr.cgpaDisplay.toFixed(2) + ' — ' + cr.remark);
            lines.push('Total Semester Credit Hours: ' + cr.totalCredits.toFixed(2));
        }
        var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'uet-gpa-result-' + Date.now() + '.txt';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('Result downloaded.', 'info');
    }

    /* ---- FAQ accordion ---- */
    function initFaq() {
        $$('.faq-item').forEach(function (item) {
            var q = item.querySelector('.faq-question');
            var a = item.querySelector('.faq-answer');
            if (!q || !a) return;
            q.addEventListener('click', function () {
                var isOpen = item.classList.contains('open');
                var all = $$('.faq-item');
                for (var i = 0; i < all.length; i++) {
                    all[i].classList.remove('open');
                    var btn = all[i].querySelector('.faq-question');
                    var ans = all[i].querySelector('.faq-answer');
                    if (ans) ans.hidden = true;
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
                if (!isOpen) { item.classList.add('open'); a.hidden = false; q.setAttribute('aria-expanded', 'true'); }
            });
        });
    }
    
    /* ---- Restore persisted data ---- */
    function restoreData() {
        var savedSubs = Storage.loadSubjects();
        for (var i = 0; i < savedSubs.length; i++) addSubject(savedSubs[i]);
        var savedSems = Storage.loadSemesters();
        for (var j = 0; j < savedSems.length; j++) addSemester(savedSems[j]);
        updateEmptyState(); updateSemesterEmpty();
        if (els.whatifSubject) buildWhatIfOptions();
        if (state.subjects.length > 0) onCalcSgpa();
        if (state.semesters.length > 0) onCalcCgpa();
        var note = $('save-note');
        if (note) note.style.display = 'block';
        var tgt = Storage.loadTarget();
        if (tgt) {
            if (els.tCurrentCgpa) els.tCurrentCgpa.value = tgt.current || '';
            if (els.tCompletedCredits) els.tCompletedCredits.value = tgt.completed || '';
            if (els.tTargetCgpa) els.tTargetCgpa.value = tgt.target || '';
            if (els.tRemainingCredits) els.tRemainingCredits.value = tgt.remaining || '';
        }
    }

    /* ---- Persist target inputs while typing ---- */
    function saveTargetInputs() {
        Storage.saveTarget({
            current: els.tCurrentCgpa ? els.tCurrentCgpa.value : '',
            completed: els.tCompletedCredits ? els.tCompletedCredits.value : '',
            target: els.tTargetCgpa ? els.tTargetCgpa.value : '',
            remaining: els.tRemainingCredits ? els.tRemainingCredits.value : ''
        });
    }
    function clearTarget() {
        if (els.tCurrentCgpa) els.tCurrentCgpa.value = '';
        if (els.tCompletedCredits) els.tCompletedCredits.value = '';
        if (els.tTargetCgpa) els.tTargetCgpa.value = '';
        if (els.tRemainingCredits) els.tRemainingCredits.value = '';
        Storage.saveTarget(null);
        if (els.tResult) els.tResult.classList.add('hidden');
    }

    /* ---- Event binding ---- */
    function bindEvents() {
        if (els.addSubjectBtn) els.addSubjectBtn.addEventListener('click', function () { addSubject(); });
        var addSubEmpty = $('add-subject-empty');
        if (addSubEmpty) addSubEmpty.addEventListener('click', function () { addSubject(); });
        if (els.calcSgpaBtn) els.calcSgpaBtn.addEventListener('click', onCalcSgpa);
        if (els.resetSgpaBtn) els.resetSgpaBtn.addEventListener('click', onResetSgpa);
        if (els.addSemesterBtn) els.addSemesterBtn.addEventListener('click', function () { addSemester(); });
        var addSemEmpty = $('add-semester-empty');
        if (addSemEmpty) addSemEmpty.addEventListener('click', function () { addSemester(); });
        if (els.calcCgpaBtn) els.calcCgpaBtn.addEventListener('click', onCalcCgpa);
        if (els.resetCgpaBtn) els.resetCgpaBtn.addEventListener('click', onResetCgpa);
        if (els.whatifSubject) els.whatifSubject.addEventListener('change', onWhatIfSubjectChanged);
        if (els.whatifCalc) els.whatifCalc.addEventListener('click', onWhatIfCalc);
        if (els.tCalc) els.tCalc.addEventListener('click', onTargetCalc);
        [els.tCurrentCgpa, els.tCompletedCredits, els.tTargetCgpa, els.tRemainingCredits].forEach(function (f) {
            if (f) f.addEventListener('input', saveTargetInputs);
        });
        var clearTgt = $('clear-target');
        if (clearTgt) clearTgt.addEventListener('click', clearTarget);
        if (els.printBtn) els.printBtn.addEventListener('click', onPrint);
        if (els.downloadBtn) els.downloadBtn.addEventListener('click', onDownload);
        if (els.themeToggle) els.themeToggle.addEventListener('click', toggleTheme);
        initFaq();
    }

    /* ---- Footer year ---- */
    function footerYear() { if (els.currentYear) els.currentYear.textContent = new Date().getFullYear(); }

    /* ---- Init ---- */
    function init() {
        initTheme();
        initNav();
        footerYear();
        buildGradeOptions(els.whatifGrade);
        restoreData();
        bindEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();








