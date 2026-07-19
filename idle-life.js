(() => {
  'use strict';

  const SAVE_KEY = 'pocket-bloom-save-v1';
  const IDLE_PREFIX = 'pb-idle-';
  const MIN_DELAY = 9000;
  const MAX_DELAY = 26000;
  const LONG_PAUSE_CHANCE = 0.14;

  const durations = {
    blink: 760,
    'look-left': 1280,
    'look-right': 1280,
    breathe: 1850,
    stretch: 1800,
    hop: 1300,
    smile: 1500,
    curious: 1750,
    yawn: 2300,
    sniff: 1600,
    scratch: 1900,
    sigh: 2050,
    shiver: 1550,
    dance: 2700,
    daydream: 2850,
  };

  let timer = 0;
  let cleanupTimer = 0;
  let activeIdle = '';
  let recent = [];

  const readState = () => {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); }
    catch { return null; }
  };

  const pet = () => document.getElementById('pet');
  const stage = () => document.getElementById('petStage');

  const isBusy = (state) => {
    const el = pet();
    if (!el || !state || state.stage === 'egg' || state.sleeping) return true;
    if (document.hidden || document.body.classList.contains('reduce-motion')) return true;
    if (document.querySelector('.modal.open')) return true;
    if (document.querySelector('.activity-layer:not(:empty)')) return true;
    if ([...el.classList].some(name => name.startsWith('activity-'))) return true;
    return false;
  };

  const poolFor = (state) => {
    const hour = new Date().getHours();
    const lowNeed = Math.min(state.hunger ?? 100, state.water ?? 100, state.joy ?? 100, state.energy ?? 100, state.clean ?? 100);

    if (state.sick || (state.health ?? 100) < 40) {
      return ['blink', 'sigh', 'shiver', 'look-left', 'look-right', 'breathe'];
    }
    if ((state.energy ?? 100) < 35 || hour >= 21 || hour < 7) {
      return ['yawn', 'blink', 'stretch', 'sigh', 'look-left', 'daydream'];
    }
    if ((state.joy ?? 100) < 38) {
      return ['sigh', 'curious', 'look-left', 'look-right', 'blink', 'breathe'];
    }
    if ((state.hunger ?? 100) < 38 || (state.water ?? 100) < 38) {
      return ['sniff', 'look-left', 'look-right', 'blink', 'sigh'];
    }
    if ((state.clean ?? 100) < 38) {
      return ['scratch', 'sniff', 'blink', 'look-left'];
    }
    if ((state.joy ?? 0) > 80 && (state.energy ?? 0) > 55 && lowNeed > 48) {
      return ['hop', 'smile', 'dance', 'curious', 'look-left', 'look-right', 'blink', 'stretch'];
    }

    const base = ['blink', 'look-left', 'look-right', 'breathe', 'stretch', 'smile', 'curious'];
    if (state.stage === 'baby') base.push('hop', 'curious');
    if (state.stage === 'teen') base.push('dance');
    if (state.stage === 'adult') base.push('daydream', 'stretch');
    return base;
  };

  const choose = (state) => {
    let pool = poolFor(state).filter(name => !recent.includes(name));
    if (!pool.length) pool = poolFor(state);

    const healthyAndHappy = !state.sick && (state.energy ?? 0) > 50 && (state.joy ?? 0) > 60;
    if (healthyAndHappy && Math.random() < 0.08) {
      pool = state.stage === 'adult' ? ['daydream', 'dance'] : ['dance', 'hop'];
    }

    const choice = pool[Math.floor(Math.random() * pool.length)] || 'blink';
    recent = [choice, ...recent].slice(0, 2);
    return choice;
  };

  const symbolFor = (name, state) => {
    if (name === 'daydream') return Math.random() < .5 ? '☁️' : '✨';
    if (name === 'dance') return Math.random() < .5 ? '♪' : '♫';
    if (name === 'curious') return '?';
    if (name === 'yawn') return '…';
    if (name === 'smile' && (state.joy ?? 0) > 80) return '♥';
    return '';
  };

  const clearIdle = () => {
    clearTimeout(cleanupTimer);
    const el = pet();
    if (el && activeIdle) el.classList.remove(`${IDLE_PREFIX}${activeIdle}`);
    document.querySelectorAll('.pb-idle-symbol').forEach(node => node.remove());
    activeIdle = '';
  };

  const runIdle = () => {
    const state = readState();
    if (isBusy(state)) {
      schedule(5000 + Math.random() * 7000);
      return;
    }

    const el = pet();
    if (!el) {
      schedule(6000);
      return;
    }

    clearIdle();
    activeIdle = choose(state);
    el.classList.add(`${IDLE_PREFIX}${activeIdle}`);

    const symbol = symbolFor(activeIdle, state);
    if (symbol) {
      const bubble = document.createElement('span');
      bubble.className = 'pb-idle-symbol';
      bubble.textContent = symbol;
      stage()?.appendChild(bubble);
    }

    cleanupTimer = setTimeout(() => {
      clearIdle();
      schedule();
    }, durations[activeIdle] || 1600);
  };

  const nextDelay = (state = readState()) => {
    let min = MIN_DELAY;
    let max = MAX_DELAY;
    if (state?.sick || (state?.energy ?? 100) < 35) {
      min += 4000;
      max += 7000;
    } else if ((state?.joy ?? 0) > 85 && (state?.energy ?? 0) > 70) {
      min -= 1000;
      max -= 3000;
    }
    if (Math.random() < LONG_PAUSE_CHANCE) return 28000 + Math.random() * 18000;
    return min + Math.random() * Math.max(1000, max - min);
  };

  const schedule = (delay = nextDelay()) => {
    clearTimeout(timer);
    timer = setTimeout(runIdle, delay);
  };

  const postponeForInteraction = (event) => {
    if (!event.target.closest?.('.device, .action, .modal, button, input')) return;
    clearIdle();
    schedule(8500 + Math.random() * 7000);
  };

  document.addEventListener('pointerdown', postponeForInteraction, { passive: true });
  document.addEventListener('keydown', postponeForInteraction);
  document.addEventListener('visibilitychange', () => {
    clearIdle();
    if (!document.hidden) schedule(5000 + Math.random() * 6000);
  });
  window.addEventListener('online', () => schedule(4000));

  window.PocketBloomIdle = Object.freeze({
    trigger: () => { clearTimeout(timer); runIdle(); },
    postpone: () => { clearIdle(); schedule(); },
    clear: clearIdle,
    status: () => ({ active: activeIdle, recent: [...recent] }),
  });

  const start = () => schedule(6500 + Math.random() * 7000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
