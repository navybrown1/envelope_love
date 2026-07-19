(() => {
  'use strict';
  const SAVE_KEY = 'pocket-bloom-save-v1';
  const CLOUD_KEY = 'pocket-bloom-cloud-key-v1';
  const REV_KEY = 'pocket-bloom-cloud-revision-v1';
  const ENDPOINT = 'https://qvwbpurcflqoorldxowo.supabase.co/functions/v1/pocket-bloom-sync';
  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  let revision = Number(nativeGet.call(localStorage, REV_KEY) || 0);
  let syncTimer = 0;
  let syncing = false;
  let statusEl;

  const setStatus = (text, tone = '') => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.dataset.tone = tone;
  };

  const generateKey = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return hex.match(/.{1,4}/g).join('-');
  };

  const normalizeKey = value => {
    const hex = String(value || '').toUpperCase().replace(/[^A-F0-9]/g, '');
    return hex.length === 32 ? hex.match(/.{1,4}/g).join('-') : '';
  };

  const getPocketKey = () => {
    let key = normalizeKey(nativeGet.call(localStorage, CLOUD_KEY));
    if (!key) {
      key = generateKey();
      nativeSet.call(localStorage, CLOUD_KEY, key);
    }
    return key;
  };

  const readLocal = () => {
    try { return JSON.parse(nativeGet.call(localStorage, SAVE_KEY) || 'null'); }
    catch { return null; }
  };

  const request = async payload => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, key: getPocketKey() }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 409) throw new Error(data.error || `Cloud error ${response.status}`);
      return { status: response.status, ...data };
    } finally { clearTimeout(timeout); }
  };

  const applyRemote = remote => {
    const local = readLocal();
    if (local) nativeSet.call(localStorage, `${SAVE_KEY}-backup-${Date.now()}`, JSON.stringify(local));
    nativeSet.call(localStorage, SAVE_KEY, JSON.stringify(remote));
    sessionStorage.setItem('pocket-bloom-cloud-reloaded', '1');
    location.reload();
  };

  const push = async ({ force = false, nested = false } = {}) => {
    const local = readLocal();
    if (!local || !navigator.onLine || (syncing && !nested)) return;
    if (!nested) syncing = true;
    setStatus('Saving to cloud…');
    try {
      let result = await request({
        action: 'save', state: local,
        clientUpdatedAt: Number(local.lastTick || Date.now()),
        expectedRevision: revision || null,
      });
      if (result.conflict) {
        const latest = await request({ action: 'load' });
        const remote = latest.save?.state;
        const localTime = Number(local.lastTick || 0);
        const remoteTime = Number(remote?.lastTick || 0);
        revision = Number(latest.save?.revision || 0);
        if (remote && remoteTime > localTime && !force) {
          applyRemote(remote);
          return;
        }
        result = await request({
          action: 'save', state: local,
          clientUpdatedAt: Number(local.lastTick || Date.now()),
          expectedRevision: revision,
        });
      }
      if (result.saved) {
        revision = Number(result.save.revision || revision);
        nativeSet.call(localStorage, REV_KEY, String(revision));
        setStatus('Saved to cloud', 'good');
      }
    } catch (error) {
      console.error('Pocket Bloom cloud save failed', error);
      setStatus(navigator.onLine ? 'Cloud retry pending' : 'Offline — saved locally', 'warn');
    } finally { if (!nested) syncing = false; }
  };

  const pull = async ({ initial = false } = {}) => {
    if (syncing || !navigator.onLine) return;
    syncing = true;
    setStatus('Checking cloud…');
    try {
      const result = await request({ action: 'load' });
      const local = readLocal();
      if (!result.found) {
        if (local) await push({ force: true, nested: true });
        else setStatus('Cloud ready', 'good');
        return;
      }
      revision = Number(result.save.revision || 0);
      nativeSet.call(localStorage, REV_KEY, String(revision));
      const remote = result.save.state;
      const localTime = Number(local?.lastTick || 0);
      const remoteTime = Number(remote?.lastTick || 0);
      if (!local || remoteTime > localTime + 1000) {
        setStatus('Newer pet found. Loading…', 'good');
        applyRemote(remote);
        return;
      }
      if (localTime > remoteTime + 1000) await push({ force: true, nested: true });
      else setStatus('Synced', 'good');
      if (initial && sessionStorage.getItem('pocket-bloom-cloud-reloaded')) {
        sessionStorage.removeItem('pocket-bloom-cloud-reloaded');
        setStatus('Pet restored from cloud', 'good');
      }
    } catch (error) {
      console.error('Pocket Bloom cloud pull failed', error);
      setStatus(navigator.onLine ? 'Cloud unavailable — saved locally' : 'Offline — saved locally', 'warn');
    } finally { syncing = false; }
  };

  const schedulePush = () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => push(), 900);
  };

  Storage.prototype.setItem = function(key, value) {
    nativeSet.call(this, key, value);
    if (this === localStorage && key === SAVE_KEY) schedulePush();
  };
  Storage.prototype.removeItem = function(key) {
    nativeRemove.call(this, key);
    if (this === localStorage && key === SAVE_KEY) schedulePush();
  };

  const setupUI = () => {
    statusEl = document.getElementById('cloudStatus');
    const key = getPocketKey();
    const keyEl = document.getElementById('pocketKey');
    const importEl = document.getElementById('importPocketKey');
    if (keyEl) keyEl.textContent = key;

    document.getElementById('copyPocketKey')?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(key).catch(() => {});
      setStatus('Pocket Key copied — keep it private', 'good');
    });
    document.getElementById('syncNow')?.addEventListener('click', () => pull());
    document.getElementById('usePocketKey')?.addEventListener('click', async () => {
      const next = normalizeKey(importEl?.value);
      if (!next) { setStatus('Enter a valid 32-character Pocket Key', 'warn'); return; }
      if (next === getPocketKey()) { setStatus('That key is already connected', 'good'); return; }
      if (!confirm('Connect this device to that Pocket Key? Your current local pet will be backed up before any cloud pet is loaded.')) return;
      nativeSet.call(localStorage, `${SAVE_KEY}-backup-${Date.now()}`, nativeGet.call(localStorage, SAVE_KEY) || 'null');
      nativeSet.call(localStorage, CLOUD_KEY, next);
      nativeSet.call(localStorage, REV_KEY, '0');
      revision = 0;
      if (keyEl) keyEl.textContent = next;
      await pull({ initial: true });
    });
  };

  window.PocketBloomCloud = { pull, push, getPocketKey };
  window.addEventListener('online', () => pull());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); });
  document.addEventListener('DOMContentLoaded', async () => {
    setupUI();
    await pull({ initial: true });
    setInterval(() => { if (document.visibilityState === 'visible') pull(); }, 30000);
  });
})();
