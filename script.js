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

    async function typeText(el, text, sleep, speed = 12) {
        const chars = Array.from(text);
        el.textContent = '';
        el.classList.add('caret');
        for (let i = 0; i < chars.length; i += 2) {
            el.textContent = chars.slice(0, i + 2).join('');
            await sleep(speed);
        }
        el.classList.remove('caret');
    }

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

    /* ---------- 5a. NL → SQL ---------- */
    const SQL_KW = /\b(SELECT|FROM|WHERE|AND|NOT|IN|GROUP BY|ORDER BY|COUNT|FILTER|AS|NOW|INTERVAL|IS|NULL|DATE_TRUNC|TO_CHAR|DESC)\b/g;
    function highlightSql(sql) {
        return escapeHtml(sql)
            .replace(/'[^']*'/g, (m) => `<span class="str">${m}</span>`)
            .replace(SQL_KW, '<span class="kw">$1</span>')
            .replace(/(?<![\w'])(\d+)(?![\w'])/g, '<span class="num">$1</span>');
    }

    function renderTable(cols, rows, more) {
        const head = cols.map((c, i) => `<th${i ? ' class="n"' : ''}>${c}</th>`).join('');
        const body = rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ''}>${typeof c === 'number' ? fmt(c) : c}</td>`).join('')}</tr>`).join('');
        return `<table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${more ? `<p class="tbl-more">${more}</p>` : ''}`;
    }

    function lineChart(labels, values) {
        const W = 320, H = 170, L = 34, R = 14, T = 18, B = 26;
        const max = Math.ceil(Math.max(...values) / 100) * 100;
        const min = Math.floor(Math.min(...values) / 100) * 100;
        const x = (i) => L + (i * (W - L - R)) / (values.length - 1);
        const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
        const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        const n = values.length - 1;
        const grid = [min, (min + max) / 2, max].map((v) =>
            `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(255,255,255,.07)"/>` +
            `<text x="${L - 6}" y="${y(v) + 3}" text-anchor="end" class="ax">${v}</text>`).join('');
        const xl = [0, Math.floor(n / 2), n].map((i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="ax">${labels[i]}</text>`).join('');
        const dots = values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === n ? 4 : 2.2}" fill="${i === n ? '#fff' : '#ff2a2a'}"/>`).join('');
        return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart of monthly submissions">${grid}${xl}` +
            `<polygon points="${L},${H - B} ${pts} ${x(n)},${H - B}" fill="rgba(255,42,42,.12)"/>` +
            `<polyline points="${pts}" fill="none" stroke="#ff2a2a" stroke-width="2"/>${dots}` +
            `<text x="${x(n) - 8}" y="${y(values[n]) - 8}" text-anchor="end" class="ax ax-strong">${values[n]}</text></svg>`;
    }

    function barChart(items) {
        const W = 320, L = 108, R = 46, T = 12, rowH = 36;
        const H = T * 2 + items.length * rowH;
        const max = Math.max(...items.map((i) => i.value));
        const rows = items.map((it, i) => {
            const y = T + i * rowH;
            const w = ((W - L - R) * it.value) / max;
            return `<text x="${L - 8}" y="${y + 16}" text-anchor="end" class="ax">${it.label}</text>` +
                `<rect x="${L}" y="${y + 5}" width="${w.toFixed(1)}" height="16" fill="${it.color}"/>` +
                `<text x="${(L + w + 6).toFixed(1)}" y="${y + 16.5}" class="ax ax-strong">${fmt(it.value)}</text>`;
        }).join('');
        return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart of applications by status">${rows}</svg>`;
    }

    function donutChart(items, centerLabel) {
        const total = items.reduce((s, i) => s + i.value, 0);
        let off = 0;
        const arcs = items.map((it) => {
            const p = (it.value / total) * 100;
            const arc = `<circle cx="80" cy="85" r="52" fill="none" stroke="${it.color}" stroke-width="22" pathLength="100" ` +
                `stroke-dasharray="${Math.max(p - 0.8, 0).toFixed(2)} ${(100 - p + 0.8).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 85)"/>`;
            off += p;
            return arc;
        }).join('');
        const legend = items.map((it, i) =>
            `<rect x="160" y="${50 + i * 26}" width="10" height="10" fill="${it.color}"/>` +
            `<text x="177" y="${59 + i * 26}" class="ax">${it.label} · ${fmt(it.value)}</text>`).join('');
        return `<svg viewBox="0 0 320 170" role="img" aria-label="Donut chart of applications">${arcs}` +
            `<text x="80" y="88" text-anchor="middle" class="ax ax-strong" style="font-size:17px">${fmt(total)}</text>` +
            `<text x="80" y="104" text-anchor="middle" class="ax">${centerLabel}</text>${legend}</svg>`;
    }

    const MONTHS = ['Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'];
    const TREND = [298, 310, 345, 372, 390, 412, 437, 455, 490, 512, 528, 561];
    const GREEN = '#3ddc84', AMBER = '#ffb020', RED = '#ff2a2a', CYAN = '#3ec5ff';

    const SQL_SCENARIOS = {
        trend: {
            sql: `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
  COUNT(*)::int AS submissions
FROM rts_citizen_applications
WHERE created_at >= NOW() - INTERVAL '12 months'
  AND status NOT IN ('deleted', 'started', 'draft')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY DATE_TRUNC('month', created_at);`,
            table: () => renderTable(['Month', 'Submissions'], MONTHS.slice(-6).map((m, i) => [m, TREND[6 + i]]), '+ 6 earlier rows'),
            rows: '12 rows',
            chart: () => lineChart(MONTHS, TREND),
            summary: 'Submissions grew steadily over the last 12 months, from 298 in Nov 2025 to a peak of 561 in Oct 2026 (+88%). Most of the growth came from Town Planning and Building Permission applications.',
        },
        status: {
            sql: `SELECT status,
  COUNT(*)::int AS applications
FROM rts_citizen_applications
WHERE deleted_at IS NULL
  AND status NOT IN ('deleted', 'started', 'draft')
GROUP BY status
ORDER BY applications DESC;`,
            table: () => renderTable(['Status', 'Applications'], [
                ['<span style="color:#3ddc84">Approved</span>', 3142],
                ['<span style="color:#3ec5ff">Under review</span>', 612],
                ['<span style="color:#ff2a2a">Rejected</span>', 280],
                ['<span style="color:#ffb020">Payment pending</span>', 242],
            ]),
            rows: '4 rows',
            chart: () => barChart([
                { label: 'Approved', value: 3142, color: GREEN },
                { label: 'Under review', value: 612, color: CYAN },
                { label: 'Rejected', value: 280, color: RED },
                { label: 'Payment pending', value: 242, color: AMBER },
            ]),
            summary: 'Of 4,276 applications, 3,142 are approved (73.5%), 612 are under desk review, 280 were rejected (mostly for incomplete documents) and 242 are waiting on payment.',
        },
        marathi: {
            sql: `SELECT COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
  COUNT(*) FILTER (WHERE status IN ('under_review', 'payment_pending'))::int AS pending,
  COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
FROM rts_citizen_applications
WHERE deleted_at IS NULL
  AND status NOT IN ('deleted', 'started', 'draft');`,
            table: () => renderTable(['वर्ग · Category', 'अर्ज'], [
                ['<span style="color:#3ddc84">मंजूर · Approved</span>', 3142],
                ['<span style="color:#ffb020">प्रलंबित · Pending</span>', 854],
                ['<span style="color:#ff2a2a">नामंजूर · Rejected</span>', 280],
            ]),
            rows: '1 row · pivoted',
            chart: () => donutChart([
                { label: 'Approved', value: 3142, color: GREEN },
                { label: 'Pending', value: 854, color: AMBER },
                { label: 'Rejected', value: 280, color: RED },
            ], 'एकूण अर्ज'),
            summary: 'PMRDA प्रणाली सुरू झाल्यापासून आजपर्यंत एकूण 4,276 नागरिक अर्ज प्राप्त झाले आहेत. त्यापैकी 3,142 अर्ज मंजूर (73.5%), 854 अर्ज विविध टप्प्यांवर प्रलंबित (20%), तर 280 अर्ज नामंजूर करण्यात आले आहेत.',
        },
    };

    function initSql() {
        const form = $('#sql-form');
        if (!form) return;
        const input = $('#sql-input');
        const idle = $('#sql-idle');
        const prog = $('#sql-progress');
        const step = $('#sql-step');
        const bar = $('#sql-bar');
        const results = $('#sql-results');
        const presets = $$('[data-sql]').map((b) => b.dataset.sql);
        const seq = sequence();

        async function run(q) {
            const { sleep } = seq.start();
            try {
                input.value = q;
                const isMr = /[\u0900-\u097F]/.test(q);
                const key = isMr ? 'marathi' : /status|group|breakdown|approved|rejected|pending/i.test(q) ? 'status' : 'trend';
                const sc = SQL_SCENARIOS[key];
                const steps = [['Resolving user context · Town Planner · attaching RLS policy', 18, 450]];
                if (!presets.includes(q)) steps.push(['Simulation: mapping your question to the closest sample query', 28, 650]);
                if (isMr) steps.push(['Detected Marathi · will answer in Marathi', 32, 450]);
                steps.push(
                    ['Inspecting live schema · 38 tables (bak_* snapshots excluded)', 48, 550],
                    ['Retrieving similar question → SQL pairs from agent memory', 68, 500],
                    ['Generating PostgreSQL 16 · validating read-only', 86, 550],
                    ['Executed in 142 ms · streaming rows, chart and summary', 100, 350],
                );

                idle.hidden = true;
                results.hidden = true;
                prog.hidden = false;
                bar.style.width = '4%';
                for (const [txt, pct, ms] of steps) {
                    step.textContent = txt;
                    bar.style.width = pct + '%';
                    await sleep(ms);
                }
                prog.hidden = true;
                $('#sql-code').innerHTML = highlightSql(sc.sql);
                $('#sql-table').innerHTML = sc.table();
                $('#sql-rows').textContent = sc.rows;
                $('#sql-chart').innerHTML = sc.chart();
                const summary = $('#sql-summary');
                summary.textContent = '';
                results.hidden = false;
                await typeText(summary, sc.summary, sleep, 12);
                emitDone('sql', `${sc.rows} · executed in 142 ms`);
            } catch (e) { swallow(e); }
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            run(input.value.trim() || presets[0]);
        });
        $$('[data-sql]').forEach((b) => b.addEventListener('click', () => run(b.dataset.sql)));
        autoplay(form.closest('.demo'), () => run(presets[0]));
    }

    /* ---------- 5b. RAG / DMS ---------- */
    const POLICY_FACTS = [
        { src: 'HR_Policy_2026.pdf · p.14', score: 0.93, text: 'Contract staff accrue 1.5 days of paid leave per completed month of service.' },
        { src: 'Contract_Staff_Handbook.docx · §4.2', score: 0.88, text: 'Unused leave lapses when the contract ends and cannot be encashed.' },
        { src: 'HR_Circular_2026-07.pdf', score: 0.81, text: 'Leave requests are approved by the reporting officer through the DMS portal.' },
    ];
    const RAG_SCENARIOS = {
        revenue: {
            matches: [17, 58, 93],
            facts: [
                { src: 'Q3_Financial_Report.pdf · p.4', score: 0.91, text: 'Q3 revenue closed at $4.2M, up 15% on Q2.' },
                { src: 'Enterprise_Sales_Q3.xlsx · Summary', score: 0.87, text: 'Software licences contributed 75% of Q3 revenue.' },
                { src: 'Board_Update_Oct.pptx · slide 6', score: 0.79, text: 'Growth was driven by three enterprise contracts signed in August.' },
            ],
            answer: 'Q3 revenue was $4.2M, a 15% increase over Q2 [1]. Software licences made up 75% of it [2], helped by three enterprise contracts signed in August [3].',
        },
        policy: {
            matches: [9, 46, 101],
            facts: POLICY_FACTS,
            answer: 'Contract staff earn 1.5 days of paid leave per month of service [1]. Unused leave lapses at the end of the contract and cannot be encashed [2]; requests go to the reporting officer through the DMS portal [3].',
        },
        marathi: {
            expandTo: 'leave policy for contract staff',
            matches: [9, 46, 101],
            facts: POLICY_FACTS,
            answer: 'कंत्राटी कर्मचाऱ्यांना सेवेच्या प्रत्येक पूर्ण महिन्यासाठी 1.5 दिवसांची पगारी रजा मिळते [1]. करार संपल्यानंतर न वापरलेली रजा रद्द होते आणि तिचे रोखीकरण करता येत नाही [2]; रजेचे अर्ज DMS पोर्टलद्वारे रिपोर्टिंग अधिकाऱ्यांकडून मंजूर केले जातात [3].',
        },
        fallback: {
            hyde: true,
            withheld: true,
            low: 0.41,
            matches: [33, 70],
            facts: [
                { src: 'Board_Minutes_2026_Q2.pdf · p.2', score: 0.52, text: 'Agenda item 4 was deferred to the next meeting.' },
                { src: 'Vendor_Onboarding_SOP.docx · §2', score: 0.47, text: 'New vendors submit KYC documents through the procurement desk.' },
            ],
            answer: 'No document in this tenant answers that with enough confidence (best match 0.52 after HyDE). Rather than guess, the engine returns the closest sources for a person to check.',
        },
    };

    function initRag() {
        const form = $('#rag-form');
        if (!form) return;
        const input = $('#rag-input');
        const grid = $('#rag-grid');
        const scan = $('#rag-scan');
        const scanline = $('.scanline', scan);
        const title = $('#rag-scan-title');
        const results = $('#rag-results');
        const facts = $('#rag-facts');
        const answer = $('#rag-answer');
        const answerHead = $('#rag-answer-head');
        const steps = new Map($$('#rag-steps li').map((li) => [li.dataset.step, li]));
        const seq = sequence();
        let flicker = 0;

        grid.innerHTML = '<i></i>'.repeat(120);
        const nodes = [...grid.children];

        const setStep = (name, state) => {
            const li = steps.get(name);
            li.className = state ? 'is-' + state : '';
        };
        const stopFlicker = () => { clearInterval(flicker); flicker = 0; };

        async function run(q) {
            const { sleep } = seq.start();
            stopFlicker();
            try {
                input.value = q;
                const sc = /[\u0900-\u097F]/.test(q) ? RAG_SCENARIOS.marathi
                    : /revenue|q3|sales|growth/i.test(q) ? RAG_SCENARIOS.revenue
                        : /leave|policy|holiday|contract/i.test(q) ? RAG_SCENARIOS.policy
                            : RAG_SCENARIOS.fallback;

                steps.forEach((li) => { li.className = ''; });
                nodes.forEach((n) => { n.className = ''; });
                results.hidden = true;
                facts.innerHTML = '';
                answer.textContent = '';
                scan.classList.add('is-scanning');
                scanline.hidden = false;

                setStep('embed', 'on');
                title.textContent = 'embedding query · 1024-d';
                await sleep(450);
                setStep('embed', 'done');

                if (sc.expandTo) {
                    setStep('expand', 'on');
                    title.textContent = `query expansion · mr → en: "${sc.expandTo}"`;
                    await sleep(800);
                    setStep('expand', 'done');
                } else {
                    setStep('expand', 'skip');
                }

                setStep('hybrid', 'on');
                title.textContent = 'hybrid search · BM25 + cosine over 1,024 chunks';
                flicker = setInterval(() => {
                    const n = nodes[(Math.random() * nodes.length) | 0];
                    n.classList.add('hit');
                    setTimeout(() => n.classList.remove('hit'), 260);
                }, 30);
                await sleep(1400);

                if (sc.hyde) {
                    setStep('hybrid', 'warn');
                    setStep('hyde', 'on');
                    title.textContent = `top similarity ${sc.low} < 0.60 · HyDE: drafting a hypothetical answer to search with`;
                    await sleep(1300);
                    setStep('hyde', 'warn');
                } else {
                    setStep('hybrid', 'done');
                    setStep('hyde', 'skip');
                }

                stopFlicker();
                nodes.forEach((n) => n.classList.remove('hit'));
                sc.matches.forEach((i) => nodes[i].classList.add('match'));
                setStep('rerank', 'on');
                title.textContent = 'cross-encoder rerank · keeping top results';
                await sleep(600);
                setStep('rerank', 'done');

                scanline.hidden = true;
                scan.classList.remove('is-scanning');
                title.textContent = `pgvector index · 1,024 chunks · ${sc.facts.length} retrieved`;
                $('#rag-k').textContent = `top-${sc.facts.length}`;
                answerHead.textContent = sc.withheld ? 'Answer withheld · low confidence' : 'Grounded answer';
                results.hidden = false;
                for (const [i, f] of sc.facts.entries()) {
                    const li = document.createElement('li');
                    li.innerHTML = `<div class="src"><span>[${i + 1}] ${f.src}</span><span class="score">${f.score.toFixed(2)}</span></div>${f.text}`;
                    facts.appendChild(li);
                    await sleep(240);
                }

                setStep('answer', 'on');
                await typeText(answer, sc.answer, sleep, 12);
                setStep('answer', sc.withheld ? 'warn' : 'done');
                emitDone('rag', `${sc.facts.length} chunks · ${sc.withheld ? 'answer withheld' : 'grounded answer'}`);
            } catch (e) {
                stopFlicker();
                swallow(e);
            }
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            run(input.value.trim() || 'What is our Q3 revenue?');
        });
        $$('[data-rag]').forEach((b) => b.addEventListener('click', () => run(b.dataset.rag)));
        autoplay(form.closest('.demo'), () => run('What is our Q3 revenue?'));
    }

    /* ---------- 5c. Project Iris ---------- */
    function initIris() {
        const feed = $('#iris-feed');
        if (!feed) return;
        const people = $$('.person', feed);
        const dark = $('#iris-dark');
        const occ = $('#iris-occ');
        const light = $('#iris-light');
        const hvac = $('#iris-hvac');
        const fps = $('#iris-fps');
        const log = $('#iris-log');
        const btn = $('#iris-toggle');
        const seq = sequence();
        let running = false;

        // [left %, bottom %] per stage; null = off camera
        const STAGES = {
            enter: [[20, 12], [33, 20], null, null],
            full: [[40, 34], [22, 44], [66, 14], [82, 26]],
            roam: [[14, 40], [42, 22], [62, 48], [78, 34]],
            half: [[20, 12], [33, 20], null, null],
            empty: [null, null, null, null],
        };
        const place = (stage) => people.forEach((p, i) => {
            const pos = STAGES[stage][i];
            p.style.left = (pos ? pos[0] : (i % 2 ? 70 : 30)) + '%';
            p.style.bottom = (pos ? pos[1] : -40) + '%';
        });
        const set = (o, l, lColor, h, room, msg) => {
            occ.textContent = o;
            light.textContent = l;
            light.style.color = lColor;
            hvac.textContent = h;
            dark.className = 'cctv-dark' + (room ? ' ' + room : '');
            if (msg) log.innerHTML = msg;
        };
        const reset = () => {
            place('empty');
            set('0', 'OFF', '', 'Standby', '', '› relay bus idle · waiting for camera stream');
            fps.textContent = 'idle';
        };

        async function loop() {
            const { sleep } = seq.start();
            let reported = false;
            try {
                fps.textContent = '24 fps · 1.0 s';
                for (; ;) {
                    place('empty');
                    set('0', 'OFF', '', 'Standby', '', '› stream live · room empty');
                    await sleep(1200);
                    place('enter');
                    set('2', '50% · A', 'var(--amber)', 'Cool A', 'dim', '› 2 persons in Zone A → relay CH1 <span class="ok">ON</span> · lights 50% · HVAC zone A 24°C');
                    await sleep(4200);
                    place('full');
                    set('4', '100%', 'var(--green)', 'Cool A+B', 'bright', '› 4 persons across A+B → relays CH1+CH2 <span class="ok">ON</span> · lights 100%');
                    if (!reported) { reported = true; emitDone('iris', '4 occupants · lights 100%'); }
                    await sleep(3800);
                    place('roam');
                    await sleep(3400);
                    place('half');
                    set('2', '50% · A', 'var(--amber)', 'Cool A', 'dim', '› Zone B empty → relay CH2 <span class="warn">OFF</span> · HVAC zone B standby');
                    await sleep(4000);
                    place('empty');
                    set('0', 'OFF', '', 'Standby', '', '› room empty → all relays <span class="warn">OFF</span> · energy saved');
                    await sleep(2600);
                }
            } catch (e) { swallow(e); }
        }

        let userStopped = false;
        const start = () => {
            if (running) return;
            running = true;
            btn.textContent = 'Stop feed';
            loop();
        };
        const stop = () => {
            if (!running) return;
            running = false;
            btn.textContent = 'Start feed';
            seq.cancel();
            reset();
        };
        btn.addEventListener('click', () => {
            userStopped = running;
            if (running) stop(); else start();
        });
        reset();
        // The feed runs while it is on screen and pauses when scrolled away.
        autoplay(feed.closest('.demo'), () => { if (!userStopped) start(); }, stop);
    }

    /* ---------- 5d. Pothole ---------- */
    function initPothole() {
        const view = $('#ph-view');
        if (!view) return;
        const scan = $('#ph-scan');
        const bbox = $('#ph-bbox');
        const status = $('#ph-status');
        const pin = $('#ph-pin');
        const log = $('#ph-log');
        const seq = sequence();

        async function run(real) {
            const { sleep } = seq.start();
            try {
                $('#ph-empty').hidden = true;
                view.className = 'ph-view ' + (real ? 'road-real' : 'road-clean');
                bbox.hidden = true;
                pin.hidden = true;
                status.textContent = 'Scanning…';
                status.style.color = 'var(--cyan)';
                log.textContent = '› Photo received · GPS 18.6298° N, 73.8397° E · running YOLO on-device…';
                restartAnim(scan);
                await sleep(1450);
                scan.hidden = true;
                if (real) {
                    bbox.hidden = false;
                    status.textContent = 'Pothole 0.98';
                    status.style.color = 'var(--red)';
                    log.innerHTML = '› YOLO: pothole (0.98) · Gemini: deep, lane-blocking · <span class="err">severity 7.8/10</span>';
                    await sleep(1400);
                    pin.hidden = false;
                    log.innerHTML = '› Work order WO-2291 raised for MIDC road maintenance<br><span class="ok">✓ dashboard updated</span>';
                    emitDone('pothole', 'severity 7.8/10 · work order raised');
                } else {
                    status.textContent = 'No defect';
                    status.style.color = 'var(--green)';
                    log.innerHTML = '› YOLO: no defect · Gemini confirms clean road<br><span class="ok">✓ report discarded, no officer time spent</span>';
                    emitDone('pothole', 'clean road · report discarded');
                }
            } catch (e) { swallow(e); }
        }

        $('#ph-real').addEventListener('click', () => run(true));
        $('#ph-clean').addEventListener('click', () => run(false));
        autoplay(view.closest('.demo'), () => run(true));
    }

    /* ---------- 5e. Intent engine ---------- */
    const INVEST = /\b(invest\w*|crores?|cr|lakhs?|capital|plant|factory|expan\w*|acres?|allotment|proposal)\b/i;

    function initIntent() {
        const form = $('#intent-form');
        if (!form) return;
        const input = $('#intent-input');
        const log = $('#intent-log');
        const label = $('#intent-label');
        const state = $('#router-state');
        const n = { user: $('#n-user'), router: $('#n-router'), faq: $('#n-faq'), off: $('#n-off') };
        const f = { in: $('#f-in'), faq: $('#f-faq'), off: $('#f-off') };
        const seq = sequence();

        const clear = () => {
            Object.values(n).forEach((g) => g.classList.remove('on-blue', 'on-green', 'on-red'));
            Object.values(f).forEach((p) => p.classList.remove('is-on'));
            label.textContent = '';
            state.textContent = 'idle';
        };

        async function route(msg) {
            const { sleep } = seq.start();
            try {
                clear();
                msg = msg.trim() || 'Hello';
                input.value = msg;
                const shown = msg.length > 64 ? msg.slice(0, 64) + '…' : msg;
                log.innerHTML = `› received: "${escapeHtml(shown)}"`;
                n.user.classList.add('on-blue');
                f.in.classList.add('is-on');
                await sleep(700);

                n.router.classList.add('on-blue');
                state.textContent = 'embedding…';
                label.style.fill = 'var(--cyan)';
                label.textContent = 'tokenize → embed → pgvector kNN';
                await sleep(1000);

                const invest = INVEST.test(msg);
                f.in.classList.remove('is-on');
                n.user.classList.remove('on-blue');
                n.router.classList.remove('on-blue');
                if (invest) {
                    n.router.classList.add('on-red');
                    state.textContent = 'investment';
                    label.style.fill = 'var(--red)';
                    label.textContent = 'intent: investment · 0.97';
                    f.off.classList.add('is-on');
                    await sleep(850);
                    n.off.classList.add('on-red');
                    log.innerHTML = '› <span class="err">ESCALATED</span> to MIDC investment desk · priority HIGH · ticket INV-2026-0412';
                    emitDone('intent', 'investment → officer escalation');
                } else {
                    n.router.classList.add('on-green');
                    state.textContent = 'faq';
                    label.style.fill = 'var(--green)';
                    label.textContent = 'intent: general FAQ · 0.88';
                    f.faq.classList.add('is-on');
                    await sleep(850);
                    n.faq.classList.add('on-green');
                    log.innerHTML = '› <span class="ok">AUTO-ANSWERED</span> from the FAQ knowledge base · 3 sources cited';
                    emitDone('intent', 'FAQ → auto-answered');
                }
            } catch (e) { swallow(e); }
        }

        form.addEventListener('submit', (e) => { e.preventDefault(); route(input.value); });
        $$('[data-intent]').forEach((b) => b.addEventListener('click', () => route(b.dataset.intent)));
        const proposal = $('[data-intent*="crore"]');
        autoplay(form.closest('.demo'), () => route(proposal ? proposal.dataset.intent : 'I want to invest 5 crore'));
    }

    /* ---------- 5f. Reconciler ---------- */
    function initRecon() {
        const btn = $('#recon-run');
        if (!btn) return;
        const scan = $('#recon-scan');
        const exts = $$('.receipt .ext');
        const tx = [$('#tx-1'), $('#tx-2'), $('#tx-3')];
        const log = $('#recon-log');
        const seq = sequence();

        async function run() {
            const { sleep } = seq.start();
            try {
                exts.forEach((e) => e.classList.remove('is-on'));
                tx.forEach((t) => t.classList.remove('is-scan', 'is-match'));
                log.textContent = '› Gemini Nano (AICore) reading the receipt on-device…';
                restartAnim(scan);
                await sleep(1650);
                scan.hidden = true;
                for (const e of exts) {
                    e.classList.add('is-on');
                    await sleep(220);
                }
                log.textContent = '› Extracted { merchant: "STARBUCKS COFFEE", date: 21-Aug-2026, total: 12.50 }';
                await sleep(1000);

                log.textContent = '› Tier 1 · exact amount 12.50';
                for (const t of [tx[0], tx[2], tx[1]]) {
                    t.classList.add('is-scan');
                    await sleep(380);
                    if (t !== tx[1]) t.classList.remove('is-scan');
                }
                log.textContent = '› Tier 1 ✓ 1 candidate · Tier 2 · time window 09:14 → 09:16 (Δ 2 min) ✓';
                await sleep(900);
                log.textContent = '› Tier 3 · fuzzy merchant "STARBUCKS COFFEE" ≈ "Starbucks Coffee" (0.96) ✓';
                await sleep(900);
                tx[1].classList.remove('is-scan');
                tx[1].classList.add('is-match');
                log.innerHTML = '› <span class="ok">Reconciled</span> · transaction marked verified';
                emitDone('recon', 'merchant match 0.96 · reconciled');
            } catch (e) { swallow(e); }
        }

        btn.addEventListener('click', run);
        autoplay(btn.closest('.demo'), run);
    }

    /* ---------- boot ---------- */
    initNav();
    initSql();
    initRag();
    initIris();
    initPothole();
    initIntent();
    initRecon();

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
