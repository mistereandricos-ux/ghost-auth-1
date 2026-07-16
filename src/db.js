const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data.json');

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return {}; }
}
function save(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8'); }

module.exports = {
  getUser(userId) { return load()[userId]; },
  upsertKey(userId, key) {
    const d = load();
    d[userId] = { key, hwid: null, createdAt: Date.now() };
    save(d);
  },
  resetHwid(userId) {
    const d = load();
    if (d[userId]) { d[userId].hwid = null; save(d); return true; }
    return false;
  },
  findByKey(key) {
    const d = load();
    const e = Object.entries(d).find(([, v]) => v.key === key);
    return e ? { userId: e[0], ...e[1] } : null;
  },
};
