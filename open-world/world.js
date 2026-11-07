/* =========================================================
   Gaurav Chaudhari · open-world edition
   intro · skyline · city map · HUD · pause menu · skill wheel
   · missions · stats · phone
   The six demos themselves run from ../script.js and report
   back through the "demo:done" event.
   ========================================================= */
(() => {
    'use strict';
    window.__owBooted = true;

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const isTyping = (e) => !!(e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]'));
    const store = {
        get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
    };

    /* ---------- world data ---------- */
    const DISTRICTS = {
        hq: { name: 'Downtown HQ', x: 500, y: 300, c: '#ff8a3d' },
        'retrieval-harbour': { name: 'Retrieval Harbour', x: 160, y: 180, c: '#b18cff' },
        'vision-heights': { name: 'Vision Heights', x: 410, y: 110, c: '#ffcf4d' },
        roadworks: { name: 'Roadworks', x: 680, y: 110, c: '#ff8a3d' },
        'the-lab': { name: 'The Lab', x: 870, y: 200, c: '#ffcf4d' },
        'training-grounds': { name: 'Training Grounds', x: 270, y: 330, c: '#ff8a3d' },
        'career-avenue': { name: 'Career Avenue', x: 735, y: 335, c: '#ff2e88' },
        'sql-docks': { name: 'SQL Docks', x: 170, y: 470, c: '#2de2e6' },
        'old-town': { name: 'Old Town', x: 410, y: 515, c: '#b18cff' },
        'agent-alley': { name: 'Agent Alley', x: 640, y: 500, c: '#3ddc84' },
        'edge-quarter': { name: 'Edge Quarter', x: 860, y: 450, c: '#2de2e6' },
        'signal-point': { name: 'Signal Point', x: 900, y: 570, c: '#ff2e88' },
    };

    const MARKERS = [
        { id: 'hq', type: 'hq', kind: 'Title screen', title: 'Downtown HQ', d: 'hq', glyph: 'H' },
        { id: 'm1', type: 'mission', kind: 'Mission 01', title: 'Natural-Language to SQL', d: 'sql-docks', glyph: '1' },
        { id: 'm2', type: 'mission', kind: 'Mission 02', title: 'DMS: AI Document Search', d: 'retrieval-harbour', glyph: '2' },
        { id: 'm3', type: 'mission', kind: 'Mission 03', title: 'Project Iris', d: 'vision-heights', glyph: '3' },
        { id: 'm4', type: 'mission', kind: 'Mission 04', title: 'MIDC Pothole Detection', d: 'roadworks', glyph: '4' },
        { id: 'm5', type: 'mission', kind: 'Mission 05', title: 'Intent Detection Engine', d: 'agent-alley', glyph: '5' },
        { id: 'm6', type: 'mission', kind: 'Mission 06', title: 'AI FinTech Auto-Reconciler', d: 'edge-quarter', glyph: '6' },
        { id: 'q1', type: 'quest', kind: 'Side quest', title: 'Pustakosh', d: 'the-lab', glyph: '?', dx: -46, dy: -26 },
        { id: 'q2', type: 'quest', kind: 'Side quest', title: 'Multi-Agent PMC Officer Assistant', d: 'the-lab', glyph: '?', dx: 0, dy: -26 },
        { id: 'q3', type: 'quest', kind: 'Side quest', title: 'Edge–Cloud Agentic Triage', d: 'the-lab', glyph: '?', dx: 46, dy: -26 },
        { id: 'q4', type: 'quest', kind: 'Side quest', title: 'Credit-Card Fraud Detection', d: 'the-lab', glyph: '?', dx: -46, dy: 4 },
        { id: 'q5', type: 'quest', kind: 'Side quest', title: 'Demystifying Git & GitHub', d: 'the-lab', glyph: '?', dx: 0, dy: 4 },
        { id: 'q6', type: 'quest', kind: 'Side quest', title: 'Baby Name Battle', d: 'the-lab', glyph: '?', dx: 46, dy: 4 },
        { id: 'f1', type: 'flash', kind: 'Flashback', title: 'Vehicle Booking System', d: 'old-town', glyph: '↺', dx: -40 },
        { id: 'f2', type: 'flash', kind: 'Flashback', title: 'GPA Achalpur App', d: 'old-town', glyph: '↺', dy: -14 },
        { id: 'f3', type: 'flash', kind: 'Flashback', title: 'Your Notes', d: 'old-town', glyph: '↺', dx: 40 },
        { id: 'stats', type: 'info', kind: 'Training Grounds', title: 'Player stats', d: 'training-grounds', glyph: '▲' },
        { id: 'story', type: 'info', kind: 'Career Avenue', title: 'Story so far', d: 'career-avenue', glyph: '★' },
        { id: 'contact', type: 'info', kind: 'Signal Point', title: 'Phone · contact', d: 'signal-point', glyph: '☎' },
    ];

    const SKILLS = [
        { id: 'llm', label: 'LLMs & agents' },
        { id: 'rag', label: 'RAG & search' },
        { id: 'vision', label: 'Computer vision' },
        { id: 'sql', label: 'SQL & data' },
        { id: 'edge', label: 'Edge & mobile' },
        { id: 'ml', label: 'ML & MLOps' },
    ];

    const TIPS = [
        'The NL→SQL assistant answers in English, Marathi and Hinglish, and in Marathi typed in Latin script.',
        'Project Iris switches office lights and HVAC zone by zone from CCTV person detection.',
        'The document search falls back to HyDE when plain retrieval comes back weak.',
        'Press Esc at any time to open the menu and the city map.',
        'Press Q for the skill wheel: it highlights every project that uses a skill.',
        'Every mission is playable. Press Start mission and watch the system work.',
    ];

    /* ---------- skyline (generated, deterministic) ---------- */
    function buildSkyline(svg, { seed, fill, windows, minH, maxH }) {
        let s = seed;
        const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        const W = 1600;
        const H = 400;
        const COLORS = ['#ffcf4d', '#ff8a3d', '#2de2e6', '#ff2e88'];
        let x = -10;
        let out = '';
        while (x < W) {
            const w = 38 + rnd() * 72;
            const edge = Math.abs(x + w / 2 - W * 0.62) / (W / 2);
            const h = minH + rnd() * (maxH - minH) * (0.55 + edge * 0.6);
            out += `<rect x="${x.toFixed(0)}" y="${(H - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${fill}"/>`;
            if (windows) {
                for (let wy = H - h + 12; wy < H - 8; wy += 14) {
                    for (let wx = x + 7; wx < x + w - 8; wx += 11) {
                        if (rnd() > 0.74) {
                            out += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="5" height="7" fill="${COLORS[(rnd() * 4) | 0]}" opacity="${(0.3 + rnd() * 0.55).toFixed(2)}"/>`;
                        }
                    }
                }
                if (rnd() > 0.72) {
                    const ax = x + w / 2;
                    out += `<rect x="${(ax - 1).toFixed(0)}" y="${(H - h - 26).toFixed(0)}" width="2" height="26" fill="${fill}"/>` +
                        `<circle class="blink" cx="${ax.toFixed(0)}" cy="${(H - h - 27).toFixed(0)}" r="2.6" fill="#ff2e88"/>`;
                }
            }
            x += w + 2 + rnd() * 6;
        }
        svg.innerHTML = out;
    }

    /* ---------- city map (drawn three times: page, pause menu, minimap) ---------- */
    const LAND = 'M60 90 Q 200 36 380 58 T 700 48 Q 880 38 950 120 Q 988 262 960 380 Q 978 520 902 588 Q 700 612 500 596 Q 300 612 118 590 Q 36 520 48 380 Q 24 230 60 90 Z';
    const ROADS = '<ellipse cx="500" cy="320" rx="360" ry="235"/><path d="M30 395 L970 395 M545 30 L545 600 M300 40 L300 600 M60 590 C300 430 640 420 960 120"/>';
    const RIVER = 'M-10 300 C 120 250 230 360 360 300 S 600 200 720 270 S 880 380 1010 330';

    function markerMarkup(m, interactive) {
        const d = DISTRICTS[m.d];
        const x = d.x + (m.dx || 0);
        const y = d.y - 12 + (m.dy || 0);
        const shape = m.type === 'mission'
            ? '<g class="mk-shape"><rect x="-12" y="-12" width="24" height="24" rx="3" transform="rotate(45)"/></g>'
            : '<g class="mk-shape"><circle r="13"/></g>';
        const pulse = m.type === 'mission' ? '<circle class="mk-pulse" r="16"/>' : '';
        const a11y = interactive ? ` tabindex="0" role="button" aria-label="${esc(m.kind)}: ${esc(m.title)}"` : '';
        return `<g class="mk mk-${m.type}" data-mk="${m.id}" transform="translate(${x} ${y})"${a11y}>${pulse}${shape}<text y="5">${m.glyph}</text></g>`;
    }

    function cityMarkup(kind) {
        const interactive = kind !== 'mini';
        const zones = Object.entries(DISTRICTS).map(([id, d]) =>
            `<g class="zone" data-zone="${id}"><ellipse cx="${d.x}" cy="${d.y}" rx="84" ry="50" fill="${d.c}" stroke="${d.c}"/>` +
            `<text x="${d.x}" y="${d.y + 34}" fill="${d.c}">${esc(d.name)}</text></g>`).join('');
        const label = interactive ? 'role="group" aria-label="City map. Each pin fast-travels to a part of this page."' : 'aria-hidden="true"';
        return `<svg class="city-svg city-${kind}" viewBox="0 0 1000 620" ${label}>` +
            `<rect class="sea" width="1000" height="620"/><path class="land" d="${LAND}"/>` +
            `<g class="roads">${ROADS}</g><g class="roads-dash">${ROADS}</g>` +
            `<path class="river" d="${RIVER}"/><path class="river-hi" d="${RIVER}"/>` +
            `<text class="river-label" x="560" y="236" transform="rotate(-8 560 236)">Mula-Mutha</text>` +
            zones + MARKERS.map((m) => markerMarkup(m, interactive)).join('') + '</svg>';
    }

    function mountMap(container, kind, onPick) {
        container.innerHTML = cityMarkup(kind);
        if (kind === 'mini') return;
        const svg = container.querySelector('svg');
        const tip = document.createElement('div');
        tip.className = 'map-tip';
        tip.hidden = true;
        container.appendChild(tip);

        const show = (g) => {
            const m = MARKERS.find((x) => x.id === g.dataset.mk);
            const r = g.getBoundingClientRect();
            const cr = container.getBoundingClientRect();
            tip.innerHTML = `<b>${esc(m.kind)}</b>${esc(m.title)}`;
            tip.style.left = (r.left + r.width / 2 - cr.left) + 'px';
            tip.style.top = (r.top - cr.top) + 'px';
            tip.hidden = false;
        };
        const pick = (g) => { tip.hidden = true; onPick(g.dataset.mk); };
        svg.addEventListener('pointerover', (e) => { const g = e.target.closest('.mk'); if (g) show(g); });
        svg.addEventListener('pointerout', (e) => {
            const from = e.target.closest('.mk');
            const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.mk') : null;
            if (from && from !== to) tip.hidden = true;
        });
        svg.addEventListener('focusin', (e) => { const g = e.target.closest('.mk'); if (g) show(g); });
        svg.addEventListener('focusout', () => { tip.hidden = true; });
        svg.addEventListener('click', (e) => { const g = e.target.closest('.mk'); if (g) pick(g); });
        svg.addEventListener('keydown', (e) => {
            const g = e.target.closest('.mk');
            if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(g); }
        });
    }

    function markZones(d) {
        $$('.city-svg .zone').forEach((z) => z.classList.toggle('is-here', z.dataset.zone === d));
    }

    /* ---------- toasts, banner, XP, hire level ---------- */
    function toast(title, text, tone) {
        const t = document.createElement('div');
        t.className = 'ow-toast' + (tone ? ' is-' + tone : '');
        t.innerHTML = '<b></b><span></span>';
        t.querySelector('b').textContent = title;
        t.querySelector('span').textContent = text;
        $('#toasts').appendChild(t);
        setTimeout(() => {
            t.classList.add('out');
            setTimeout(() => t.remove(), 320);
        }, 3600);
    }

    let bannerTimer = 0;
    function banner(kicker, sub, xpText) {
        const b = $('#banner');
        $('#b-kicker').textContent = kicker;
        $('#b-sub').textContent = sub;
        $('#b-xp').textContent = xpText;
        b.hidden = false;
        b.classList.remove('show');
        void b.offsetWidth;
        b.classList.add('show');
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => { b.hidden = true; b.classList.remove('show'); }, 3200);
    }

    let xp = 0;
    let xpShown = 0;
    let xpRaf = 0;
    function addXP(n) {
        xp += n;
        const el = $('#xp');
        const from = xpShown;
        const t0 = performance.now();
        cancelAnimationFrame(xpRaf);
        const step = (t) => {
            const k = Math.min(1, (t - t0) / 700);
            xpShown = Math.round(from + (xp - from) * (1 - Math.pow(1 - k, 3)));
            el.textContent = String(xpShown).padStart(5, '0');
            if (k < 1) xpRaf = requestAnimationFrame(step);
        };
        xpRaf = requestAnimationFrame(step);
        const pop = $('#xp-pop');
        pop.textContent = '+' + n;
        pop.classList.remove('go');
        void pop.offsetWidth;
        pop.classList.add('go');
    }

    const visited = new Set();
    let stars = 0;
    function updateStars() {
        const n = (['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].some((id) => visited.has(id)) ? 1 : 0) +
            ['side-quests', 'stats', 'story', 'contact'].filter((id) => visited.has(id)).length;
        if (n <= stars) return;
        stars = n;
        const box = $('#hud-stars');
        $$('i', box).forEach((s, i) => s.classList.toggle('on', i < n));
        box.setAttribute('aria-label', `Hire level ${n} of 5`);
        box.classList.remove('flash');
        void box.offsetWidth;
        box.classList.add('flash');
        if (n === 5) toast('Hire level maxed', 'Five stars. The phone is right here: send that message.', 'pink');
    }

    /* ---------- where am I: minimap, area name, exploration XP ---------- */
    const MINI_SCALE = 0.42;
    const MINI_HALF = 75;
    let currentD = null;
    let areaTimer = 0;

    function panMini(d) {
        const D = DISTRICTS[d];
        const mini = $('#mini-map');
        if (!D || !mini) return;
        mini.style.transform = `translate(${MINI_HALF - D.x * MINI_SCALE}px, ${MINI_HALF - D.y * MINI_SCALE}px) scale(${MINI_SCALE})`;
        $('#mini-label').textContent = D.name;
    }

    function areaToast(d) {
        if (root.classList.contains('intro-on')) return;
        const D = DISTRICTS[d];
        const box = $('#ow-area');
        clearTimeout(areaTimer);
        box.classList.remove('show');
        areaTimer = setTimeout(() => {
            box.querySelector('.area-name').textContent = D.name;
            box.style.setProperty('--c', D.c);
            box.classList.add('show');
            areaTimer = setTimeout(() => box.classList.remove('show'), 2400);
        }, 280);
    }

    function enterZone(el) {
        const d = el.dataset.district;
        if (d !== currentD) {
            currentD = d;
            panMini(d);
            markZones(d);
            areaToast(d);
        }
        if (!visited.has(el.id)) {
            visited.add(el.id);
            if (el.id !== 'hq' && el.id !== 'map') addXP(50);
        }
        updateStars();
    }

    /* ---------- fast travel ---------- */
    function nameFor(id) {
        if (id === 'missions') return 'Story missions';
        const el = document.getElementById(id);
        const holder = el && (el.dataset.district ? el : el.closest('[data-district]'));
        return holder ? DISTRICTS[holder.dataset.district].name : '';
    }

    function fastTravel(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const arrive = () => {
            if (id === 'hq') window.scrollTo({ top: 0, behavior: 'instant' });
            else el.scrollIntoView({ behavior: 'instant', block: 'start' });
            if (/^(m|q|f)\d$/.test(id)) {
                el.classList.remove('is-target');
                void el.offsetWidth;
                el.classList.add('is-target');
            }
        };
        if (reduce) { arrive(); return; }
        const t = $('#travel');
        t.querySelector('b').textContent = nameFor(id);
        t.classList.add('on');
        setTimeout(() => {
            arrive();
            setTimeout(() => t.classList.remove('on'), 300);
        }, 420);
    }

    /* ---------- pause menu ---------- */
    const pause = $('#pause');
    const wheel = $('#wheel');
    let lastFocus = null;

    function trapFocus(el) {
        el.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const f = $$('a[href], button:not([disabled]), [tabindex="0"]', el)
                .filter((x) => x instanceof SVGElement || x.offsetParent !== null);
            if (!f.length) return;
            const first = f[0];
            const last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
    }

    function updateMissionCount() {
        const done = $$('.mission.is-complete').length;
        $$('[data-mission-count]').forEach((el) => { el.textContent = `${done}/6`; });
        return done;
    }

    function openPause() {
        if (!pause.hidden || root.classList.contains('intro-on')) return;
        closeWheel();
        lastFocus = document.activeElement;
        updateMissionCount();
        pause.hidden = false;
        root.classList.add('is-paused');
        $('#pause-resume').focus();
    }

    function closePause() {
        if (pause.hidden) return;
        pause.hidden = true;
        root.classList.remove('is-paused');
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    /* ---------- skill wheel ---------- */
    const skillItems = $$('[data-skills]');
    const hasSkill = (el, id) => el.dataset.skills.split(' ').includes(id);
    const countFor = (id) => skillItems.filter((el) => hasSkill(el, id)).length;

    function buildWheel() {
        const cx = 200;
        const cy = 200;
        const r1 = 72;
        const r2 = 188;
        const n = SKILLS.length;
        const gap = 1.4;
        const pt = (r, a) => {
            const rad = (a * Math.PI) / 180;
            return [(cx + r * Math.cos(rad)).toFixed(1), (cy + r * Math.sin(rad)).toFixed(1)];
        };
        const segs = SKILLS.map((s, i) => {
            const a0 = -90 - 180 / n + (i * 360) / n + gap;
            const a1 = a0 + 360 / n - 2 * gap;
            const [lx, ly] = pt((r1 + r2) / 2, (a0 + a1) / 2);
            const c = countFor(s.id);
            return `<g class="wheel-seg" data-skill="${s.id}" tabindex="0" role="button" aria-label="${esc(s.label)}: ${c} projects">` +
                `<path d="M ${pt(r2, a0).join(' ')} A ${r2} ${r2} 0 0 1 ${pt(r2, a1).join(' ')} L ${pt(r1, a1).join(' ')} A ${r1} ${r1} 0 0 0 ${pt(r1, a0).join(' ')} Z"/>` +
                `<text x="${lx}" y="${(+ly - 2).toFixed(1)}">${esc(s.label)}</text>` +
                `<text class="cnt" x="${lx}" y="${(+ly + 16).toFixed(1)}">${c} projects</text></g>`;
        }).join('');
        $('#wheel-svg').innerHTML = segs +
            `<g class="wheel-center" tabindex="0" role="button" aria-label="Show all projects">` +
            `<circle cx="${cx}" cy="${cy}" r="64"/><text class="wc-title" x="${cx}" y="${cy - 6}">Loadout</text>` +
            `<text class="wc-sub" id="wc-sub" x="${cx}" y="${cy + 18}">All skills</text></g>`;
    }

    function openWheel() {
        if (!wheel.hidden || !pause.hidden || root.classList.contains('intro-on')) return;
        lastFocus = document.activeElement;
        wheel.hidden = false;
        (wheel.querySelector('.wheel-seg.is-sel') || wheel.querySelector('.wheel-seg')).focus();
    }

    function closeWheel() {
        if (wheel.hidden) return;
        wheel.hidden = true;
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    function selectSkill(id) {
        skillItems.forEach((el) => el.classList.toggle('is-dim', !!id && !hasSkill(el, id)));
        $$('.wheel-seg', wheel).forEach((g) => g.classList.toggle('is-sel', g.dataset.skill === id));
        const chip = $('#hud-filter');
        if (!id) {
            chip.hidden = true;
            $('#wc-sub').textContent = 'All skills';
            return;
        }
        const s = SKILLS.find((x) => x.id === id);
        chip.hidden = false;
        chip.querySelector('b').textContent = s.label;
        $('#wc-sub').textContent = s.label;
        toast('Loadout equipped', `${s.label}: ${countFor(id)} missions, side quests and flashbacks use it.`);
    }

    /* ---------- player stats (counted from the page, not invented) ---------- */
    function renderStats() {
        const box = $('#skill-bars');
        if (!box) return;
        const rows = SKILLS.map((s) => ({ ...s, n: countFor(s.id) })).sort((a, b) => b.n - a.n);
        const max = Math.max(...rows.map((r) => r.n), 1);
        box.innerHTML = rows.map((r) => {
            const on = Math.round((r.n / max) * 10);
            return `<div class="bar-row"><span class="bar-name">${esc(r.label)}</span>` +
                `<span class="segs" aria-hidden="true">${'<i class="on"></i>'.repeat(on)}${'<i></i>'.repeat(10 - on)}</span>` +
                `<span class="bar-val">${r.n}</span>` +
                `<span class="bar-sub">Used in ${r.n} of ${skillItems.length} missions, side quests and flashbacks</span></div>`;
        }).join('');
    }

    /* ---------- missions: start buttons and completion ---------- */
    const MISSION_BY_DEMO = { sql: 'm1', rag: 'm2', iris: 'm3', pothole: 'm4', intent: 'm5', recon: 'm6' };
    const STARTERS = {
        m1: () => { const b = $('[data-sql]'); if (b) b.click(); },
        m2: () => { const b = $('[data-rag]'); if (b) b.click(); },
        m3: () => { const b = $('#iris-toggle'); if (b && /start/i.test(b.textContent)) b.click(); },
        m4: () => { const b = $('#ph-real'); if (b) b.click(); },
        m5: () => { const b = $('[data-intent*="crore"]'); if (b) b.click(); },
        m6: () => { const b = $('#recon-run'); if (b) b.click(); },
    };

    function initMissions() {
        $$('.start-mission').forEach((btn) => btn.addEventListener('click', () => {
            const art = btn.closest('.mission');
            if (!art.classList.contains('is-complete')) art.querySelector('.m-status').textContent = 'In progress';
            const play = art.querySelector('.m-play');
            const r = play.getBoundingClientRect();
            if (r.top < 0 || r.top > innerHeight * 0.55) play.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
            if (STARTERS[art.id]) STARTERS[art.id]();
        }));

        document.addEventListener('demo:done', (e) => {
            const id = MISSION_BY_DEMO[e.detail.id];
            const art = id && document.getElementById(id);
            if (!art) return;
            const title = art.querySelector('h3').textContent;
            const num = art.dataset.num;
            if (art.classList.contains('is-complete')) {
                toast(`Mission ${num} replayed`, `${title} · ${e.detail.stat}`);
                return;
            }
            art.classList.add('is-complete');
            art.querySelector('.m-status').textContent = 'Complete';
            $$(`.mk[data-mk="${id}"]`).forEach((g) => g.classList.add('done'));
            addXP(250);
            banner(`Mission ${num}`, `${title} · ${e.detail.stat}`, '+250 XP');
            if (updateMissionCount() === 6) setTimeout(() => toast('Story complete', 'All six missions done. 100%.', 'pink'), 3300);
        });
    }

    /* ---------- phone ---------- */
    function initPhone() {
        const phone = $('#phone');
        if (!phone) return;
        const clock = $('#phone-clock');
        const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
        tick();
        setInterval(tick, 30000);
        const apps = $$('.phone-app', phone);
        $$('[data-app]', phone).forEach((b) => b.addEventListener('click', () => {
            if (b.dataset.app === 'map') { fastTravel('map'); return; }
            apps.forEach((a) => a.classList.toggle('open', a.dataset.screen === b.dataset.app));
            const back = $(`.phone-app[data-screen="${b.dataset.app}"] .app-back`, phone);
            if (back) back.focus({ preventScroll: true });
        }));
        $$('.app-back', phone).forEach((b) => b.addEventListener('click', () => apps.forEach((a) => a.classList.remove('open'))));
    }

    /* ---------- intro: trailer cards → title → loading ---------- */
    const intro = $('#intro');
    let introGen = 0;
    let phase = 'idle';
    let rush = false;
    let nudge = null;
    const pauseFor = (ms) => new Promise((res) => {
        const t = setTimeout(() => { nudge = null; res(); }, ms);
        nudge = () => { clearTimeout(t); nudge = null; res(); };
    });

    function pressStart() {
        if (phase === 'cards') { rush = true; if (nudge) nudge(); }
        else if (phase === 'title') { if (nudge) nudge(); }
        else if (phase === 'loading') finishIntro();
    }

    async function runIntro() {
        const gen = ++introGen;
        const alive = () => gen === introGen;
        rush = false;
        root.classList.add('intro-on');
        root.classList.remove('no-intro');
        intro.hidden = false;
        intro.classList.remove('is-out');
        const cards = $$('.intro-card', intro);
        const title = $('#intro-title');
        const loading = $('#intro-loading');
        cards.forEach((c) => c.classList.remove('show'));
        title.classList.remove('show');
        loading.hidden = true;

        phase = 'cards';
        await pauseFor(450);
        for (const c of cards) {
            if (!alive() || rush) break;
            c.classList.add('show');
            await pauseFor(1300);
            c.classList.remove('show');
        }
        if (!alive()) return;

        phase = 'title';
        title.classList.add('show');
        $('#press-start').focus({ preventScroll: true });
        await pauseFor(4200);
        if (!alive()) return;
        title.classList.remove('show');

        phase = 'loading';
        loading.hidden = false;
        const bar = $('#load-bar');
        const tip = $('#load-tip');
        let i = Math.floor(Math.random() * TIPS.length);
        tip.textContent = TIPS[i];
        const DUR = 2800;
        const t0 = performance.now();
        const tipTimer = setInterval(() => { i = (i + 1) % TIPS.length; tip.textContent = TIPS[i]; }, 1400);
        await new Promise((res) => {
            const step = (t) => {
                if (!alive()) { res(); return; }
                const k = Math.min(1, (t - t0) / DUR);
                bar.style.width = (k * 100).toFixed(1) + '%';
                if (k < 1) requestAnimationFrame(step); else res();
            };
            requestAnimationFrame(step);
        });
        clearInterval(tipTimer);
        if (alive()) finishIntro();
    }

    function finishIntro() {
        if (phase === 'done') return;
        introGen++;
        phase = 'done';
        store.set('ow-intro', '1');
        intro.classList.add('is-out');
        root.classList.remove('intro-on');
        root.classList.add('no-intro', 'hero-in');
        setTimeout(() => { if (phase === 'done') intro.hidden = true; }, 650);
        setTimeout(() => areaToast(currentD || 'hq'), 700);
    }

    function replayIntro() {
        if (reduce) return;
        root.classList.remove('hero-in');
        window.scrollTo({ top: 0, behavior: 'instant' });
        phase = 'idle';
        runIntro();
    }

    /* ---------- wiring ---------- */
    function init() {
        buildSkyline($('#skyline-far'), { seed: 11, fill: '#2b1349', windows: false, minH: 90, maxH: 300 });
        buildSkyline($('#skyline-near'), { seed: 7, fill: '#140a24', windows: true, minH: 50, maxH: 230 });

        mountMap($('#city-map'), 'page', (id) => fastTravel(id));
        mountMap($('#pause-map'), 'pause', (id) => { closePause(); fastTravel(id); });
        mountMap($('#mini-map'), 'mini');
        panMini('hq');
        markZones('hq');

        buildWheel();
        renderStats();
        initMissions();
        initPhone();
        trapFocus(pause);
        trapFocus(wheel);

        // where the visitor is: a thin band across the middle of the screen
        const zoneIO = new IntersectionObserver((entries) => {
            entries.forEach((en) => { if (en.isIntersecting) enterZone(en.target); });
        }, { rootMargin: '-42% 0px -52% 0px' });
        $$('[data-district]').forEach((el) => zoneIO.observe(el));

        // achievements pop once, the first time the stats come into view
        const statsIO = new IntersectionObserver(([en]) => {
            if (!en.isIntersecting) return;
            statsIO.disconnect();
            setTimeout(() => { toast('Achievements unlocked', '6 certifications, including Introduction to LLMs from IIT Madras.', 'sun'); addXP(100); }, 500);
        }, { threshold: 0.3 });
        statsIO.observe($('#stats'));

        // HUD + menus
        $('#btn-menu').addEventListener('click', openPause);
        $('#btn-wheel').addEventListener('click', openWheel);
        $('#hud-filter').addEventListener('click', () => selectSkill(null));
        $('#pause-resume').addEventListener('click', closePause);
        $('#pause-intro').addEventListener('click', () => { closePause(); replayIntro(); });
        $$('[data-go]', pause).forEach((b) => b.addEventListener('click', () => { closePause(); fastTravel(b.dataset.go); }));
        pause.addEventListener('click', (e) => { if (e.target === pause) closePause(); });

        wheel.addEventListener('click', (e) => {
            const seg = e.target.closest('.wheel-seg');
            if (seg) { selectSkill(seg.dataset.skill); closeWheel(); return; }
            if (e.target.closest('.wheel-center')) { selectSkill(null); closeWheel(); return; }
            if (!e.target.closest('svg')) closeWheel();
        });
        wheel.addEventListener('keydown', (e) => {
            const segs = $$('.wheel-seg', wheel);
            const i = segs.indexOf(document.activeElement);
            if ((e.key === 'Enter' || e.key === ' ') && document.activeElement.closest('#wheel-svg')) {
                e.preventDefault();
                document.activeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            } else if (i >= 0 && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
                e.preventDefault(); segs[(i + 1) % segs.length].focus();
            } else if (i >= 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
                e.preventDefault(); segs[(i - 1 + segs.length) % segs.length].focus();
            }
        });
        wheel.addEventListener('focusin', (e) => {
            const seg = e.target.closest('.wheel-seg');
            if (seg) $('#wc-sub').textContent = SKILLS.find((s) => s.id === seg.dataset.skill).label;
        });
        wheel.addEventListener('pointerover', (e) => {
            const seg = e.target.closest('.wheel-seg');
            if (seg) $('#wc-sub').textContent = SKILLS.find((s) => s.id === seg.dataset.skill).label;
        });

        // in-page links fast-travel instead of jumping
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a || a.classList.contains('skip-link')) return;
            const id = a.getAttribute('href').slice(1);
            if (!id || !document.getElementById(id)) return;
            e.preventDefault();
            closePause();
            fastTravel(id);
        });

        // keyboard
        document.addEventListener('keydown', (e) => {
            if (root.classList.contains('intro-on')) {
                if (e.key === 'Escape') { e.preventDefault(); finishIntro(); }
                else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pressStart(); }
                return;
            }
            if (e.key === 'Escape') {
                if (!wheel.hidden) { closeWheel(); return; }
                if (!pause.hidden) { closePause(); return; }
                if (isTyping(e)) { e.target.blur(); return; }
                openPause();
                return;
            }
            if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); if (wheel.hidden) openWheel(); else closeWheel(); }
            else if ((e.key === 'm' || e.key === 'M') && pause.hidden) { e.preventDefault(); openPause(); }
        });

        // intro
        $('#intro-skip').addEventListener('click', (e) => { e.stopPropagation(); finishIntro(); });
        $('#press-start').addEventListener('click', (e) => { e.stopPropagation(); pressStart(); });
        intro.addEventListener('click', pressStart);
        if (root.classList.contains('intro-on')) {
            runIntro();
        } else {
            intro.hidden = true;
            phase = 'done';
            root.classList.add('hero-in');
        }
    }

    init();
})();
