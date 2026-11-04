// www/js/features/admin/admin.year.js
// ═══════════════════════════════════════════════════════════
//  Academic Year management + yearly rollover.
//
//  Rules:
//    - Only ONE year can be `is_current: true` at a time.
//    - Starting a new year archives all active students from
//      the previous year (sets status = 'archived').
//    - Students do NOT auto-promote. Each form teacher
//      re-registers their class, and every student gets a
//      fresh exam code.
// ═══════════════════════════════════════════════════════════

function generateAcademicYearId(label) {
    return label.replace(/\s+/g, '');
}

/**
 * Validate a year label like '2025/2026' or '2024-2025'.
 */
function isValidYearLabel(label) {
    return /^\d{4}[\/\-]\d{4}$/.test((label || '').trim());
}

function centralYearsReady() {
    return window.LanApi &&
        window.LAN_CONFIG?.enabled &&
        navigator.onLine &&
        LanApi.loadToken() &&
        LanApi.loadToken() !== 'offline';
}

async function syncAcademicYearsFromCentral() {
    if (!centralYearsReady()) return { ok: false, skipped: true };

    const response = await LanApi.get('/years');
    if (!response.ok) return response;

    for (const year of response.data?.years || []) {
        await saveAcademicYearToDB(year);
    }
    return { ok: true, years: response.data?.years || [] };
}

/**
 * Add a new academic year WITHOUT making it current.
 * Useful for pre-scheduling next session.
 */
async function adminAddAcademicYear(label) {
    try {
        const clean = (label || '').trim();
        if (!isValidYearLabel(clean)) {
            return { ok: false, error: 'Format must be YYYY/YYYY (e.g. 2025/2026)' };
        }

        const yearId = generateAcademicYearId(clean);
        const all = await loadAllAcademicYearsFromDB();
        if (all.find(y => y.year_id === yearId)) {
            return { ok: false, error: `Academic year ${clean} already exists` };
        }

        const ay = {
            year_id: yearId,
            label: clean,
            is_current: false,
            started_at: null,
            closed_at: null,
            created_at: new Date().toISOString(),
        };

        if (centralYearsReady()) {
            const response = await LanApi.post('/years', { label: clean });
            if (!response.ok) {
                if (!['network', 'timeout'].includes(response.error?.code)) {
                    return { ok: false, error: response.error?.message || 'Could not create year centrally' };
                }
            } else {
                const centralYear = response.data?.year || ay;
                await saveAcademicYearToDB(centralYear);
                return { ok: true, year: centralYear, source: 'central' };
            }
        }

        await saveAcademicYearToDB(ay);
        return { ok: true, year: ay, source: 'local' };
    } catch (err) {
        console.error('adminAddAcademicYear error:', err);
        return { ok: false, error: err.message };
    }
}

/**
 * Start a new academic year. This is the big one.
 * Steps:
 *   1. Confirm with admin (done in UI handler)
 *   2. Archive all active students in the previous year
 *   3. Mark the new year as current, close the old one
 *   4. Update SCHOOL_CONFIG.academicYear (runtime)
 */
async function adminStartNewAcademicYear(yearId) {
    try {
        const all = await loadAllAcademicYearsFromDB();
        const newYear = all.find(y => y.year_id === yearId);
        if (!newYear) return { ok: false, error: 'Academic year not found' };

        const current = await getCurrentAcademicYearFromDB();

        if (centralYearsReady()) {
            const response = await LanApi.post(
                '/years/' + encodeURIComponent(yearId) + '/start',
                {}
            );
            if (!response.ok) {
                if (!['network', 'timeout'].includes(response.error?.code)) {
                    return { ok: false, error: response.error?.message || 'Could not start year centrally' };
                }
            } else {
                await syncAcademicYearsFromCentral();
                const centralYear = response.data?.year || newYear;
                state.currentAcademicYear = centralYear;
                state.academicYears = await loadAllAcademicYearsFromDB();
                SCHOOL_CONFIG.academicYear = centralYear.label || newYear.label;
                return {
                    ok: true,
                    archived: response.data?.archived_students || 0,
                    year: centralYear,
                    source: 'central',
                };
            }
        }

        // Archive students from old year
        let archived = 0;
        if (current && current.year_id !== yearId) {
            const students = await loadStudentsByYear(current.year_id);
            for (const s of students) {
                if (s.status === 'active') {
                    s.status = 'archived';
                    s.archived_at = new Date().toISOString();
                    await saveStudentToDB(s);
                    archived++;
                }
            }
        }

        // Close old year, open new year
        for (const y of all) {
            y.is_current = (y.year_id === yearId);
            if (y.year_id === yearId) {
                y.started_at = new Date().toISOString();
                y.closed_at = null;
            } else if (y.is_current === false && !y.closed_at) {
                // ensure only the previous current-year gets a closed_at
                if (current && current.year_id === y.year_id) {
                    y.closed_at = new Date().toISOString();
                }
            }
            await saveAcademicYearToDB(y);
        }

        // Update runtime config
        SCHOOL_CONFIG.academicYear = newYear.label;

        // Refresh state
        state.currentAcademicYear = newYear;
        state.academicYears = await loadAllAcademicYearsFromDB();

        return { ok: true, archived, year: newYear };
    } catch (err) {
        console.error('adminStartNewAcademicYear error:', err);
        return { ok: false, error: err.message };
    }
}

async function adminRefreshAcademicYears() {
    try {
        await syncAcademicYearsFromCentral();
    } catch (err) {
        console.warn('Central academic-year sync failed:', err);
    }
    state.academicYears = await loadAllAcademicYearsFromDB();
    state.currentAcademicYear = await getCurrentAcademicYearFromDB();
    render();
}

// ─── UI handlers ───────────────────────────────────────────

async function handleAddAcademicYear(event) {
    event.preventDefault();

    const label = document.getElementById('new-academic-year')?.value || '';
    const result = await adminAddAcademicYear(label);

    if (!result.ok) {
        showAlert(result.error, 'error');
        return;
    }

    showAlert(`✅ Academic year ${result.year.label} added`, 'success', 3000);
    const el = document.getElementById('new-academic-year');
    if (el) el.value = '';

    await adminRefreshAcademicYears();
}

async function handleStartAcademicYear(yearId) {
    const all = await loadAllAcademicYearsFromDB();
    const target = all.find(y => y.year_id === yearId);
    if (!target) return;

    const current = await getCurrentAcademicYearFromDB();

    const confirmMessage =
        `⚠️ START NEW ACADEMIC YEAR ⚠️\n\n` +
        `Current: ${current?.label || '(none)'}\n` +
        `New:     ${target.label}\n\n` +
        `This will ARCHIVE all active students from ${current?.label || 'the current session'}.\n\n` +
        `Students will NOT be carried over automatically. Each form teacher will need to register their class again, and every student will receive a NEW exam code.\n\n` +
        `Are you absolutely sure?`;

    if (!confirm(confirmMessage)) return;

    const result = await adminStartNewAcademicYear(yearId);
    if (!result.ok) {
        showAlert(result.error, 'error', 6000);
        return;
    }

    showAlert(
        `✅ Academic year ${result.year.label} started.\n${result.archived} student(s) archived.`,
        'success',
        8000
    );

    await adminRefreshAcademicYears();
}

// Exports
window.adminAddAcademicYear         = adminAddAcademicYear;
window.adminStartNewAcademicYear    = adminStartNewAcademicYear;
window.adminRefreshAcademicYears    = adminRefreshAcademicYears;
window.handleAddAcademicYear        = handleAddAcademicYear;
window.handleStartAcademicYear      = handleStartAcademicYear;

console.log('✅ admin.year.js loaded');