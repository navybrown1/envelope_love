(async () => {
  const showFailure = (message) => {
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#ffeaf4,#fff8dc);font-family:system-ui,sans-serif;color:#38283f;text-align:center">
        <section style="max-width:480px;padding:34px;border-radius:28px;background:rgba(255,255,255,.88);box-shadow:0 24px 70px rgba(90,45,90,.18)">
          <div style="font-size:64px">🥚</div>
          <h1 style="margin:12px 0 8px">Pocket Bloom needs a refresh</h1>
          <p style="line-height:1.55">${message}</p>
          <button onclick="location.reload()" style="border:0;border-radius:999px;padding:14px 22px;background:#ff6fae;color:white;font-weight:800;font-size:16px;cursor:pointer">Try again</button>
        </section>
      </main>`;
  };

  try {
    const encoded = (window.PB_PAYLOAD || []).join('');
    if (!encoded) throw new Error('The game package did not load.');
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser is too old to open the game. Please use a current version of Safari, Chrome, Edge, or Firefox.');
    }

    const compressed = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const decompressed = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    let html = await new Response(decompressed).text();

    if (!html.includes('<title>Pocket Bloom</title>')) throw new Error('The game package could not be verified.');

    const cloudStyles = `<style>
      .cloud-card{margin:18px 0;padding:16px;border:2px solid rgba(99,79,130,.16);border-radius:20px;background:linear-gradient(145deg,#f4efff,#fff7fc)}
      .cloud-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.cloud-head div{display:grid;gap:3px}.cloud-head small{font-weight:800;color:#766b83}.cloud-head small[data-tone="good"]{color:#268861}.cloud-head small[data-tone="warn"]{color:#b66b20}
      .cloud-help{font-size:.86rem;line-height:1.45;margin:12px 0;color:#62566d}.pocket-key{display:block;overflow-wrap:anywhere;padding:11px;border-radius:12px;background:#30283c;color:#fff;font-size:.78rem;letter-spacing:.05em;text-align:center}
      .cloud-button{border:0;border-radius:999px;padding:9px 13px;background:#7556c9;color:#fff;font-weight:900;cursor:pointer}.cloud-button.wide{width:100%;margin-top:9px}.cloud-import{margin-top:12px}.cloud-import summary{cursor:pointer;font-weight:850}.cloud-import input{width:100%;margin-top:10px;font-size:.75rem}
    </style><script src="cloud-sync.js"></script>`;
    html = html.replace('</head>', `${cloudStyles}</head>`);
    html = html.replace(
      '<p>Your companion lives only in this browser. Progress is stored locally on your device.</p><div class="settings-list">',
      `<p>Your companion is saved locally and securely synchronized through Pocket Bloom Cloud.</p>
      <section class="cloud-card" aria-label="Cloud synchronization">
        <div class="cloud-head"><div><strong>☁️ Pocket Bloom Cloud</strong><small id="cloudStatus">Connecting…</small></div><button class="cloud-button" id="syncNow">Sync now</button></div>
        <p class="cloud-help">Use this private Pocket Key on another phone or computer to continue with the exact same pet.</p>
        <code class="pocket-key" id="pocketKey">Generating…</code>
        <button class="cloud-button wide" id="copyPocketKey">Copy Pocket Key</button>
        <details class="cloud-import"><summary>Connect another Pocket Key</summary><input class="name-input" id="importPocketKey" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"><button class="cloud-button wide" id="usePocketKey">Load this cloud pet</button></details>
      </section><div class="settings-list">`
    );

    document.open();
    document.write(html);
    document.close();
  } catch (error) {
    console.error('Pocket Bloom startup failed:', error);
    showFailure(error instanceof Error ? error.message : 'The game could not start.');
  }
})();
