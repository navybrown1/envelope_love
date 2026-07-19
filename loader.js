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
    const decompressed = new Blob([compressed])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'));
    const html = await new Response(decompressed).text();

    if (!html.includes('<title>Pocket Bloom</title>')) {
      throw new Error('The game package could not be verified.');
    }

    document.open();
    document.write(html);
    document.close();
  } catch (error) {
    console.error('Pocket Bloom startup failed:', error);
    showFailure(error instanceof Error ? error.message : 'The game could not start.');
  }
})();
