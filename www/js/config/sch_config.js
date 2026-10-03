// sch_config.js - School Configuration
const SCHOOL_CONFIG = {
    // School Information
    schoolName: 'Government Science Secondary School',
    schoolShortName: 'GSSS',
    
    // 👇 CHANGED: Use the actual file that exists
    logoPath: 'js/icons/128x128.png',
    
    // Contact Information
    supportEmail: 'support@gsss.edu.ng',
    supportPhone: '+234 800 123 4567',
    addressLine: 'Tungan Maje, Abuja, Nigeria',
    
    // Branding
    themeColor: '#9c0505',
    secondaryColor: '#af0b57',
    
    // Feature Flags
    enableScheduling: true,
    
    // Assessment Configuration
    assessmentTypes: {
        CA: {
            label: 'Continuous Assessment',
            shortLabel: 'CA',
            maxQuestions: 20,
            defaultDuration: 30,
            icon: 'clipboard-check',
            color: '#720316', // green
            bgColor: 'bg-emerald-100',
            textColor: 'text-emerald-700',
        },
        EXAM: {
            label: 'Examination',
            shortLabel: 'Exam',
            maxQuestions: 100,
            defaultDuration: 120,
            icon: 'graduation-cap',
            color: '#B80236', // red/maroon
            bgColor: 'bg-rose-100',
            textColor: 'text-rose-700',
        }
    }
    
};

window.SCHOOL_CONFIG = SCHOOL_CONFIG;