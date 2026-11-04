// sch_config.js - School Configuration (v2)
// ═══════════════════════════════════════════════════════════
//  SINGLE SOURCE OF TRUTH
//  Change values here → they apply across the entire app.
// ═══════════════════════════════════════════════════════════

const SCHOOL_CONFIG = {
    // ─── School Identity ─────────────────────────────────
    schoolName: 'Government Secondary School, Gwagwalada',
    schoolShortName: 'GSS GWAGS',
    schoolCode: 'GSS',                 // ← used in exam codes: GSS/SS1/002
    tagline: 'Learning for Service',
    subtitle: 'Offline Examination Platform',

    // ─── Academic Year ───────────────────────────────────
    // The admin can change this from the Admin Setup page.
    // Stored in IndexedDB `academic_years` too, but this is the boot default.
    academicYear: '2025/2026',

    // ─── Logo ────────────────────────────────────────────
    logoPath: 'js/sch_logo.png',
    logoAlt: 'GSS Logo',

    // ─── Contact ─────────────────────────────────────────
    supportEmail: 'support@gss.edu.ng',
    supportPhone: '+234 800 123 4567',
    addressLine: 'Gwagwalada, Abuja, Nigeria',

    // ─── Branding Colours ────────────────────────────────
    themeColor: '#0311d8',
    secondaryColor: '#41cffa',
    accentColor: '#7e22ce',
    neutralDark: '#1f2937',
    neutralLight: '#f9fafb',

//     .themeColor{ 
//   primary:#0311d8;
//     secondaryColor: #41cffa;
//     accentColor: #7e22ce;
//     neutralDark: #1f2937;
//     neutralLight: #f9fafb
//  }

    // ─── Feature Flags ───────────────────────────────────
    enableScheduling: true,
    enableFormTeachers: true,

    // ─── Defaults for Admin Setup ────────────────────────
    // These are SEEDED on first run — admin can edit/delete afterwards.
    // The admin setup page reads from IndexedDB, not from here.
    defaultLevels: [
        { name: 'JSS',  label: 'Junior Secondary', order: 1 },
        { name: 'SS',   label: 'Senior Secondary', order: 2 },
    ],

    defaultClasses: [
        { name: 'JSS 1', code: 'JSS1', level: 'JSS', order: 1 },
        { name: 'JSS 2', code: 'JSS2', level: 'JSS', order: 2 },
        { name: 'JSS 3', code: 'JSS3', level: 'JSS', order: 3 },
        { name: 'SS 1',  code: 'SS1',  level: 'SS',  order: 4 },
        { name: 'SS 2',  code: 'SS2',  level: 'SS',  order: 5 },
        { name: 'SS 3',  code: 'SS3',  level: 'SS',  order: 6 },
    ],

    defaultArms: [
        { label: 'A', order: 1 },
        { label: 'B', order: 2 },
        { label: 'C', order: 3 },
        { label: 'D', order: 4 },
    ],

    defaultDepartments: [
        { name: 'Science',  order: 1 },
        { name: 'Arts',     order: 2 },
        { name: 'Business', order: 3 },
        { name: 'Trade',    order: 4 },
    ],

    // ─── Assessment Configuration ────────────────────────
    assessmentTypes: {
        CA: {
            label: 'Continuous Assessment',
            shortLabel: 'CA',
            maxQuestions: 20,
            defaultDuration: 5,
            icon: 'clipboard-check',
            color: '#720316',
            bgColor: 'bg-emerald-100',
            textColor: 'text-emerald-700',
        },
        EXAM: {
            label: 'Examination',
            shortLabel: 'Exam',
            maxQuestions: 100,
            defaultDuration: 30,
            icon: 'graduation-cap',
            color: '#2563EB',
            bgColor: 'bg-rose-100',
            textColor: 'text-rose-700',
        }
    }
};

// ─── Convenience Getters ─────────────────────────────────
window.getSchoolName       = () => SCHOOL_CONFIG.schoolName;
window.getSchoolShortName  = () => SCHOOL_CONFIG.schoolShortName;
window.getSchoolCode       = () => SCHOOL_CONFIG.schoolCode;
window.getSchoolLogo       = () => SCHOOL_CONFIG.logoPath;
window.getSchoolTagline    = () => SCHOOL_CONFIG.tagline;
window.getThemeColor       = () => SCHOOL_CONFIG.themeColor;
window.getSecondaryColor   = () => SCHOOL_CONFIG.secondaryColor;
window.getAccentColor      = () => SCHOOL_CONFIG.accentColor;
window.getAcademicYear     = () => SCHOOL_CONFIG.academicYear;

window.SCHOOL_CONFIG = SCHOOL_CONFIG;