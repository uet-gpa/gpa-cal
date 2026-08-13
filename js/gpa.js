/* =============================================================================
 * js/gpa.js
 * ----------------------------------------------------------------------------
 * Single source of truth for the grading scale, academic remarks, and ALL
 * GPA related calculations / validations.
 *
 * The grading values live ONLY in this file. Edit GRADES / MAX_GPA /
 * REMARK_RULES here to change the scale — they are never hard-coded elsewhere.
 *
 * >>> Before public launch, verify the grading scale against the university's
 *    official policy, as these are DEFAULT values only. <<<
 * ========================================================================== */
'use strict';

(function () {

    /* ------------------------------------------------------------------ *
     *  GRADE CONFIGURATION
     * ------------------------------------------------------------------ */
    var GRADES = [
        { label: 'A+', point: 4.00 },
        { label: 'A',  point: 4.00 },
        { label: 'A-', point: 3.67 },
        { label: 'B+', point: 3.33 },
        { label: 'B',  point: 3.00 },
        { label: 'B-', point: 2.67 },
        { label: 'C+', point: 2.33 },
        { label: 'C',  point: 2.00 },
        { label: 'C-', point: 1.67 },
        { label: 'D+', point: 1.33 },
        { label: 'D',  point: 1.00 },
        { label: 'F',  point: 0.00 }
    ];

    // Maximum possible GPA on this scale (used for validation + target math).
    var MAX_GPA = 4.00;

    // Academic remark thresholds, checked top-down. Configurable.
    var REMARK_RULES = [
        { min: 4.00, label: 'Outstanding' },
        { min: 3.50, label: 'Excellent' },
        { min: 3.00, label: 'Very Good' },
        { min: 2.50, label: 'Good' },
        { min: 2.00, label: 'Satisfactory' },
        { min: 1.00, label: 'Needs Improvement' },
        { min: -Infinity, label: 'Poor' }
    ];

    /* ------------------------------------------------------------------ *
     *  HELPERS
     * ------------------------------------------------------------------ */
    // Round to 2 decimals for DISPLAY only. Intermediate math stays precise.
    function roundTwo(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    function getGradePoint(label) {
        var g = null;
        for (var i = 0; i < GRADES.length; i++) {
            if (GRADES[i].label === label) { g = GRADES[i]; break; }
        }
        return g ? g.point : null;
    }

    function findGrade(label) {
        for (var i = 0; i < GRADES.length; i++) {
            if (GRADES[i].label === label) return GRADES[i];
        }
        return null;
    }

    function gradeLabels() {
        var labels = [];
        for (var i = 0; i < GRADES.length; i++) labels.push(GRADES[i].label);
        return labels;
    }

    // Academic remark for a given (displayed) GPA value.
    function getRemark(gpa) {
        if (gpa == null || isNaN(gpa)) return '';
        for (var i = 0; i < REMARK_RULES.length; i++) {
            if (gpa >= REMARK_RULES[i].min) return REMARK_RULES[i].label;
        }
        return 'Poor';
    }

    /* ------------------------------------------------------------------ *
     *  VALIDATION
     * ------------------------------------------------------------------ */
    function validateSubjectName(name) {
        var v = String(name == null ? '' : name).trim();
        if (v === '') return { valid: false, message: 'Subject name cannot be empty.' };
        if (v.length > 80) return { valid: false, message: 'Subject name is too long (max 80 characters).' };
        return { valid: true, message: '' };
    }

    function validateCredits(credits) {
        if (credits === '' || credits === null || credits === undefined) {
            return { valid: false, message: 'Credit hours cannot be empty.' };
        }
        var n = Number(credits);
        if (isNaN(n)) return { valid: false, message: 'Enter a valid number for credit hours.' };
        if (n < 0) return { valid: false, message: 'Credit hours cannot be negative.' };
        if (n <= 0) return { valid: false, message: 'Credit hours must be greater than zero.' };
        return { valid: true, message: '' };
    }

    function validateGrade(label) {
        return findGrade(label) !== null;
    }

        /* ------------------------------------------------------------------ *
     *  SUBJECT / SGPA
     * ------------------------------------------------------------------ */
    // Attach grade point + quality points to a single subject (precise).
    function enrichSubject(subject) {
        var credits = Number(subject.credits);
        var point = getGradePoint(subject.grade);
        var qualityPoints = (point !== null) ? (credits * point) : 0;
        return {
            id: subject.id,
            name: subject.name,
            credits: credits,
            grade: subject.grade,
            gradePoint: point,
            qualityPoints: qualityPoints
        };
    }

    function processSubjects(subjects) {
        var out = [];
        for (var i = 0; i < subjects.length; i++) out.push(enrichSubject(subjects[i]));
        return out;
    }

    // Main SGPA engine. Returns rich result object.
    function calculateSGPA(subjects) {
        var processed = processSubjects(subjects);
        var totalCredits = 0, totalQP = 0, count = 0;

        for (var i = 0; i < processed.length; i++) {
            var s = processed[i];
            if (!validateGrade(s.grade)) continue; // skip invalid grades
            if (isNaN(s.credits) || s.credits <= 0) continue;
            totalCredits += s.credits;
            totalQP += s.qualityPoints;
            count++;
        }

        var sgpa = (totalCredits > 0) ? (totalQP / totalCredits) : 0;

        return {
            totalSubjects: count,
            totalCredits: roundTwo(totalCredits),
            totalQualityPoints: roundTwo(totalQP),
            sgpa: sgpa,                 // raw (full precision)
            sgpaDisplay: roundTwo(sgpa),
            subjects: processed,
            remark: getRemark(roundTwo(sgpa))
        };
    }

    /* ------------------------------------------------------------------ *
     *  IMPROVEMENT ADVISOR  (Section 14)
     * ------------------------------------------------------------------ */
    function getImprovementAdvice(subjects, sgpa) {
        var valid = [];
        for (var i = 0; i < subjects.length; i++) {
            if (validateGrade(subjects[i].grade)) valid.push(subjects[i]);
        }
        var processed = processSubjects(valid);
        if (processed.length === 0) {
            return { lowest: null, impacts: [], top: null, summary: 'Add subjects to see improvement advice.', count: 0 };
        }

        // Lowest-grade subject (break ties by larger credit hours first).
        var sorted = processed.slice().sort(function (a, b) {
            return a.gradePoint - b.gradePoint || b.credits - a.credits;
        });
        var lowest = sorted[0];

        // Potential impact if every subject were improved to the maximum grade.
        var impacts = [];
        for (var j = 0; j < processed.length; j++) {
            var s = processed[j];
            if (s.gradePoint < MAX_GPA) {
                impacts.push({
                    id: s.id,
                    name: s.name,
                    credits: s.credits,
                    grade: s.grade,
                    gradePoint: s.gradePoint,
                    potentialGain: roundTwo((MAX_GPA - s.gradePoint) * s.credits),
                    impactScore: (MAX_GPA - s.gradePoint) * s.credits // precise for ranking
                });
            }
        }
        impacts.sort(function (a, b) { return b.impactScore - a.impactScore; });

        var top = impacts[0];
        var summary = '';
        if (top) {
            summary = top.name + ' (' + top.credits + ' credit hours, currently ' + top.grade +
                ') is your best improvement opportunity. Prioritizing this subject will give the largest boost to your GPA.';
        } else {
            summary = 'All subjects are already at the maximum grade. Excellent work!';
        }

        return { lowest: lowest, impacts: impacts, top: top, summary: summary, count: processed.length };
    }

    /* ------------------------------------------------------------------ *
     *  WHAT-IF GPA CALCULATOR  (Section 15)
     * ------------------------------------------------------------------ */
    function calculateWhatIf(subjects, targetIndex, newGrade) {
        var current = calculateSGPA(subjects);

        var modified = [];
        for (var i = 0; i < subjects.length; i++) {
            modified.push(i === targetIndex
                ? { id: subjects[i].id, name: subjects[i].name, credits: subjects[i].credits, grade: newGrade }
                : subjects[i]);
        }
        var projected = calculateSGPA(modified);

        var improvement = projected.sgpa - current.sgpa;
        return {
            currentSGPA: current.sgpaDisplay,
            projectedSGPA: projected.sgpaDisplay,
            improvement: improvement,
            improvementDisplay: (improvement >= 0 ? '+' : '') + roundTwo(improvement).toFixed(2),
            newGrade: newGrade,
            newGradePoint: getGradePoint(newGrade)
        };
    }

        /* ------------------------------------------------------------------ *
     *  CGPA  (Section 16/17)
     * ------------------------------------------------------------------ */
    function calculateCGPA(semesters) {
        var totalCredits = 0, totalQP = 0, count = 0;
        var processed = [];

        for (var i = 0; i < semesters.length; i++) {
            var sem = semesters[i];
            var sgpa = Number(sem.sgpa);
            var credits = Number(sem.credits);
            var valid = (!isNaN(sgpa) && sgpa >= 0 && sgpa <= MAX_GPA &&
                !isNaN(credits) && credits > 0);
            if (!valid) {
                processed.push({ id: sem.id, name: sem.name, sgpa: sem.sgpa, credits: sem.credits, valid: false });
                continue;
            }
            totalCredits += credits;
            totalQP += credits * sgpa;
            count++;
            processed.push({
                id: sem.id, name: sem.name, sgpa: roundTwo(sgpa),
                credits: roundTwo(credits), qualityPoints: roundTwo(credits * sgpa), valid: true
            });
        }

        var cgpa = (totalCredits > 0) ? (totalQP / totalCredits) : 0;
        return {
            totalSemesters: count,
            totalCredits: roundTwo(totalCredits),
            totalQualityPoints: roundTwo(totalQP),
            cgpa: cgpa,
            cgpaDisplay: roundTwo(cgpa),
            semesters: processed,
            remark: getRemark(roundTwo(cgpa))
        };
    }

    function validateSemester(sem) {
        var errors = [];
        var sgpa = Number(sem.sgpa);
        var credits = Number(sem.credits);

        if (sem.sgpa === '' || sem.sgpa === null || sem.sgpa === undefined) {
            errors.push('SGPA cannot be empty.');
        } else if (isNaN(sgpa)) {
            errors.push('Enter a valid SGPA.');
        } else if (sgpa < 0) {
            errors.push('SGPA cannot be negative.');
        } else if (sgpa > MAX_GPA) {
            errors.push('SGPA cannot exceed ' + MAX_GPA.toFixed(2) + '.');
        }

        if (sem.credits === '' || sem.credits === null || sem.credits === undefined) {
            errors.push('Credit hours cannot be empty.');
        } else if (isNaN(credits)) {
            errors.push('Enter valid credit hours.');
        } else if (credits <= 0) {
            errors.push('Credit hours must be greater than zero.');
        }

        return { valid: errors.length === 0, errors: errors };
    }

        /* ------------------------------------------------------------------ *
     *  CGPA TARGET CALCULATOR  (Section 18)
     * ------------------------------------------------------------------ */
    function calculateCGPATarget(currentCGPA, completedCredits, targetCGPA, remainingCredits) {
        var cCGPA = Number(currentCGPA);
        var cCred = Number(completedCredits);
        var tCGPA = Number(targetCGPA);
        var rCred = Number(remainingCredits);

        var errors = [];
        if (currentCGPA === '' || currentCGPA === null || currentCGPA === undefined) errors.push('Current CGPA cannot be empty.');
        else if (isNaN(cCGPA)) errors.push('Enter a valid current CGPA.');
        else if (cCGPA < 0) errors.push('Current CGPA cannot be negative.');
        else if (cCGPA > MAX_GPA) errors.push('Current CGPA cannot exceed ' + MAX_GPA.toFixed(2) + '.');

        if (completedCredits === '' || completedCredits === null || completedCredits === undefined) errors.push('Completed credit hours cannot be empty.');
        else if (isNaN(cCred)) errors.push('Enter valid completed credit hours.');
        else if (cCred < 0) errors.push('Completed credit hours cannot be negative.');

        if (targetCGPA === '' || targetCGPA === null || targetCGPA === undefined) errors.push('Target CGPA cannot be empty.');
        else if (isNaN(tCGPA)) errors.push('Enter a valid target CGPA.');
        else if (tCGPA < 0) errors.push('Target CGPA cannot be negative.');
        else if (tCGPA > MAX_GPA) errors.push('Target CGPA cannot exceed ' + MAX_GPA.toFixed(2) + '.');

        if (remainingCredits === '' || remainingCredits === null || remainingCredits === undefined) errors.push('Remaining credit hours cannot be empty.');
        else if (isNaN(rCred)) errors.push('Enter valid remaining credit hours.');
        else if (rCred <= 0) errors.push('Remaining credit hours must be greater than zero.');

        if (errors.length) {
            return { valid: false, errors: errors, requiredGPA: null, achievable: null, gap: null };
        }

        // required average GPA on remaining credits to hit the target
        var totalCredits = cCred + rCred;
        var required = (tCGPA * totalCredits - cCGPA * cCred) / rCred;
        var achievable = (required <= MAX_GPA) && (required >= 0);

        // gap vs. max to give a meaningful suggestion
        var gap = required - MAX_GPA;

        return {
            valid: true,
            errors: [],
            currentCGPA: roundTwo(cCGPA),
            completedCredits: roundTwo(cCred),
            targetCGPA: roundTwo(tCGPA),
            remainingCredits: roundTwo(rCred),
            totalCredits: roundTwo(totalCredits),
            requiredGPA: roundTwo(required),
            achievable: achievable,
            gap: roundTwo(gap)
        };
    }

    /* ------------------------------------------------------------------ *
     *  PUBLIC API
     * ------------------------------------------------------------------ */
    window.GPA = {
        GRADES: GRADES,
        MAX_GPA: MAX_GPA,
        REMARK_RULES: REMARK_RULES,
        roundTwo: roundTwo,
        getGradePoint: getGradePoint,
        findGrade: findGrade,
        gradeLabels: gradeLabels,
        getRemark: getRemark,
        validateSubjectName: validateSubjectName,
        validateCredits: validateCredits,
        validateGrade: validateGrade,
        enrichSubject: enrichSubject,
        processSubjects: processSubjects,
        calculateSGPA: calculateSGPA,
        getImprovementAdvice: getImprovementAdvice,
        calculateWhatIf: calculateWhatIf,
        calculateCGPA: calculateCGPA,
        validateSemester: validateSemester,
        calculateCGPATarget: calculateCGPATarget
    };

})();

