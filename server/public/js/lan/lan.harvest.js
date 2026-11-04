// www/js/lan/lan.harvest.js
// ═══════════════════════════════════════════════════════════
//  Pulls results from the server and stores them locally.
//  Used by the exam office "Harvest Results" button and
//  by the client on boot to catch up on past exams.
// ═══════════════════════════════════════════════════════════

const LanHarvest = {
    /**
     * Harvest all unharvested results from the server.
     * Idempotent — results already in local IndexedDB are skipped.
     */
    async harvestAll() {
        if (!LAN_CONFIG.enabled) {
            return { ok: false, error: { message: 'LAN disabled' } };
        }

        const res = await LanApi.post('/results/harvest', {});
        if (!res.ok) return res;

        const incoming = res.data.results || [];

        if (incoming.length === 0) {
            return { ok: true, harvested: 0, stored: 0, skipped: 0 };
        }

        // Load existing local result IDs so we don't double-write
        const existing = await loadResultsFromDB();
        const existingIds = new Set((existing || []).map(r => r.result_id));

        let stored = 0, skipped = 0;

        for (const r of incoming) {
            if (existingIds.has(r.result_id)) {
                skipped++;
                continue;
            }

            // Shape into the local result format used by storage.js
            const localResult = {
                result_id:       r.result_id,
                exam_id:         r.exam_id,
                exam_subject:    r.exam_subject,
                student_name:    r.student_name,
                student_class:   r.student_class,
                student_arms:    r.student_arms,
                exam_code:       r.exam_code,
                score:           r.score,
                total:           r.total,
                percentage:      r.percentage,
                duration_taken:  r.duration_taken,
                answers:         r.answers || {},
                exam_details:    r.exam_details || {},
                submitted_at:    r.submitted_at,
            };

            try {
                await saveResultToDB(localResult);
                stored++;
            } catch (err) {
                console.warn('Failed to store harvested result:', r.result_id, err);
            }
        }

        console.log(`📥 Harvested ${incoming.length}, stored ${stored}, skipped ${skipped}`);

        // Refresh UI state
        if (typeof loadResults === 'function') {
            await loadResults();
        }

        return { ok: true, harvested: incoming.length, stored, skipped };
    },

    /**
     * Harvest a single exam's results.
     */
    async harvestExam(examId) {
        const res = await LanApi.get('/results?exam_id=' + encodeURIComponent(examId) + '&limit=500');
        if (!res.ok) return res;
        // ... same storage logic — could reuse harvestAll by extending the API
        return res;
    },

    /**
     * Pull the full student list from the server (admin or FT only).
     */
    async syncStudentsDown(classCode = null, year = null) {
        const params = [];
        if (classCode) params.push('class_code=' + encodeURIComponent(classCode));
        if (year) params.push('year=' + encodeURIComponent(year));
        const qs = params.length ? '?' + params.join('&') : '';

        const res = await LanApi.get('/students' + qs);
        if (!res.ok) return res;

        const incoming = res.data.students || [];
        let stored = 0, updated = 0;

        for (const s of incoming) {
            try {
                const existing = await getStudentById(s.student_id);
                await saveStudentToDB(s);
                if (existing) updated++; else stored++;
            } catch (err) {
                console.warn('Student sync failed:', s.student_id, err);
            }
        }

        console.log(`📥 Students synced — new: ${stored}, updated: ${updated}`);
        return { ok: true, total: incoming.length, stored, updated };
    },
};

window.LanHarvest = LanHarvest;
console.log('✅ lan.harvest.js loaded');