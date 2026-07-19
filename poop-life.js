(() => {
  'use strict';

  const SAVE_KEY = 'pocket-bloom-save-v1';
  const MAX_POOPS = 3;
  const FIRST_MIN_MS = 8 * 60 * 1000;
  const FIRST_MAX_MS = 18 * 60 * 1000;
  const NEXT_MIN_MS = 22 * 60 * 1000;
  const NEXT_MAX_MS = 48 * 60 * 1000;
  const CHECK_MS = 15000;

  let checkTimer = 0;
  let cleanObserver = null;
  let lastKnownCount = -1;

  const randomBetween = (min, max) => Math.round(min + Math.random() * (max - min));
  const nextDelay = (first = false) => first
    ? randomBetween(FIRST_MIN_MS, FIRST_MAX_MS)
    : randomBetween(NEXT_MIN_MS, NEXT_MAX_MS);

  const readState = () => {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); }
    catch { return null; }
  };

  const writeState = (state) => {
    state.lastTick = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  };

  const stage = () => document.getElementById('petStage');
  const pet = () => document.getElementById('pet');

  const ensureFields = (state) => {
    let changed = false;
    if (!Number.isInteger(state.poopCount) || state.poopCount < 0) {
      state.poopCount = 0;
      changed = true;
    }
    state.poopCount = Math.min(MAX_POOPS, state.poopCount);
    if (!Number.isFinite(Number(state.nextPoopAt)) || Number(state.nextPoopAt) <= 0) {
      state.nextPoopAt = Date.now() + nextDelay(true);
      changed = true;
    }
    return changed;
  };

  const renderPoops = (count, { arrived = false } = {}) => {
    const host = stage();
    if (!host) return;
    let zone = host.querySelector('.pb-poop-zone');
    if (!zone) {
      zone = document.createElement('div');
      zone.className = 'pb-poop-zone';
      zone.setAttribute('aria-hidden', 'true');
      host.appendChild(zone);
    }

    if (count === lastKnownCount && zone.childElementCount === count) return;
    zone.innerHTML = '';
    for (let i = 0; i < count; i += 1) {
      const item = document.createElement('span');
      item.className = 'pb-poop';
      item.textContent = '💩';
      if (!arrived) item.style.animation = 'none';
      zone.appendChild(item);
    }
    lastKnownCount = count;
  };

  const showAlert = (text = 'uh-oh!') => {
    const host = stage();
    const buddy = pet();
    if (!host) return;
    host.querySelectorAll('.pb-poop-alert').forEach(node => node.remove());
    const alert = document.createElement('span');
    alert.className = 'pb-poop-alert';
    alert.textContent = text;
    host.appendChild(alert);
    if (buddy) {
      buddy.classList.remove('pb-poop-notice');
      void buddy.offsetWidth;
      buddy.classList.add('pb-poop-notice');
      setTimeout(() => buddy.classList.remove('pb-poop-notice'), 1450);
    }
    setTimeout(() => alert.remove(), 2200);
  };

  const applyPoopPenalty = (state, added) => {
    const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
    state.clean = clamp((state.clean ?? 100) - 11 * added);
    state.joy = clamp((state.joy ?? 100) - 3 * added);
    if (state.poopCount >= MAX_POOPS) {
      state.health = clamp((state.health ?? 100) - 2);
      state.sick = state.health < 38;
    }
  };

  const processSchedule = () => {
    const state = readState();
    if (!state || state.stage === 'egg') {
      renderPoops(0);
      scheduleCheck();
      return;
    }

    let changed = ensureFields(state);
    const now = Date.now();
    let added = 0;

    if (!state.sleeping) {
      while (now >= Number(state.nextPoopAt) && state.poopCount < MAX_POOPS) {
        state.poopCount += 1;
        added += 1;
        state.lastPoopAt = now;
        state.nextPoopAt = Number(state.nextPoopAt) + nextDelay(false);
        changed = true;
      }
    } else if (now >= Number(state.nextPoopAt)) {
      state.nextPoopAt = now + randomBetween(5 * 60 * 1000, 12 * 60 * 1000);
      changed = true;
    }

    if (added > 0) {
      applyPoopPenalty(state, added);
      renderPoops(state.poopCount, { arrived: true });
      showAlert(state.poopCount >= MAX_POOPS ? 'clean me!' : 'uh-oh!');
    } else {
      renderPoops(state.poopCount);
    }

    if (changed) writeState(state);
    scheduleCheck();
  };

  const cleanPoops = () => {
    const state = readState();
    if (!state || !state.poopCount) return;

    const zone = stage()?.querySelector('.pb-poop-zone');
    zone?.querySelectorAll('.pb-poop').forEach((node, index) => {
      setTimeout(() => node.classList.add('pb-poop-cleaning'), index * 90);
    });

    state.poopCount = 0;
    state.lastPoopCleanedAt = Date.now();
    state.nextPoopAt = Date.now() + nextDelay(false);
    state.joy = Math.min(100, Math.round((state.joy ?? 100) + 4));
    writeState(state);

    setTimeout(() => {
      lastKnownCount = -1;
      renderPoops(0);
      showAlert('all clean!');
    }, 760);
  };

  const watchCleanAction = () => {
    const buddy = pet();
    if (!buddy || cleanObserver) return;
    cleanObserver = new MutationObserver(() => {
      if (buddy.classList.contains('activity-clean')) cleanPoops();
    });
    cleanObserver.observe(buddy, { attributes: true, attributeFilter: ['class'] });
  };

  const scheduleCheck = (delay = CHECK_MS) => {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(processSchedule, delay);
  };

  const start = () => {
    watchCleanAction();
    processSchedule();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) processSchedule();
    });
    window.addEventListener('online', processSchedule);
  };

  window.PocketBloomPoop = Object.freeze({
    spawn: () => {
      const state = readState();
      if (!state || state.stage === 'egg' || state.poopCount >= MAX_POOPS) return false;
      ensureFields(state);
      state.poopCount += 1;
      applyPoopPenalty(state, 1);
      state.lastPoopAt = Date.now();
      state.nextPoopAt = Date.now() + nextDelay(false);
      writeState(state);
      renderPoops(state.poopCount, { arrived: true });
      showAlert('uh-oh!');
      return true;
    },
    clean: cleanPoops,
    status: () => {
      const state = readState();
      return state ? { count: state.poopCount || 0, nextPoopAt: state.nextPoopAt || null } : null;
    },
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
