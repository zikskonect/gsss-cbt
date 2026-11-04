// LAN configuration.

const pageLocation = window.location;
const host = pageLocation.hostname || 'localhost';
const apiPort = pageLocation.port || (pageLocation.protocol === 'https:' ? '443' : '8000');
const isSecure = pageLocation.protocol === 'https:';


const LAN_CONFIG = {
    enabled: true,

    server: {
        host,
        apiPort,
        wsPort: 8081,
        apiProtocol: isSecure ? 'https' : 'http',
        wsProtocol: isSecure ? 'wss' : 'ws',
    },

    requestTimeoutMs: 12000,
    maxRetries: 2,
    retryDelayMs: 1500,

    socket: {
        reconnectDelayMs: 3000,
        maxReconnectDelayMs: 30000,
        pingIntervalMs: 25000,
        pongTimeoutMs: 8000,
    },

    sync: {
        flushIntervalMs: 15000,
        maxQueueSize: 5000,
    },

    features: {
        autoRegisterDevice: true,
        autoSyncStudents: true,
        autoPushResults: true,
        showStatusIndicator: true,
    },
};

LAN_CONFIG.apiBase = `${LAN_CONFIG.server.apiProtocol}://${LAN_CONFIG.server.host}:${LAN_CONFIG.server.apiPort}/api`;
LAN_CONFIG.wsUrl = `${LAN_CONFIG.server.wsProtocol}://${LAN_CONFIG.server.host}:${LAN_CONFIG.server.wsPort}`;

window.LAN_CONFIG = LAN_CONFIG;

console.log('✅ lan.config.js loaded — API:', LAN_CONFIG.apiBase, '— WS:', LAN_CONFIG.wsUrl);
