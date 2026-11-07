/* =========================================================
   Gaurav Chaudhari · portfolio
   1. helpers   2. nav   3. display words   4. agent swarm
   5. demos (NL→SQL, RAG, Iris, Pothole, Intent, Reconciler)
   ========================================================= */
(() => {
    'use strict';

    /* ---------- 1. helpers ---------- */
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const root = document.documentElement;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const fmt = (n) => n.toLocaleString('en-IN');
    const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

    // Cancellable async sequences: starting a new run invalidates the previous one,
    // so a second click never leaves two timelines fighting over the same DOM.
    const CANCELLED = Symbol('cancelled');
    function sequence() {
        let token = 0;
        return {
            start() {
                const mine = ++token;
                const alive = () => mine === token;
                const sleep = (ms) => new Promise((res, rej) => setTimeout(() => (alive() ? res() : rej(CANCELLED)), ms));
                return { sleep, alive };
            },
            cancel() { token++; },
        };
    }
    const swallow = (e) => { if (e !== CANCELLED) throw e; };

    function restartAnim(el) {
        el.hidden = true;
        void el.offsetWidth;
        el.hidden = false;
    }

    // Tells a host page (e.g. the open-world edition) that a demo finished a run.
    const emitDone = (id, stat) => document.dispatchEvent(new CustomEvent('demo:done', { detail: { id, stat } }));

    // Play a demo by itself once it is on screen (and built by the swarm), so a
    // visitor who never clicks still sees each system work. Skipped if the visitor
    // already interacted with that demo, and entirely for reduced-motion users.
    // With onLeave, it re-runs on every entry and onLeave fires when it scrolls away.
    function autoplay(demoEl, onEnter, onLeave) {
        if (reduceMotion || root.dataset.autoplay === 'off' || !demoEl || !('IntersectionObserver' in window)) return;
        let touched = false;
        ['pointerdown', 'keydown'].forEach((t) => demoEl.addEventListener(t, () => { touched = true; }, { once: true, passive: true }));
        let timer = 0;
        const ready = () => !root.classList.contains('swarm-on') || demoEl.classList.contains('is-built');
        const io = new IntersectionObserver(([en]) => {
            clearTimeout(timer);
            if (en.intersectionRatio < 0.34) {
                if (onLeave) onLeave();
                return;
            }
            const go = () => {
                if (!ready()) { timer = setTimeout(go, 300); return; }
                if (onLeave) { onEnter(); return; }
                io.disconnect();
                if (!touched) onEnter();
            };
            timer = setTimeout(go, 450);
        }, { threshold: [0, 0.35] });
        io.observe(demoEl);
    }

    /* ---------- 2. nav ---------- */
    function initNav() {
        const nav = $('#nav');
        const toggle = $('.nav-toggle');
        const menu = $('#nav-menu');
        if (!nav || !toggle || !menu) return;
        const setOpen = (open) => {
            toggle.setAttribute('aria-expanded', String(open));
            menu.classList.toggle('is-open', open);
        };
        toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
        menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

        const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 24);
        addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        const links = $$('.nav-links a');
        const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (!en.isIntersecting) return;
                links.forEach((l) => l.classList.remove('is-active'));
                const link = byId.get(en.target.id);
                if (link) link.classList.add('is-active');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        $$('main section[id]').forEach((s) => io.observe(s));
    }

    /* ---------- 3. giant outlined words ----------
       Size each SVG word so its natural width is exactly the viewBox width,
       then crop the viewBox to the ink bounds measured with canvas. */
    function fitDisplayWords() {
        const ctx = document.createElement('canvas').getContext('2d');
        $$('.display-word svg').forEach((svg) => {
            const t = svg.querySelector('text');
            ctx.font = '400 200px Anton, Impact, sans-serif';
            const m = ctx.measureText(t.textContent);
            if (!m.width) return;
            const k = 1000 / m.width;
            const fs = 200 * k;
            const asc = m.actualBoundingBoxAscent * k;
            const desc = m.actualBoundingBoxDescent * k;
            const pad = 4;
            const base = 500;
            t.style.fontSize = fs.toFixed(2) + 'px';
            t.setAttribute('y', base);
            svg.setAttribute('viewBox', `0 ${(base - asc - pad).toFixed(1)} 1000 ${(asc + desc + pad * 2).toFixed(1)}`);
        });
    }

    /* ---------- 4. agent swarm ----------
       Every [data-build] element is a "layer". Agents (coloured cursors) pick up
       layers as they scroll into view, draw a blueprint box over each one, and the
       real content is revealed inside it. */
    const AGENT_NAMES = ['planner', 'retriever', 'router', 'embedder', 'vision', 'sql-gen', 'reranker', 'critic',
        'summarizer', 'tracker', 'indexer', 'ocr', 'guard', 'scheduler', 'executor', 'tokenizer'];
    const AGENT_COLORS = ['#ff5a5a', '#3ec5ff', '#3ddc84', '#ffb020', '#b18cff', '#ff7ac6', '#5eead4', '#fb923c',
        '#a3e635', '#60a5fa', '#f472b6', '#facc15', '#34d399', '#c084fc', '#fb7185', '#22d3ee'];
    const cursorSvg = (c) => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 1.5v12l3.4-3 2.4 4.6 2-1-2.3-4.5h4.6z" fill="${c}" stroke="#0a0a0a" stroke-width="1" stroke-linejoin="round"/></svg>`;

    function createSwarm() {
        const layers = $$('[data-build]');
        const total = layers.length;
        const order = new Map(layers.map((el, i) => [el, i]));

        let gen = 0;
        let raf = 0;
        let last = 0;
        let idleSince = 0;
        let processing = false;
        let finished = false;
        let built = 0;
        let agents = [];
        let crosses = [];
        let io = null;
        let ui = null;
        const pending = new Set();
        const assigned = new Set();
        const seenAt = new Map();

        function mountUi(n) {
            const cursors = document.createElement('div');
            cursors.className = 'swarm-cursors';
            cursors.setAttribute('aria-hidden', 'true');

            const boxes = document.createElement('div');
            boxes.className = 'swarm-boxes';
            boxes.setAttribute('aria-hidden', 'true');

            const hud = document.createElement('div');
            hud.className = 'swarm-hud';
            hud.innerHTML =
                `<span class="hud-dots" aria-hidden="true">${AGENT_COLORS.slice(0, n).map((c) => `<i style="--c:${c}"></i>`).join('')}</span>` +
                `<span class="hud-agents" aria-hidden="true"><b>${n}</b> agents</span>` +
                `<span class="hud-count" aria-hidden="true"><b class="hud-built">0</b>/${total} layers</span>` +
                `<span class="hud-bar" aria-hidden="true"><i></i></span>` +
                `<span class="hud-hint" aria-hidden="true" hidden>scroll ↓ to build</span>` +
                `<button type="button" class="hud-btn">Skip build</button>`;
            document.body.append(boxes, cursors, hud);

            hud.querySelector('.hud-btn').addEventListener('click', skip);
            return {
                cursors, boxes, hud,
                built: hud.querySelector('.hud-built'),
                count: hud.querySelector('.hud-count'),
                fill: hud.querySelector('.hud-bar i'),
                hint: hud.querySelector('.hud-hint'),
                btn: hud.querySelector('.hud-btn'),
            };
        }

        function spawnCrosshairs(n) {
            for (let i = 0; i < n; i++) {
                const c = document.createElement('i');
                c.className = 'crosshair';
                const x = rand(4, 96);
                const y = rand(10, 90);
                c.style.left = x + '%';
                c.style.top = y + '%';
                c.style.setProperty('--c', AGENT_COLORS[i % AGENT_COLORS.length]);
                c.style.animationDelay = (-Math.random()).toFixed(2) + 's';
                ui.cursors.appendChild(c);
                crosses.push({ el: c, x: (x / 100) * innerWidth, y: (y / 100) * innerHeight });
            }
        }

        function clearCrosshairs() {
            crosses.forEach((c, i) => setTimeout(() => {
                c.el.style.opacity = '0';
                setTimeout(() => c.el.remove(), 500);
            }, i * 20));
            crosses = [];
        }

        function makeAgents(n) {
            return Array.from({ length: n }, (_, i) => {
                const el = document.createElement('div');
                el.className = 'agent';
                const c = AGENT_COLORS[i % AGENT_COLORS.length];
                el.style.setProperty('--c', c);
                el.innerHTML = cursorSvg(c) + `<span class="agent-tag">${AGENT_NAMES[i % AGENT_NAMES.length]}</span>`;
                ui.cursors.appendChild(el);
                const spawn = crosses[i % Math.max(crosses.length, 1)] || { x: rand(0, innerWidth), y: rand(0, innerHeight) };
                return { el, x: spawn.x, y: spawn.y, tx: spawn.x, ty: spawn.y, job: null, follow: null, wanderAt: 0 };
            });
        }

        function tick(now) {
            const dt = Math.min(48, now - (last || now));
            last = now;
            const k = 1 - Math.pow(1 - 0.13, dt / 16.7);
            const W = innerWidth;
            const H = innerHeight;

            for (const a of agents) {
                if (a.follow) {
                    const p = a.follow();
                    a.tx = p.x;
                    a.ty = p.y;
                } else if (now > a.wanderAt) {
                    a.tx = clamp(a.x + rand(-180, 180), 16, W - 60);
                    a.ty = clamp(a.y + rand(-140, 140), 70, H - 70);
                    a.wanderAt = now + rand(900, 1900);
                }
                const kk = a.follow ? k : k * 0.22;
                a.x += (a.tx - a.x) * kk;
                a.y += (a.ty - a.y) * kk;
                a.el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
            }

            // Never leave content hidden for long if every agent is busy.
            for (const el of pending) {
                if (now - seenAt.get(el) > 3200) reveal(el);
            }

            if (processing) assign(now);

            const busy = pending.size > 0 || assigned.size > 0;
            if (busy || !processing) idleSince = now;
            const idleFor = now - idleSince;
            if (ui) ui.hint.hidden = !(processing && !finished && idleFor > 900);
            if (idleFor > 2400) agents.forEach((a) => a.el.classList.remove('is-live'));
            if (idleFor > 3200 && !finished) { raf = 0; return; } // sleep until something scrolls into view

            raf = requestAnimationFrame(tick);
        }

        function wake() {
            if (!raf && gen && !finished) {
                last = 0;
                idleSince = performance.now();
                raf = requestAnimationFrame(tick);
            }
        }

        // One dispatch every DISPATCH_GAP ms, top-most layer first, to the nearest
        // free agent. The gap is what makes the page cascade together instead of popping in.
        const DISPATCH_GAP = 95;
        let lastDispatch = 0;
        function assign(now) {
            if (!pending.size || now - lastDispatch < DISPATCH_GAP) return;
            const free = agents.filter((a) => !a.job);
            if (!free.length) return;
            let el = null;
            for (const p of pending) if (!el || order.get(p) < order.get(el)) el = p;
            const r = el.getBoundingClientRect();
            let agent = free[0];
            let bestD = Infinity;
            for (const a of free) {
                const d = (a.x - r.left) ** 2 + (a.y - r.top) ** 2;
                if (d < bestD) { bestD = d; agent = a; }
            }
            pending.delete(el);
            lastDispatch = now;
            runJob(agent, el, gen);
        }

        async function runJob(a, el, myGen) {
            a.job = el;
            assigned.add(el);
            a.el.classList.add('is-live');
            const topLeft = () => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top }; };
            a.follow = topLeft;

            const t0 = performance.now();
            await new Promise((res) => {
                const check = () => {
                    const p = topLeft();
                    if (myGen !== gen || Math.hypot(p.x - a.x, p.y - a.y) < 8 || performance.now() - t0 > 750) res();
                    else requestAnimationFrame(check);
                };
                check();
            });
            if (myGen !== gen) return;

            if (!el.classList.contains('is-built')) {
                const r = el.getBoundingClientRect();
                const w = document.createElement('div');
                w.className = 'wire';
                w.style.left = (r.left + scrollX) + 'px';
                w.style.top = (r.top + scrollY) + 'px';
                w.innerHTML = `<span class="wire-tag">${escapeHtml(el.dataset.build)} · ${Math.round(r.width)}×${Math.round(r.height)}</span>`;
                ui.boxes.appendChild(w);
                void w.offsetWidth;
                w.style.width = r.width + 'px';
                w.style.height = r.height + 'px';
                a.follow = () => { const rr = el.getBoundingClientRect(); return { x: rr.right - 6, y: rr.bottom - 6 }; };

                await wait(460);
                if (myGen !== gen) return;
                w.classList.add('is-tagged');
                reveal(el);
                await wait(420);
                w.classList.add('is-done');
                setTimeout(() => w.remove(), 360);
            }

            if (myGen !== gen) return;
            assigned.delete(el);
            a.follow = null;
            a.job = null;
            a.wanderAt = 0;
        }

        function reveal(el) {
            pending.delete(el);
            if (el.classList.contains('is-built')) return;
            el.classList.add('is-built');
            if (io) io.unobserve(el);
            built++;
            if (ui) {
                ui.built.textContent = built;
                ui.fill.style.width = (built / total * 100).toFixed(1) + '%';
            }
            if (built >= total) finish();
        }

        function observe() {
            io = new IntersectionObserver((entries) => {
                const now = performance.now();
                for (const en of entries) {
                    const el = en.target;
                    if (el.classList.contains('is-built') || assigned.has(el)) continue;
                    if (en.isIntersecting) {
                        if (!pending.has(el)) { pending.add(el); seenAt.set(el, now); }
                    } else if (en.boundingClientRect.bottom <= 0) {
                        reveal(el); // scrolled past before an agent got to it
                    } else {
                        pending.delete(el);
                    }
                }
                wake();
            }, { rootMargin: '0px 0px -4% 0px' });
            layers.forEach((l) => { if (!l.classList.contains('is-built')) io.observe(l); });
        }

        // A scrollbar drag can jump a layer from below the viewport to above it without
        // it ever intersecting, so IntersectionObserver never reports it. Sweep for those.
        let sweepQueued = false;
        addEventListener('scroll', () => {
            if (!processing || sweepQueued) return;
            sweepQueued = true;
            requestAnimationFrame(() => {
                sweepQueued = false;
                if (!processing) return;
                for (const el of layers) {
                    if (el.classList.contains('is-built') || assigned.has(el)) continue;
                    if (el.getBoundingClientRect().bottom <= 0) reveal(el);
                }
            });
        }, { passive: true });

        async function start() {
            teardown();
            const myGen = ++gen;
            finished = false;
            built = 0;
            processing = false;
            window.__swarmBooted = true;
            root.classList.remove('swarm-skip');
            root.classList.add('swarm-on');
            layers.forEach((l) => l.classList.remove('is-built'));

            const small = innerWidth < 700;
            const n = small ? 8 : 16;
            ui = mountUi(n);
            spawnCrosshairs(small ? 16 : 30);
            agents = makeAgents(n);
            agents.forEach((a, i) => setTimeout(() => { if (myGen === gen) a.el.classList.add('is-live'); }, 180 + i * 45));
            setTimeout(() => { if (myGen === gen && ui) ui.hud.classList.add('is-in'); }, 250);

            last = 0;
            idleSince = performance.now();
            raf = requestAnimationFrame(tick);

            await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(1500)]);
            fitDisplayWords();
            await wait(450);
            if (myGen !== gen) return;
            clearCrosshairs();
            processing = true;
            observe();
        }

        function finish() {
            if (finished) return;
            finished = true;
            processing = false;
            if (io) { io.disconnect(); io = null; }
            const myGen = gen;
            const myUi = ui;
            if (myUi) {
                myUi.count.innerHTML = `<b>✓ ${total}/${total}</b> layers built`;
                myUi.hint.hidden = true;
                myUi.btn.hidden = true;
            }
            agents.forEach((a) => { a.follow = null; });
            setTimeout(() => agents.forEach((a) => a.el.classList.remove('is-live')), 500);
            setTimeout(() => { if (myUi) myUi.hud.classList.remove('is-in'); }, 2200);
            setTimeout(() => {
                if (myGen !== gen) return;
                cancelAnimationFrame(raf);
                raf = 0;
                root.classList.remove('swarm-on', 'swarm-skip');
                if (myUi) { myUi.cursors.remove(); myUi.boxes.remove(); myUi.hud.remove(); }
                if (ui === myUi) ui = null;
                agents = [];
            }, 2700);
        }

        function skip() {
            try { sessionStorage.setItem('swarm-skip', '1'); } catch (e) { /* storage blocked */ }
            root.classList.add('swarm-skip');
            processing = false;
            layers.forEach(reveal);
        }

        function teardown() {
            gen++;
            cancelAnimationFrame(raf);
            raf = 0;
            if (io) { io.disconnect(); io = null; }
            if (ui) { ui.cursors.remove(); ui.boxes.remove(); ui.hud.remove(); ui = null; }
            agents = [];
            crosses = [];
            pending.clear();
            assigned.clear();
            seenAt.clear();
        }

        function replay() {
            if (reduceMotion) return;
            try { sessionStorage.removeItem('swarm-skip'); } catch (e) { /* storage blocked */ }
            window.scrollTo({ top: 0, behavior: 'instant' });
            start();
        }

        // Keyboard users tabbing into a layer that hasn't been built yet see it immediately.
        document.addEventListener('focusin', (e) => {
            if (!root.classList.contains('swarm-on')) return;
            const layer = e.target.closest('[data-build]');
            if (layer) reveal(layer);
        });

        return { start, replay };
    }

    /* ---------- 5. demos ----------
       All six follow one pattern, so a visitor learns it once:
       examples → a 3-step tracker → one visual → a one-line result,
       with the technical detail folded into "Under the hood".
       Both pages only hold <div class="demo" data-sim="…"> placeholders;
       this section is the single source of the demo markup. */
    const ICONS = {
        check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
        db: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
        chat: '<path d="M4 5h16v11h-9.5L5 20v-4H4z"/>',
        spark: '<path d="M12 3.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z"/>',
        bot: '<rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 4.5V8M9.5 12.5v2M14.5 12.5v2"/>',
        person: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c.6-4 3.6-6.5 7.5-6.5s6.9 2.5 7.5 6.5"/>',
        bulb: '<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
        snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
        cam: '<path d="M3.5 8.5h3l1.8-2.5h7.4l1.8 2.5h3v11h-17z"/><circle cx="12" cy="13.5" r="3.4"/>',
        pin: '<path d="M12 21.5s6.5-6.6 6.5-11.5a6.5 6.5 0 0 0-13 0c0 4.9 6.5 11.5 6.5 11.5z"/><circle cx="12" cy="10" r="2.3"/>',
    };
    const icon = (name) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

    const SQL_KW = /\b(SELECT|FROM|WHERE|AND|NOT|IN|GROUP BY|ORDER BY|COUNT|FILTER|AS|NOW|INTERVAL|IS|NULL|DATE_TRUNC|DESC)\b/g;
    function highlightSql(sql) {
        return escapeHtml(sql)
            .replace(/'[^']*'/g, (m) => `<span class="str">${m}</span>`)
            .replace(SQL_KW, '<span class="kw">$1</span>')
            .replace(/(?<![\w'])(\d+)(?![\w'])/g, '<span class="num">$1</span>');
    }

    // Charts are drawn at their container's real width (so text never shrinks)
    // and coloured through CSS classes (so the open-world page can re-tint them).
    const chartWidth = (w) => Math.max(280, Math.round(w) || 320);

    function lineChart(labels, values, width) {
        const W = chartWidth(width), H = 150, L = 10, R = 44, T = 18, B = 24;
        const max = Math.max(...values);
        const min = Math.min(...values);
        const lo = min - (max - min) * 0.2;
        const n = values.length - 1;
        const x = (i) => L + (i * (W - L - R)) / n;
        const y = (v) => T + (1 - (v - lo) / (max - lo)) * (H - T - B);
        const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
        return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Applications per month, rising from ${values[0]} to ${values[n]}">` +
            `<line class="ch-base" x1="${L}" x2="${x(n)}" y1="${H - B}" y2="${H - B}"/>` +
            `<path class="ch-area" d="M${L},${H - B} L${pts.join(' L')} L${x(n)},${H - B} Z"/>` +
            `<path class="ch-line" pathLength="1" d="M${pts.join(' L')}"/>` +
            `<circle class="ch-dot" cx="${x(0)}" cy="${y(values[0]).toFixed(1)}" r="3.5"/>` +
            `<circle class="ch-dot ch-end" cx="${x(n)}" cy="${y(values[n]).toFixed(1)}" r="5"/>` +
            `<text class="ch-val" x="${x(0)}" y="${(y(values[0]) - 11).toFixed(1)}">${values[0]}</text>` +
            `<text class="ch-val ch-strong" x="${x(n) + 11}" y="${(y(values[n]) + 4).toFixed(1)}">${values[n]}</text>` +
            `<text class="ch-ax" x="${L}" y="${H - 6}">${labels[0]}</text>` +
            `<text class="ch-ax" x="${x(n)}" y="${H - 6}" text-anchor="end">${labels[n]}</text></svg>`;
    }

    function barChart(items, width) {
        const W = chartWidth(width), L = 96, R = 56, T = 6, rowH = 38;
        const H = T * 2 + items.length * rowH;
        const max = Math.max(...items.map((it) => it.value));
        const rows = items.map((it, i) => {
            const y = T + i * rowH;
            const w = ((W - L - R) * it.value) / max;
            return `<text class="ch-lbl" x="${L - 10}" y="${y + 23}" text-anchor="end">${it.label}</text>` +
                `<rect class="ch-bar ${it.cls}" x="${L}" y="${y + 9}" width="${w.toFixed(1)}" height="20" rx="3" style="animation-delay:${i * 0.12}s"/>` +
                `<text class="ch-val ch-strong" x="${(L + w + 8).toFixed(1)}" y="${y + 23}">${fmt(it.value)}</text>`;
        }).join('');
        return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${items.map((it) => `${it.label}: ${fmt(it.value)}`).join(', ')}">${rows}</svg>`;
    }

    function donutChart(items, center, centerLabel, width) {
        const W = chartWidth(width);
        const sum = items.reduce((s, it) => s + it.value, 0);
        let off = 0;
        const arcs = items.map((it) => {
            const p = (it.value / sum) * 100;
            const arc = `<circle class="ch-arc ${it.cls}" cx="70" cy="70" r="50" pathLength="100" ` +
                `stroke-dasharray="${Math.max(p - 0.8, 0).toFixed(2)} ${(100 - p + 0.8).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"/>`;
            off += p;
            return arc;
        }).join('');
        const legend = items.map((it, i) =>
            `<rect class="ch-key ${it.cls}" x="152" y="${37 + i * 28}" width="11" height="11" rx="2"/>` +
            `<text class="ch-lbl" x="171" y="${47 + i * 28}">${it.label} · ${fmt(it.value)}</text>`).join('');
        // the donut + legend group is 300 wide; centre it in wider charts
        return `<svg viewBox="0 0 ${W} 140" role="img" aria-label="${items.map((it) => `${it.label}: ${fmt(it.value)}`).join(', ')}">` +
            `<g transform="translate(${Math.max(0, (W - 300) / 2).toFixed(1)} 0)"><g class="ch-arcs">${arcs}</g>` +
            `<text class="ch-val ch-strong ch-center" x="70" y="72" text-anchor="middle">${center}</text>` +
            `<text class="ch-ax" x="70" y="89" text-anchor="middle">${centerLabel}</text>${legend}</g></svg>`;
    }

    // Shows the visitor's question as a chat bubble at the top of the stage.
    function ask(ui, text, lang) {
        const bubble = ui.$('.chat-q');
        const p = bubble.firstElementChild;
        p.textContent = text;
        if (lang) p.lang = lang; else p.removeAttribute('lang');
        restartAnim(bubble);
    }

    /* 5a · natural language → SQL */
    const MONTHS = ['Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'];
    const TREND = [298, 310, 345, 372, 390, 412, 437, 455, 490, 512, 528, 561];
    const SQL_PICKS = {
        trend: {
            q: 'How many applications came in each month?',
            big: '+88%',
            note: 'more applications than a year ago',
            chart: (w) => lineChart(MONTHS, TREND, w),
            say: 'Applications rose month after month, from 298 to 561.',
            sql: `SELECT DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS applications
FROM rts_citizen_applications
WHERE created_at >= NOW() - INTERVAL '12 months'
  AND status NOT IN ('deleted', 'draft')
GROUP BY month
ORDER BY month;`,
            stat: '12 months charted',
        },
        status: {
            q: 'How many applications are approved?',
            big: '73%',
            note: 'of 4,276 applications approved',
            chart: (w) => barChart([
                { label: 'Approved', value: 3142, cls: 'c-ok' },
                { label: 'In progress', value: 854, cls: 'c-mid' },
                { label: 'Rejected', value: 280, cls: 'c-bad' },
            ], w),
            say: '3,142 approved, 854 still in progress and 280 rejected.',
            sql: `SELECT status, COUNT(*) AS applications
FROM rts_citizen_applications
WHERE deleted_at IS NULL
  AND status NOT IN ('deleted', 'draft')
GROUP BY status
ORDER BY applications DESC;`,
            stat: '4,276 applications by status',
        },
        marathi: {
            q: 'एकूण किती नागरिक अर्ज दाखल झाले आहेत?',
            lang: 'mr',
            big: '4,276',
            note: 'एकूण अर्ज (total applications)',
            chart: (w) => donutChart([
                { label: 'मंजूर', value: 3142, cls: 'c-ok' },
                { label: 'प्रलंबित', value: 854, cls: 'c-mid' },
                { label: 'नामंजूर', value: 280, cls: 'c-bad' },
            ], '73%', 'मंजूर', w),
            say: '<span lang="mr">एकूण 4,276 अर्ज प्राप्त झाले: 3,142 मंजूर, 854 प्रलंबित आणि 280 नामंजूर.</span>',
            sql: `SELECT COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE status IN ('under_review', 'payment_pending')) AS pending,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
FROM rts_citizen_applications
WHERE deleted_at IS NULL;`,
            stat: 'answered in Marathi',
        },
    };

    /* 5b · document search (RAG) */
    const FILES = [
        ['pdf', 'Q3 report'], ['xls', 'Q3 sales'], ['ppt', 'Board update'], ['pdf', 'HR policy'],
        ['doc', 'Staff handbook'], ['pdf', 'HR circular'], ['doc', 'Vendor SOP'], ['pdf', 'Board minutes'],
        ['pdf', 'IT security'], ['doc', 'Travel rules'], ['xls', 'Budget 2027'], ['ppt', 'Onboarding'],
    ];
    // A source number stays glued to its word (and punctuation) when the line wraps.
    const cite = (word, n, tail = '') => `<span class="cite-w">${word}<sup class="cite">${n}</sup>${tail}</span>`;
    const RAG_PICKS = {
        revenue: {
            q: 'What was our Q3 revenue?',
            hits: [0, 1, 2],
            say: `Q3 revenue was $4.2M, up 15% on ${cite('Q2', 1, '.')} Software licences brought in ${cite('75%', 2, ',')} helped by three big deals in ${cite('August', 3, '.')}`,
            stat: 'answer with 3 sources',
        },
        leave: {
            q: 'How much leave do contract staff get?',
            hits: [3, 4, 5],
            say: `1.5 paid days for every month ${cite('worked', 1, '.')} Unused leave lapses when the contract ${cite('ends', 2, ',')} and the reporting officer approves ${cite('requests', 3, '.')}`,
            stat: 'answer with 3 sources',
        },
        none: {
            q: 'Will it rain tomorrow?',
            hits: [],
            say: 'None of these files covers that, so it says so instead of guessing.',
            stat: 'no answer invented',
        },
    };

    /* 5c · Project Iris: one workday, [left %, top %] per person (null = not in the office) */
    const DAY = [
        { t: '09:00', at: [[17, 50], [33, 72], null, null], lit: 'a', say: 'Two people arrive, so the desk area lights up.' },
        { t: '11:00', at: [[17, 50], [33, 72], [65, 48], [82, 70]], lit: 'ab', say: 'A meeting starts, so the meeting room follows.' },
        { t: '13:00', at: [[17, 50], [33, 72], null, null], lit: 'a', say: 'The meeting ends and that room switches off.' },
        { t: '19:00', at: [null, null, null, null], lit: '', say: 'Everyone leaves. Everything goes off.' },
    ];

    /* 5e · intent router */
    const ROUTES = [['in', 'M13 50 H45'], ['faq', 'M45 50 C64 50 65 22 85 22'], ['off', 'M45 50 C64 50 65 78 85 78']];
    const INTENT_PICKS = {
        faq: {
            q: 'What documents do I need to set up a handmill?',
            to: 'faq',
            tag: 'Routine · 88%',
            tone: 'ok',
            say: 'Routine question, answered instantly from the FAQ.',
            stat: 'FAQ → auto-answered',
        },
        invest: {
            q: 'I want to set up a handmill plant in Pune with a ₹5 crore investment.',
            to: 'off',
            tag: 'Investment · 97%',
            tone: 'alert',
            say: 'A real investment offer, sent straight to an MIDC officer as high priority.',
            stat: 'investment → officer escalation',
        },
    };

    /* 5f · receipt reconciler: [merchant, time, amount] */
    const BANK = [['Uber', '08:30', '24.00'], ['Starbucks', '09:16', '12.50'], ['AWS', '11:02', '85.00']];

    const SIMS = {
        sql: {
            title: 'Ask the database',
            picks: [
                { id: 'trend', label: 'Applications per month' },
                { id: 'status', label: 'How many approved?' },
                { id: 'marathi', label: 'Ask in Marathi' },
            ],
            steps: ['Reads the question', 'Writes a safe query', 'Draws the answer'],
            stage: `<div class="sim-idle">${icon('db')}</div>` +
                '<div class="chat-q" hidden><p></p></div>' +
                '<div class="sql-card" hidden><p class="sql-big"><b></b><span></span></p><div class="sql-chart"></div></div>',
            more: '<p>Run a question to see the SQL it writes.</p>',
            async play({ ui, pick, walk }) {
                const p = SQL_PICKS[pick];
                const card = ui.$('.sql-card');
                ui.$('.sim-idle').hidden = true;
                card.hidden = true;
                ask(ui, p.q, p.lang);
                ui.busy();
                await walk(0, 700);
                ui.more(`<pre class="code">${highlightSql(p.sql)}</pre><p>Read-only, and limited to the rows this officer may see.</p>`);
                await walk(1, 900);
                ui.$('.sql-big b').textContent = p.big;
                ui.$('.sql-big span').textContent = p.note;
                restartAnim(card);
                const chart = ui.$('.sql-chart');
                chart.innerHTML = p.chart(chart.clientWidth);
                await walk(2, 500);
                ui.say('ok', p.say);
                return p.stat;
            },
        },

        rag: {
            title: 'Search company files',
            picks: [
                { id: 'revenue', label: 'Q3 revenue' },
                { id: 'leave', label: 'Leave policy' },
                { id: 'none', label: 'Not in the files' },
            ],
            steps: ['Reads the question', 'Searches every file', 'Answers with sources'],
            stage: '<div class="chat-q" hidden><p></p></div>' +
                `<div class="rg-files">${FILES.map(([type, name]) =>
                    `<div class="rg-file ft-${type}"><i class="mono">${type.toUpperCase()}</i><span>${name}</span></div>`).join('')}</div>`,
            more: '<ul><li>Hybrid search: keywords plus meaning (pgvector)</li>' +
                '<li>The best passages are reranked; a weak match gets a HyDE retry, then no answer</li>' +
                '<li>Each company searches only its own files</li></ul>',
            async play({ ui, pick, sleep, walk }) {
                const p = RAG_PICKS[pick];
                const files = ui.$$('.rg-file');
                files.forEach((f) => {
                    f.classList.remove('is-scan', 'is-hit', 'is-off');
                    delete f.dataset.cite;
                });
                ask(ui, p.q);
                ui.busy();
                await walk(0, 600);
                ui.step(1, 'on');
                for (const f of files) {
                    f.classList.add('is-scan');
                    await sleep(70);
                    f.classList.remove('is-scan');
                }
                files.forEach((f, i) => f.classList.toggle('is-off', !p.hits.includes(i)));
                for (const [k, i] of p.hits.entries()) {
                    files[i].dataset.cite = k + 1;
                    files[i].classList.add('is-hit');
                    await sleep(250);
                }
                const found = p.hits.length > 0;
                ui.step(1, found ? 'done' : 'warn');
                await walk(2, 450, found ? 'done' : 'warn');
                ui.say(found ? 'ok' : 'warn', p.say);
                return p.stat;
            },
        },

        iris: {
            title: 'Smart office',
            picks: [{ id: 'day', label: '▶ Play a workday', primary: true }],
            steps: ['Camera spots people', 'AI counts each room', 'Lights & AC follow'],
            stage: '<div class="office">' +
                `<div class="room" data-room="a"><span class="room-gear">${icon('bulb')}${icon('snow')}</span><span class="room-name mono">Desks</span></div>` +
                `<div class="room" data-room="b"><span class="room-gear">${icon('bulb')}${icon('snow')}</span><span class="room-name mono">Meeting room</span></div>` +
                '<i class="ppl"></i><i class="ppl"></i><i class="ppl"></i><i class="ppl"></i>' +
                '<div class="o-hud mono"><span class="o-cam">Camera</span><b class="o-clock">08:00</b><span class="o-count">0 people</span></div>' +
                '<div class="o-day"><i></i></div></div>',
            more: '<ul><li>YOLOv8 and OpenCV count people per zone about once a second</li>' +
                '<li>FastAPI switches the light and HVAC relays; a React dashboard updates over WebSockets</li></ul>',
            async play({ ui, sleep, walk }) {
                const people = ui.$$('.ppl');
                const rooms = ui.$$('.room');
                const clock = ui.$('.o-clock');
                const count = ui.$('.o-count');
                const day = ui.$('.o-day i');
                const place = (at) => people.forEach((el, i) => {
                    // Off-camera people wait below the door of their own room.
                    const [x, y] = at[i] || [i < 2 ? 26 : 74, 115];
                    el.style.setProperty('--x', x + '%');
                    el.style.setProperty('--y', y + '%');
                    el.classList.toggle('is-in', !!at[i]);
                    el.classList.remove('is-seen');
                });
                const light = (lit) => rooms.forEach((r) => r.classList.toggle('is-lit', lit.includes(r.dataset.room)));

                place([null, null, null, null]);
                light('');
                clock.textContent = '08:00';
                count.textContent = '0 people';
                day.style.width = '0%';
                ui.say('info', '<b class="mono">08:00</b>Empty office: lights and AC are off.');
                await sleep(1200);
                for (const [k, ev] of DAY.entries()) {
                    ui.resetSteps();
                    clock.textContent = ev.t;
                    day.style.width = ((k + 1) / DAY.length) * 100 + '%';
                    place(ev.at);
                    await walk(0, 900);
                    const n = ev.at.filter(Boolean).length;
                    people.forEach((el, i) => el.classList.toggle('is-seen', !!ev.at[i]));
                    count.textContent = n + (n === 1 ? ' person' : ' people');
                    await walk(1, 500);
                    light(ev.lit);
                    await walk(2, 300);
                    ui.say('info', `<b class="mono">${ev.t}</b>${ev.say}`);
                    await sleep(1400);
                }
                ui.say('ok', 'Lights and AC were on only where people were.');
                return 'lights and AC followed people all day';
            },
        },

        pothole: {
            title: 'Report a pothole',
            picks: [
                { id: 'real', label: 'Road with a pothole' },
                { id: 'clean', label: 'Smooth road' },
            ],
            steps: ['Citizen snaps a photo', 'AI checks the damage', 'Road team gets the job'],
            stage: '<div class="ph">' +
                `<div class="ph-phone"><div class="ph-photo">${icon('cam')}<i class="ph-scan" hidden></i>` +
                '<span class="ph-box" hidden><b class="mono">Pothole 98%</b></span></div></div>' +
                '<div class="ph-side">' +
                '<div class="ph-meter"><span class="mono">Damage</span><span class="ph-bar"><i></i></span><b>–</b></div>' +
                '<div class="ph-map"><svg viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true"><path d="M40 -5 L80 105 M-5 58 L205 40 M150 -5 L128 105"/></svg>' +
                `<span class="ph-pin" hidden>${icon('pin')}</span></div>` +
                '<div class="ph-ticket" hidden><b></b><span></span></div>' +
                '</div></div>',
            more: '<ul><li>YOLO finds the pothole on the phone itself (edge AI)</li>' +
                '<li>Gemini grades how bad it is from the photo</li>' +
                '<li>A geotagged work order lands on the MIDC dashboard</li></ul>',
            async play({ ui, pick, sleep, walk }) {
                const real = pick === 'real';
                const photo = ui.$('.ph-photo');
                const scan = ui.$('.ph-scan');
                const box = ui.$('.ph-box');
                const meter = ui.$('.ph-meter');
                const level = ui.$('.ph-bar i');
                const verdict = ui.$('.ph-meter b');
                const pin = ui.$('.ph-pin');
                const ticket = ui.$('.ph-ticket');
                photo.className = 'ph-photo ' + (real ? 'is-pothole' : 'is-clean');
                restartAnim(photo);
                box.hidden = true;
                pin.hidden = true;
                ticket.hidden = true;
                meter.className = 'ph-meter';
                level.style.width = '0%';
                verdict.textContent = '–';
                ui.busy();
                await walk(0, 700);
                ui.step(1, 'on');
                restartAnim(scan);
                await sleep(1300);
                scan.hidden = true;
                box.hidden = !real;
                meter.classList.add(real ? 'is-bad' : 'is-good');
                level.style.width = real ? '78%' : '4%';
                verdict.textContent = real ? 'Severe · 7.8 / 10' : 'No damage';
                await sleep(700);
                ui.step(1, 'done');
                ui.step(2, 'on');
                ticket.firstElementChild.textContent = real ? 'Repair order #2291' : 'No repair needed';
                ticket.lastElementChild.textContent = real ? 'Sent to the MIDC road team' : 'Report closed automatically';
                ticket.className = 'ph-ticket ' + (real ? 'is-bad' : 'is-good');
                ticket.hidden = false;
                pin.hidden = !real;
                await sleep(500);
                ui.step(2, real ? 'done' : 'skip');
                if (real) {
                    ui.say('alert', 'Severe pothole found. A repair order went to the MIDC road team.');
                    return 'severity 7.8/10 · work order raised';
                }
                ui.say('ok', 'No damage, so the report closed itself. No officer time spent.');
                return 'clean road · report closed';
            },
        },

        intent: {
            title: 'Sort investor messages',
            picks: [
                { id: 'faq', label: 'Routine question' },
                { id: 'invest', label: 'Investment offer' },
            ],
            auto: 'invest',
            steps: ['Message arrives', 'AI reads the intent', 'Sent to the right desk'],
            stage: '<div class="chat-q" hidden><p></p></div><div class="route">' +
                '<svg class="route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
                ROUTES.map(([, d]) => `<path d="${d}"/>`).join('') +
                ROUTES.map(([k, d]) => `<path class="flow" data-flow="${k}" d="${d}"/>`).join('') + '</svg>' +
                `<div class="rn" data-node="msg" style="--x:13%;--y:50%">${icon('chat')}<span>Message</span></div>` +
                `<div class="rn" data-node="ai" style="--x:45%;--y:50%">${icon('spark')}<span>AI sorter</span><em class="rn-tag mono"></em></div>` +
                `<div class="rn" data-node="faq" style="--x:85%;--y:22%">${icon('bot')}<span>Instant reply</span></div>` +
                `<div class="rn" data-node="off" style="--x:85%;--y:78%">${icon('person')}<span>Officer</span></div></div>`,
            more: '<ul><li>A LangGraph router compares the message with past examples (embeddings in pgvector)</li>' +
                '<li>A confident investment intent opens a priority ticket for an officer</li></ul>',
            async play({ ui, pick, sleep, walk }) {
                const p = INTENT_PICKS[pick];
                const node = (k) => ui.$(`[data-node="${k}"]`);
                const flow = (k) => ui.$(`[data-flow="${k}"]`);
                const tone = p.to === 'off' ? 'is-bad' : 'is-ok';
                const tag = ui.$('.rn-tag');
                ui.$$('.rn').forEach((n) => n.classList.remove('is-on', 'is-ok', 'is-bad'));
                ui.$$('.flow').forEach((f) => f.classList.remove('is-on'));
                tag.textContent = '';
                ask(ui, p.q);
                ui.busy();
                node('msg').classList.add('is-on');
                flow('in').classList.add('is-on');
                await walk(0, 800);
                node('ai').classList.add('is-on');
                await walk(1, 900);
                node('msg').classList.remove('is-on');
                flow('in').classList.remove('is-on');
                node('ai').classList.replace('is-on', tone);
                tag.textContent = p.tag;
                flow(p.to).classList.add('is-on');
                ui.step(2, 'on');
                await sleep(700);
                node(p.to).classList.add(tone);
                ui.step(2, 'done');
                ui.say(p.tone, p.say);
                return p.stat;
            },
        },

        recon: {
            title: 'Match a receipt',
            picks: [{ id: 'scan', label: '▶ Scan the receipt', primary: true }],
            steps: ['Phone reads the receipt', 'Checks amount, time, shop', 'Payment matched'],
            stage: '<div class="rc">' +
                '<div class="rc-receipt mono">' +
                '<b class="r-shop"><span class="ext">STARBUCKS COFFEE</span></b>' +
                '<span class="r-date"><span class="ext">21 Aug · 09:14</span></span>' +
                '<span class="r-line"><span>Coffee</span><span>$5.50</span></span>' +
                '<span class="r-line"><span>Toast</span><span>$7.00</span></span>' +
                '<b class="r-line r-total"><span>TOTAL</span><span class="ext">$12.50</span></b>' +
                '<i class="rc-scan" hidden></i></div>' +
                '<div class="rc-bank"><p class="rc-head mono">Bank · 21 Aug</p><ul>' +
                BANK.map(([name, time, amt]) => `<li class="rc-tx"><b>${name}</b><small class="mono">${time}</small><span class="mono">−$${amt}</span></li>`).join('') +
                '</ul></div>' +
                `<div class="rc-checks">${['Same amount', '2 min apart', 'Same shop'].map((c) => `<span class="rc-chk">${icon('check')}${c}</span>`).join('')}</div>` +
                '</div>',
            more: '<ul><li>Gemini Nano reads the receipt on the phone (Android AICore), so nothing is uploaded</li>' +
                '<li>Three-tier match: exact amount, then time window, then fuzzy shop name (0.96)</li></ul>',
            async play({ ui, sleep }) {
                const fields = ui.$$('.ext');
                const txs = ui.$$('.rc-tx');
                const checks = ui.$$('.rc-chk');
                const scan = ui.$('.rc-scan');
                const match = txs[1];
                fields.forEach((f) => f.classList.remove('is-on'));
                txs.forEach((t) => t.classList.remove('is-scan', 'is-off', 'is-match'));
                checks.forEach((c) => c.classList.remove('is-on'));
                ui.busy();
                ui.step(0, 'on');
                restartAnim(scan);
                await sleep(1300);
                scan.hidden = true;
                for (const f of fields) {
                    f.classList.add('is-on');
                    await sleep(180);
                }
                ui.step(0, 'done');
                ui.step(1, 'on');
                for (const t of txs) {
                    t.classList.add('is-scan');
                    await sleep(260);
                    t.classList.remove('is-scan');
                }
                match.classList.add('is-scan');
                for (const c of checks) {
                    c.classList.add('is-on');
                    await sleep(450);
                }
                ui.step(1, 'done');
                ui.step(2, 'on');
                match.classList.replace('is-scan', 'is-match');
                txs.forEach((t) => { if (t !== match) t.classList.add('is-off'); });
                await sleep(400);
                ui.step(2, 'done');
                ui.say('ok', 'Matched to the $12.50 Starbucks payment, all on the phone.');
                return 'merchant match 0.96 · reconciled';
            },
        },
    };

    // Builds a demo's shell and returns the handful of controls every demo uses.
    function mountSim(el, def) {
        el.innerHTML =
            `<div class="demo-bar mono"><span class="demo-dots"><i></i><i></i><i></i></span><span class="demo-title">${def.title}</span><span class="demo-flag">Simulation</span></div>` +
            '<div class="sim">' +
            `<div class="sim-try" role="group" aria-label="Examples">${def.picks.map((p) =>
                `<button type="button" class="sim-chip${p.primary ? ' is-primary' : ''}" data-pick="${p.id}">${p.label}</button>`).join('')}</div>` +
            `<ol class="sim-steps">${def.steps.map((s, i) => `<li><i data-n="${i + 1}"></i><span>${s}</span></li>`).join('')}</ol>` +
            `<div class="sim-stage">${def.stage}</div>` +
            '<p class="sim-out" aria-live="polite"><span>Press a button above to watch it work.</span></p>' +
            `<details class="sim-more"><summary class="mono">Under the hood</summary><div class="sim-more-body">${def.more}</div></details>` +
            '</div>';
        const steps = $$('.sim-steps li', el);
        const out = $('.sim-out', el);
        const OUT_ICON = { ok: 'check', warn: 'alert', alert: 'alert' };
        return {
            $: (s) => $(s, el),
            $$: (s) => $$(s, el),
            step(i, state) { steps[i].className = state ? 'is-' + state : ''; },
            resetSteps() { steps.forEach((li) => { li.className = ''; }); },
            say(state, html) {
                out.className = 'sim-out' + (state ? ' is-' + state : '');
                out.innerHTML = (OUT_ICON[state] ? icon(OUT_ICON[state]) : '') + `<span>${html}</span>`;
            },
            busy() { this.say('busy', 'Working…'); },
            more(html) { $('.sim-more-body', el).innerHTML = html; },
            pick(id) { $$('.sim-chip', el).forEach((c) => c.classList.toggle('is-on', c.dataset.pick === id)); },
        };
    }

    function initSims() {
        $$('[data-sim]').forEach((el) => {
            const id = el.dataset.sim;
            const def = SIMS[id];
            if (!def) return;
            const ui = mountSim(el, def);
            const seq = sequence();
            const first = def.auto || def.picks[0].id;

            async function run(pick) {
                const { sleep } = seq.start();
                const walk = async (i, ms, end = 'done') => {
                    ui.step(i, 'on');
                    await sleep(ms);
                    ui.step(i, end);
                };
                ui.pick(pick);
                ui.resetSteps();
                try {
                    emitDone(id, await def.play({ ui, pick, sleep, walk }));
                } catch (e) { swallow(e); }
            }

            el.addEventListener('click', (e) => {
                const chip = e.target.closest('.sim-chip');
                if (chip) run(chip.dataset.pick);
            });
            // A host page can start a demo this way (the open-world "Start mission" buttons).
            el.addEventListener('sim:play', () => run(first));
            autoplay(el, () => run(first));
        });
    }

    /* ---------- boot ---------- */
    initNav();
    initSims();

    fitDisplayWords();
    if (document.fonts) document.fonts.ready.then(fitDisplayWords);

    const swarm = createSwarm();
    if (root.classList.contains('swarm-on')) swarm.start();

    const replayBtn = $('#replay');
    if (replayBtn) replayBtn.addEventListener('click', () => swarm.replay());

    const enableSmooth = () => setTimeout(() => root.classList.add('can-smooth'), 50);
    if (document.readyState === 'complete') enableSmooth();
    else addEventListener('load', enableSmooth, { once: true });
})();
