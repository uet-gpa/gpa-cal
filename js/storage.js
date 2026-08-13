/* =============================================================================
 * js/storage.js
 * ----------------------------------------------------------------------------
 * Thin localStorage wrapper. Persists subjects, semester data, and the user's
 * theme preference so the calculator is restored across page refreshes.
 *
 * All keys are namespaced. No personal information is ever stored.
 * ========================================================================== */
'use strict';

(function () {

    var KEYS = {
        subjects: 'uet_gpa_subjects',
        semesters: 'uet_gpa_semesters',
        theme: 'uet_gpa_theme',
        target: 'uet_gpa_target'      // CGPA target calculator inputs
    };

    function save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    }

    function load(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (raw === null) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function remove(key) {
        try { localStorage.removeItem(key); } catch (e) {}
    }

    /* ---- typed accessors ---- */
    function saveSubjects(subjects) { return save(KEYS.subjects, subjects); }
    function loadSubjects() { return load(KEYS.subjects, []); }

    function saveSemesters(semesters) { return save(KEYS.semesters, semesters); }
    function loadSemesters() { return load(KEYS.semesters, []); }

    function saveTheme(theme) { return save(KEYS.theme, theme); }
    function loadTheme() { return load(KEYS.theme, null); }   // null => use system preference

    function saveTarget(state) { return save(KEYS.target, state); }
    function loadTarget() { return load(KEYS.target, null); }

    function clearAll() {
        remove(KEYS.subjects);
        remove(KEYS.semesters);
        remove(KEYS.theme);
        remove(KEYS.target);
    }

    window.Storage = {
        KEYS: KEYS,
        save: save,
        load: load,
        remove: remove,
        saveSubjects: saveSubjects,
        loadSubjects: loadSubjects,
        saveSemesters: saveSemesters,
        loadSemesters: loadSemesters,
        saveTheme: saveTheme,
        loadTheme: loadTheme,
        saveTarget: saveTarget,
        loadTarget: loadTarget,
        clearAll: clearAll
    };

})();
