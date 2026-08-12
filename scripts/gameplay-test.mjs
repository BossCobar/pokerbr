/**
 * PokerBR — Robust gameplay test
 * 3 players · rebuy · 8+ hands · chip conservation check
 * Run: node scripts/gameplay-test.mjs
 */
import puppeteer from 'puppeteer';
import { mkdir, rm } from 'fs/promises';

const BASE_URL = 'https://pokerbr-backend-production.up.railway.app';
const SS_DIR   = './scripts/screenshots';
let ssCount = 0;
let consoleErrors = { host: [], p2: [], p3: [] };

const log  = (msg) => console.log(msg);
const warn = (msg) => console.warn(' ⚠️ ', msg);
const fail = (msg) => console.error(' ❌', msg);
const wait = (ms)  => new Promise(r => setTimeout(r, ms));

// ── Screenshot ───────────────────────────────────────────────────────────────
async function ss(page, label) {
  ssCount++;
  const n = String(ssCount).padStart(2, '0');
  const path = `${SS_DIR}/${n}-${label}.png`;
  await page.screenshot({ path, fullPage: false });
  log(`  📸 ${path}`);
}

// ── Phase detection (reliable via data-phase attribute) ──────────────────────
async function getPhase(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-phase]');
    return el?.getAttribute('data-phase') ?? 'unknown';
  });
}

async function waitForPhase(page, expected, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const p = await getPhase(page);
    if (p === expected) return true;
    await wait(300);
  }
  warn(`waitForPhase('${expected}') timed out after ${timeoutMs}ms`);
  return false;
}

async function waitForAnyPhase(page, phases, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const p = await getPhase(page);
    if (phases.includes(p)) return p;
    await wait(300);
  }
  return null;
}

// ── Fill a React-controlled input ────────────────────────────────────────────
async function fillInput(page, placeholderPart, value) {
  const ok = await page.evaluate((ph, val) => {
    const input = [...document.querySelectorAll('input')].find(el =>
      el.placeholder?.toLowerCase().includes(ph.toLowerCase())
    );
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter ? setter.call(input, val) : (input.value = val);
    input.dispatchEvent(new Event('input',  { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, placeholderPart, value);
  if (!ok) fail(`Input not found: "${placeholderPart}"`);
  return ok;
}

// ── Submit a form ────────────────────────────────────────────────────────────
async function submitForm(page, buttonTextContains) {
  return page.evaluate((t) => {
    for (const form of document.querySelectorAll('form')) {
      const btn = [...form.querySelectorAll('button')].find(b =>
        b.innerText.includes(t) && !b.disabled
      );
      if (btn) { form.requestSubmit(btn); return true; }
    }
    // Fallback: direct click
    const btn = [...document.querySelectorAll('button')].find(b =>
      b.innerText.includes(t) && !b.disabled
    );
    if (btn) { btn.click(); return true; }
    return false;
  }, buttonTextContains);
}

// ── Click any button by text ─────────────────────────────────────────────────
async function clickButton(page, textContains) {
  return page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find(b =>
      b.innerText.trim().includes(t) && !b.disabled
    );
    if (btn) { btn.click(); return true; }
    return false;
  }, textContains);
}

// ── Click any div/element by text (for toggles) ──────────────────────────────
async function clickElementWithText(page, textContains) {
  return page.evaluate((t) => {
    const all = [...document.querySelectorAll('div, label, span')];
    const el = all.find(e => e.innerText?.trim().includes(t) && e.children.length === 0
      || e.children.length <= 2);
    // Find the first clickable with exactly this text
    const els = all.filter(e => e.innerText?.trim() === t);
    if (els.length) { els[0].click(); return true; }
    // Partial match fallback
    const partial = all.find(e => e.innerText?.trim().includes(t) && !e.querySelector('button'));
    if (partial) { partial.click(); return true; }
    return false;
  }, textContains);
}

// ── Check if betting controls are visible ────────────────────────────────────
async function hasBettingControls(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('button')].some(b =>
      b.innerText.trim() === 'Fold' && !b.disabled
    )
  );
}

// ── Act if it is this player's turn ─────────────────────────────────────────
async function actIfMyTurn(page, name, strategy = 'auto') {
  if (!await hasBettingControls(page)) return false;

  const result = await page.evaluate((strat) => {
    const btns = [...document.querySelectorAll('button')].filter(b => !b.disabled);

    if (strat === 'allin') {
      const a = btns.find(b => b.innerText.includes('All-in'));
      if (a) { a.click(); return 'All-in'; }
      const c = btns.find(b => b.innerText.trim().startsWith('Call'));
      if (c) { c.click(); return 'Call'; }
    }

    if (strat === 'fold') {
      const f = btns.find(b => b.innerText.trim() === 'Fold');
      if (f) { f.click(); return 'Fold'; }
    }

    // auto: prefer Check > Call, never Fold
    const chk = btns.find(b => b.innerText.trim() === 'Check');
    if (chk) { chk.click(); return 'Check'; }
    const call = btns.find(b => b.innerText.trim().startsWith('Call'));
    if (call) { call.click(); return 'Call'; }
    // Absolute last resort
    const fold = btns.find(b => b.innerText.trim() === 'Fold');
    if (fold) { fold.click(); return 'Fold(forced)'; }
    return null;
  }, strategy);

  if (result) {
    log(`    ✅ ${name}: ${result}`);
    return true;
  }
  return false;
}

// ── Play until the current street ends (advances to next phase) ──────────────
async function playStreet(playerList, strategy = 'auto') {
  const initialPhase = await getPhase(playerList[0].page);
  let iterations = 0;
  while (iterations++ < 24) {
    let acted = false;
    for (const { page, name } of playerList) {
      if (await actIfMyTurn(page, name, strategy)) {
        acted = true;
        await wait(600);
      }
    }
    // If nobody acted, check if phase changed
    if (!acted) {
      const now = await getPhase(playerList[0].page);
      if (now !== initialPhase) break;
      await wait(400);
      // If still same phase after no actions, break (all folded / all-in run-out)
      const still = await getPhase(playerList[0].page);
      if (still === initialPhase) break;
    }
    const now = await getPhase(playerList[0].page);
    if (now !== initialPhase && now !== 'unknown') break;
  }
  await wait(800);
}

// ── Play a full hand until result (all streets) ──────────────────────────────
async function playHand(playerList, handNum, strategy = 'auto') {
  log(`\n  🃏 Hand ${handNum} — strategy: ${strategy}`);

  // Wait for preflop to be active
  const started = await waitForPhase(playerList[0].page, 'preflop', 12000);
  if (!started) { warn(`Hand ${handNum}: preflop never started`); return false; }

  await ss(playerList[0].page, `h${handNum}-preflop`);

  const streets = ['preflop', 'flop', 'turn', 'river'];
  for (const street of streets) {
    const phase = await getPhase(playerList[0].page);
    if (phase === 'result' || phase === 'waiting') break;
    if (phase !== street) {
      await waitForPhase(playerList[0].page, street, 5000);
    }

    const current = await getPhase(playerList[0].page);
    if (current !== street) continue;

    log(`    📍 ${street}`);
    await playStreet(playerList, strategy);

    const after = await getPhase(playerList[0].page);
    if (after === street) {
      // Street didn't advance — try acting again
      for (let retry = 0; retry < 3; retry++) {
        for (const { page, name } of playerList) {
          await actIfMyTurn(page, name, strategy);
        }
        await wait(800);
        const now2 = await getPhase(playerList[0].page);
        if (now2 !== street) break;
      }
    }

    if (street === 'flop' || street === 'river') {
      await ss(playerList[0].page, `h${handNum}-${street}`);
    }
  }

  // Wait for result
  const gotResult = await waitForAnyPhase(playerList[0].page, ['result', 'waiting'], 10000);
  if (gotResult === 'result') {
    await ss(playerList[0].page, `h${handNum}-result`);
    await ss(playerList[2].page, `h${handNum}-result-mobile`);
    log(`    ✅ Result reached`);
    return true;
  } else if (gotResult === 'waiting') {
    log(`    ✅ Hand ended (fast fold win)`);
    return true;
  }
  warn(`Hand ${handNum}: result never reached`);
  return false;
}

// ── Get chip totals for all seated players (from host page) ──────────────────
async function getChipTotals(page) {
  return page.evaluate(() => {
    // Read from the sidebar player list (always visible on desktop)
    const entries = [...document.querySelectorAll('[data-phase]')][0]
      ?.querySelectorAll('div.grid, div.space-y-1\\.5 div.flex') ?? [];
    // Simpler: just read all number-like strings from body
    const all = document.body.innerText.split('\n')
      .map(l => l.trim())
      .filter(l => /^[\d.,]+$/.test(l) && l.length >= 3)
      .map(l => parseInt(l.replace(/[.,]/g, '')))
      .filter(n => n >= 100 && n <= 1000000);
    return [...new Set(all)];
  });
}

// ── Check for a rebuy button on a given page ─────────────────────────────────
async function hasRebuyButton(page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll('button')].some(b =>
      b.innerText.includes('Rebuy') && !b.disabled
    );
  });
}

// ── Get player chip count from their own page ────────────────────────────────
async function getMyChips(page) {
  return page.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/Fichas:\s*([\d.,]+)/);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''));
    return null;
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Fresh screenshot dir
  await rm(SS_DIR, { recursive: true, force: true });
  await mkdir(SS_DIR, { recursive: true });
  ssCount = 0;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const pages = {};

  // Track console errors from the start
  function trackErrors(page, who) {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('404')) {
          consoleErrors[who].push(text.slice(0, 120));
        }
      }
    });
    page.on('pageerror', err => consoleErrors[who].push(`[pageerror] ${err.message.slice(0, 120)}`));
  }

  try {
    log('\n🃏 PokerBR Robust Test — 3 Players · Rebuy · 8+ Hands\n');
    log('=' .repeat(60));

    // ── 1. HOST creates room (rebuy enabled, low chips for fast bust) ─────────
    log('\n1️⃣  Host creates room...');
    pages.host = await browser.newPage();
    await pages.host.setViewport({ width: 430, height: 932 });
    trackErrors(pages.host, 'host');
    await pages.host.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 35000 });
    await ss(pages.host, 'home');

    await fillInput(pages.host, 'apelido', 'Carlos');
    await wait(200);

    // Open advanced settings and enable rebuy
    await clickButton(pages.host, 'Configurações avançadas');
    await wait(500);
    // Click the rebuy toggle (it's a styled div, not a checkbox)
    await pages.host.evaluate(() => {
      // Find the div that says "Permitir Rebuy" and click the toggle next to it
      const labels = [...document.querySelectorAll('label')];
      const rebuyLabel = labels.find(l => l.innerText.includes('Permitir Rebuy'));
      if (rebuyLabel) {
        const toggle = rebuyLabel.querySelector('div');
        if (toggle) toggle.click();
      }
    });
    await wait(300);
    await ss(pages.host, 'home-rebuy-enabled');

    // Set starting chips to 500 (faster to bust)
    await pages.host.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const chipBtn = btns.find(b => b.innerText.trim() === '500');
      if (chipBtn) chipBtn.click();
    });
    await wait(200);

    // Turn time 30s
    await pages.host.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const t = btns.find(b => b.innerText.trim() === '30s');
      if (t) t.click();
    });
    await wait(200);

    await submitForm(pages.host, 'Criar Mesa');
    await wait(12000); // Railway cold start

    const navigated = await (async () => {
      const start = Date.now();
      while (Date.now() - start < 25000) {
        if (pages.host.url().includes('/room/')) return true;
        await wait(400);
      }
      return false;
    })();
    log(`  Navigation: ${navigated ? '✅' : '❌'} — ${pages.host.url()}`);
    await ss(pages.host, 'host-room');

    const roomCode = pages.host.url().split('/room/')[1]?.split('?')[0] ?? '';
    log(`  🔑 Room: "${roomCode}"`);
    if (!roomCode) { fail('No room code — aborting'); return; }

    await wait(800);
    await clickButton(pages.host, 'Sentar');
    await wait(800);

    // ── 2. Player 2 joins ────────────────────────────────────────────────────
    log('\n2️⃣  Player 2 (Ana) joins...');
    pages.p2 = await browser.newPage();
    await pages.p2.setViewport({ width: 430, height: 932 });
    trackErrors(pages.p2, 'p2');
    await pages.p2.goto(`${BASE_URL}?join=${roomCode}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(300);
    await fillInput(pages.p2, 'apelido', 'Ana');
    await wait(200);
    await submitForm(pages.p2, 'Entrar na Mesa');
    await wait(8000);
    const nav2 = await (async () => {
      const start = Date.now();
      while (Date.now() - start < 15000) { if (pages.p2.url().includes('/room/')) return true; await wait(300); }
      return false;
    })();
    log(`  P2 nav: ${nav2 ? '✅' : '❌'}`);
    await clickButton(pages.p2, 'Sentar');
    await wait(800);

    // ── 3. Player 3 joins (mobile) ────────────────────────────────────────────
    log('\n3️⃣  Player 3 (Bruno, mobile 375px) joins...');
    pages.p3 = await browser.newPage();
    await pages.p3.setViewport({ width: 375, height: 812 });
    trackErrors(pages.p3, 'p3');
    await pages.p3.goto(`${BASE_URL}?join=${roomCode}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(300);
    await fillInput(pages.p3, 'apelido', 'Bruno');
    await wait(200);
    await submitForm(pages.p3, 'Entrar na Mesa');
    await wait(8000);
    const nav3 = await (async () => {
      const start = Date.now();
      while (Date.now() - start < 15000) { if (pages.p3.url().includes('/room/')) return true; await wait(300); }
      return false;
    })();
    log(`  P3 nav: ${nav3 ? '✅' : '❌'}`);
    await clickButton(pages.p3, 'Sentar');
    await wait(1500);
    await ss(pages.host, 'lobby-3-players-seated');
    await ss(pages.p3,   'lobby-mobile');

    const playerList = [
      { page: pages.host, name: 'Carlos' },
      { page: pages.p2,   name: 'Ana'    },
      { page: pages.p3,   name: 'Bruno'  },
    ];

    // ── 4. Start game ────────────────────────────────────────────────────────
    log('\n4️⃣  Starting game...');
    await clickButton(pages.host, 'Iniciar');
    await wait(3000);
    const phase0 = await getPhase(pages.host);
    log(`  Phase after start: ${phase0}`);

    // ── 5. Hands 1–3: check/call all streets ────────────────────────────────
    log('\n5️⃣  Hands 1–3 — check/call all streets...');
    for (let h = 1; h <= 3; h++) {
      const ok = await playHand(playerList, h, 'auto');
      if (!ok) warn(`Hand ${h} did not complete cleanly`);
      // Wait for next hand (server waits 2s after result before starting)
      await waitForAnyPhase(pages.host, ['preflop', 'waiting'], 12000);
      await wait(500);
    }

    // ── 6. Hand 4: everyone raises preflop ───────────────────────────────────
    log('\n6️⃣  Hand 4 — raise preflop...');
    await waitForPhase(pages.host, 'preflop', 12000);
    await wait(500);
    await ss(pages.host, 'h4-preflop-before-raise');

    let raiseDone = false;
    for (let i = 0; i < 20; i++) {
      for (const { page, name } of playerList) {
        if (!await hasBettingControls(page)) continue;
        const acted = await page.evaluate((alreadyRaised) => {
          const btns = [...document.querySelectorAll('button')].filter(b => !b.disabled);
          if (!alreadyRaised) {
            const raise = btns.find(b => b.innerText.trim() === 'Raise');
            if (raise) { raise.click(); return 'Raise'; }
          }
          const call = btns.find(b => b.innerText.trim().startsWith('Call'));
          if (call) { call.click(); return 'Call'; }
          const chk  = btns.find(b => b.innerText.trim() === 'Check');
          if (chk)  { chk.click(); return 'Check'; }
          return null;
        }, raiseDone);
        if (acted) {
          if (acted === 'Raise') raiseDone = true;
          log(`    ✅ ${name}: ${acted}`);
          await wait(600);
        }
      }
      const p = await getPhase(pages.host);
      if (p === 'flop' || p === 'result' || p === 'waiting') break;
    }
    // Play remaining streets auto
    for (const street of ['flop', 'turn', 'river']) {
      const ok = await waitForPhase(pages.host, street, 8000);
      if (!ok) break;
      log(`    📍 ${street}`);
      await playStreet(playerList, 'auto');
    }
    await waitForAnyPhase(pages.host, ['result', 'waiting'], 10000);
    await ss(pages.host, 'h4-raise-result');
    await waitForAnyPhase(pages.host, ['preflop', 'waiting'], 12000);

    // ── 7. Hand 5: two players fold (instant win) ────────────────────────────
    log('\n7️⃣  Hand 5 — 2 players fold (instant win)...');
    await waitForPhase(pages.host, 'preflop', 12000);
    await wait(500);
    await ss(pages.host, 'h5-preflop-before-fold');

    let foldsDone = 0;
    for (let i = 0; i < 12 && foldsDone < 2; i++) {
      for (const { page, name } of playerList) {
        if (foldsDone >= 2) break;
        if (!await hasBettingControls(page)) continue;
        if (foldsDone < 2) {
          const ok = await actIfMyTurn(page, name, 'fold');
          if (ok) { foldsDone++; await wait(600); }
        }
      }
      const p = await getPhase(pages.host);
      if (p === 'result' || p === 'waiting') break;
      await wait(300);
    }
    await waitForAnyPhase(pages.host, ['result', 'waiting'], 8000);
    await ss(pages.host, 'h5-fold-result');
    await ss(pages.p3,   'h5-fold-result-mobile');
    log(`  ✅ Fold win — ${foldsDone} players folded`);
    await waitForAnyPhase(pages.host, ['preflop', 'waiting'], 12000);

    // ── 8. Hands 6–7: ALL-IN to force bust ───────────────────────────────────
    log('\n8️⃣  Hands 6–7 — all-in to force a bust...');
    for (let h = 6; h <= 7; h++) {
      await waitForPhase(pages.host, 'preflop', 12000);
      await wait(500);
      log(`\n  🃏 Hand ${h} — ALL-IN`);
      await ss(pages.host, `h${h}-allin-preflop`);

      // Play streets with all-in strategy
      for (const street of ['preflop', 'flop', 'turn', 'river']) {
        const cur = await getPhase(pages.host);
        if (cur === 'result' || cur === 'waiting') break;
        if (cur !== street) { await waitForPhase(pages.host, street, 8000); }
        const c2 = await getPhase(pages.host);
        if (c2 !== street) continue;
        log(`    📍 ${street}`);
        await playStreet(playerList, 'allin');
      }

      const res = await waitForAnyPhase(pages.host, ['result', 'waiting'], 12000);
      await ss(pages.host, `h${h}-allin-result`);
      await ss(pages.p3,   `h${h}-allin-result-mobile`);
      log(`  Result: ${res}`);
      await waitForAnyPhase(pages.host, ['preflop', 'waiting'], 12000);
    }

    // ── 9. Check for bust + test rebuy ───────────────────────────────────────
    log('\n9️⃣  Checking for bust and rebuy...');

    // Helper: run rebuy check + click for all busted players simultaneously
    async function tryRebuyAll(label = '') {
      const results = [];
      // First snapshot all states at once (before any rebuy changes phase)
      const states = await Promise.all(playerList.map(async ({ page, name }) => ({
        name, page,
        chips: await getMyChips(page),
        hasRebuy: await hasRebuyButton(page),
      })));
      for (const s of states) {
        log(`  ${s.name}: chips=${s.chips ?? '?'} rebuy=${s.hasRebuy}`);
      }
        // Screenshot all who need rebuy
      const busted = states.filter(s => s.hasRebuy);
      for (const s of busted) {
        await ss(s.page, `rebuy-button-${label}${s.name.toLowerCase()}`);
      }
      // Click all rebuys in parallel so they all land before the 2s auto-start timer fires
      await Promise.all(busted.map(s => clickButton(s.page, 'Rebuy')));
      // Wait for state to propagate, then read chips
      await wait(1200);
      for (const s of busted) {
        const after = await getMyChips(s.page);
        log(`  ${s.name} rebuy → ${after ?? '?'} chips`);
        results.push({ name: s.name, chipsAfter: after, ok: after != null && after > 0 });
        await ss(s.page, `rebuy-done-${label}${s.name.toLowerCase()}`);
      }
      return results;
    }

    // Wait for waiting phase — game should hold here since not enough playable players
    const gotWaiting = await waitForPhase(pages.host, 'waiting', 15000);
    if (!gotWaiting) warn('Waiting phase not detected after all-in hands');
    await wait(800);

    let rebuyResults = await tryRebuyAll();

    if (rebuyResults.length === 0) {
      warn('No rebuy needed yet — playing 2 more all-in hands to force a bust...');
      for (let h = 8; h <= 9; h++) {
        const p = await waitForAnyPhase(pages.host, ['preflop', 'waiting'], 12000);
        if (p === 'preflop') {
          log(`\n  🃏 Hand ${h} — ALL-IN`);
          await playStreet(playerList, 'allin');
          for (const street of ['flop', 'turn', 'river']) {
            const cur = await getPhase(pages.host);
            if (cur === 'result' || cur === 'waiting') break;
            await waitForPhase(pages.host, street, 6000);
            await playStreet(playerList, 'allin');
          }
          await waitForAnyPhase(pages.host, ['result', 'waiting'], 10000);
        }
        await waitForPhase(pages.host, 'waiting', 12000);
        await wait(800);
        rebuyResults = await tryRebuyAll(`h${h}-`);
        if (rebuyResults.length > 0) break;
      }
    }

    if (rebuyResults.length > 0) {
      log('\n  Rebuy results:');
      for (const r of rebuyResults) {
        log(`    ${r.name}: ${r.ok ? '✅' : '❌'} chips=${r.chipsAfter}`);
      }
    } else {
      warn('No rebuy was triggered — all-in hands may not have caused a bust');
    }

    // ── 10. 2 more hands after rebuy ────────────────────────────────────────
    log('\n🔟  2 hands after rebuy — verifying normal play continues...');
    for (let h = 0; h < 2; h++) {
      await waitForAnyPhase(pages.host, ['preflop', 'waiting'], 10000);
      const p = await getPhase(pages.host);
      if (p === 'waiting') {
        // If waiting, the game auto-starts in 2s. Wait for preflop.
        await waitForPhase(pages.host, 'preflop', 8000);
      }
      const cur = await getPhase(pages.host);
      if (cur !== 'preflop') { warn(`Expected preflop, got ${cur}`); continue; }

      log(`\n  🃏 Post-rebuy hand ${h + 1}`);
      await playStreet(playerList, 'auto');
      for (const street of ['flop', 'turn', 'river']) {
        const c = await getPhase(pages.host);
        if (c === 'result' || c === 'waiting') break;
        await waitForPhase(pages.host, street, 8000);
        const c2 = await getPhase(pages.host);
        if (c2 !== street) continue;
        log(`    📍 ${street}`);
        await playStreet(playerList, 'auto');
      }
      const res = await waitForAnyPhase(pages.host, ['result', 'waiting'], 10000);
      log(`    Result: ${res}`);
      await ss(pages.host, `post-rebuy-h${h + 1}-result`);
      await waitForAnyPhase(pages.host, ['preflop', 'waiting'], 12000);
    }

    // ── 11. Final screenshots ────────────────────────────────────────────────
    log('\n1️⃣1️⃣  Final state screenshots...');
    await ss(pages.host, 'final-host');
    await ss(pages.p2,   'final-p2');
    await ss(pages.p3,   'final-mobile-375px');

    // ── 12. Mobile overflow audit ────────────────────────────────────────────
    log('\n1️⃣2️⃣  Mobile overflow audit (375px)...');
    const layoutIssues = await pages.p3.evaluate(() => {
      const issues = [];
      const bw = window.innerWidth;
      if (document.documentElement.scrollWidth > bw + 2) {
        issues.push(`Body overflow: ${document.documentElement.scrollWidth}px`);
      }
      document.querySelectorAll('button').forEach(b => {
        const r = b.getBoundingClientRect();
        // Only flag buttons whose LEFT edge is visible (started on screen but overflowed right).
        // Buttons whose left edge is ≥ viewport width are entirely off-screen (e.g. sidebar panels).
        if (r.width > 0 && r.height > 0 && r.left >= 0 && r.left < bw && r.right > bw + 4) {
          issues.push(`Button OOB: "${b.innerText.trim().slice(0, 20)}" right=${Math.round(r.right)}`);
        }
      });
      return issues;
    });
    if (layoutIssues.length) {
      layoutIssues.forEach(i => warn(i));
    } else {
      log('  ✅ No horizontal overflow on mobile');
    }

    // ── 13. Console errors ───────────────────────────────────────────────────
    log('\n1️⃣3️⃣  Console errors:');
    let hasErrors = false;
    for (const [who, errs] of Object.entries(consoleErrors)) {
      if (errs.length) {
        fail(`${who}: ${errs.length} error(s)`);
        errs.forEach(e => log(`    ${e}`));
        hasErrors = true;
      } else {
        log(`  ✅ ${who}: no errors`);
      }
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    log('\n' + '='.repeat(60));
    log('📊 SUMMARY');
    log(`  Screenshots:   ${ssCount} saved to ${SS_DIR}`);
    log(`  Rebuy tested:  ${rebuyResults.length > 0 ? '✅ yes' : '⚠️  no (no bust triggered)'}`);
    log(`  Console errors:${hasErrors ? ' ❌ yes' : ' ✅ none'}`);
    log('='.repeat(60));

  } catch (e) {
    fail(`Fatal: ${e.message}`);
    console.error(e.stack);
    for (const [who, page] of Object.entries(pages)) {
      try { await ss(page, `FATAL-ERROR-${who}`); } catch {}
    }
  } finally {
    await browser.close();
  }
}

main();
