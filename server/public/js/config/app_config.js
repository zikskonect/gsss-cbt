// app_config.js - Application Configuration (v2)

const APP_CONFIG = {
    appName: 'GSSS GWAGWALADA CBT',
    version: '1.0.0',

    // Feature Flags
    enableOfflineMode: true,
    enableImageUpload: true,
    maxImageSizeMB: 5,
    enableExamScheduling: true,
    enableLAN: false,           // ← Phase 3 will flip this to true

    // Default Values
    defaultExamDuration: 30,
    defaultQuestionsPerPage: 20,

    // Storage Settings
    dbName: 'testulatorDB',
    dbVersion: 14,

    // UI Settings
    animationDuration: 300,
    alertDuration: 4000,
};

window.APP_CONFIG = APP_CONFIG;