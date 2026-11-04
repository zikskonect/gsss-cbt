const os = require('os');
const QRCode = require('qrcode');
function getLanInterfaces() {
    const ifaces = os.networkInterfaces(); const results=[];
    for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name]) {
            if (iface.family !== 'IPv4' || iface.internal) continue;
            results.push({ name, address: iface.address });
        }
    }
    return results;
}
function getPrimaryLanIp() {
    const list = getLanInterfaces();
    if (list.length===0) return '127.0.0.1';
    const pref = list.find(i => i.address.startsWith('192.168.') || i.address.startsWith('10.'));
    return (pref || list[0]).address;
}
function getCurrentNetwork() {
    const primary = getPrimaryLanIp();
    return { primaryIp: primary, url: `http://${primary}:8000`, wsUrl: `ws://${primary}:8081`, interfaces: getLanInterfaces() };
}
async function generateQrDataUrl(text) {
    try { return await QRCode.toDataURL(text, { width: 260, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } }); }
    catch { return null; }
}
module.exports = { getPrimaryLanIp, getCurrentNetwork, generateQrDataUrl, getLanInterfaces };