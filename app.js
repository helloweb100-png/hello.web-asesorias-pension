/* ==========================================================================
   PENSIÓN PLENA - app.js
   Módulos: preloader, navegación, revelado, motor de scroll (escenas),
   escena 3D, partículas, interacciones y formulario a WhatsApp.
   Sin dependencias. Respeta prefers-reduced-motion.
   ========================================================================== */
(() => {
    'use strict';

    /* ---------- Configuración ---------- */
    const WA_NUMBER = '525648220851';           // 56 4822 0851 (México)
    const BRAND = 'Pensión Plena';              // Reemplazar con el nombre real del cliente

    /* ---------- Utilidades ---------- */
    const root = document.documentElement;
    const body = document.body;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const waUrl = (text) => `https://wa.me/${WA_NUMBER}` + (text ? `?text=${encodeURIComponent(text)}` : '');

    root.classList.add('js');

    /* ---------- Bucle maestro (un solo requestAnimationFrame) ---------- */
    const tasks = [];
    (function frame(t) {
        if (!document.hidden) for (let i = 0; i < tasks.length; i++) tasks[i](t);
        requestAnimationFrame(frame);
    })(0);

    /* ======================================================================
       1. Preloader
       ====================================================================== */
    function initLoader() {
        const loader = $('#loader');
        const bar = $('#loader-bar');
        const pct = $('#loader-pct');
        const msg = $('#loader-msg');
        if (!loader) { body.classList.add('is-ready'); body.classList.remove('is-loading'); return; }

        const messages = ['Preparando tu asesoría', 'Reuniendo la información', 'Todo listo para ti'];
        const minTime = reduce ? 350 : 2000;
        const start = performance.now();
        let shown = 0, assetsReady = false, finished = false;

        const heroImg = $('.arch img');
        const imgReady = !heroImg || heroImg.complete
            ? Promise.resolve()
            : new Promise((res) => { heroImg.addEventListener('load', res, { once: true }); heroImg.addEventListener('error', res, { once: true }); });
        const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        Promise.all([imgReady, fontsReady]).then(() => { assetsReady = true; });
        setTimeout(() => { assetsReady = true; }, 4500);   // tope de seguridad

        function finish() {
            if (finished) return;
            finished = true;
            loader.classList.add('is-done');
            body.classList.remove('is-loading');
            setTimeout(() => body.classList.add('is-ready'), reduce ? 0 : 380);
            setTimeout(() => loader.classList.add('is-gone'), reduce ? 0 : 1300);
        }

        function step(now) {
            const t = now - start;
            let target = Math.min(92, (t / minTime) * 92);
            if (assetsReady && t >= minTime) target = 100;
            shown = lerp(shown, target, 0.09);
            if (target === 100 && shown > 99.4) shown = 100;
            const v = Math.round(shown);
            pct.textContent = v + '%';
            bar.style.transform = `scaleX(${(shown / 100).toFixed(4)})`;
            msg.textContent = messages[v < 38 ? 0 : v < 80 ? 1 : 2];
            if (shown >= 100) { setTimeout(finish, 260); return; }
            requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ======================================================================
       2. Enlaces de WhatsApp, año, aviso de privacidad
       ====================================================================== */
    function initLinks() {
        $$('[data-wa]').forEach((a) => {
            a.href = waUrl(a.dataset.wa);
            a.target = '_blank';
            a.rel = 'noopener';
        });
        const year = $('#year');
        if (year) year.textContent = new Date().getFullYear();

        const dlg = $('#privacy');
        if (dlg && typeof dlg.showModal === 'function') {
            $$('[data-open-privacy]').forEach((b) => b.addEventListener('click', () => dlg.showModal()));
            dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
        } else {
            $$('[data-open-privacy]').forEach((b) => { b.hidden = true; });
        }
    }

    /* ======================================================================
       3. Navegación: estado con scroll y menú móvil
       ====================================================================== */
    function initNav() {
        const nav = $('#nav');
        const burger = $('#burger');
        const menu = $('#menu');

        // Centinela superior: evita escuchar el evento scroll
        const sentinel = document.createElement('div');
        sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:40px;pointer-events:none';
        body.prepend(sentinel);
        new IntersectionObserver(([e]) => nav.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);

        if (!burger || !menu) return;
        const links = $$('a', menu);
        const setOpen = (open) => {
            body.classList.toggle('menu-open', open);
            body.style.overflow = open ? 'hidden' : '';
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            menu.setAttribute('aria-hidden', String(!open));
            if (open && links[0]) setTimeout(() => links[0].focus({ preventScroll: true }), 350);
        };
        burger.addEventListener('click', () => setOpen(!body.classList.contains('menu-open')));
        links.forEach((l) => l.addEventListener('click', () => setOpen(false)));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && body.classList.contains('menu-open')) { setOpen(false); burger.focus(); } });
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches) setOpen(false); });
    }

    /* ======================================================================
       4. Revelado al entrar en pantalla + titulares por palabras
       ====================================================================== */
    function initReveal() {
        $$('[data-split]').forEach((h) => {
            const text = h.textContent.trim().replace(/\s+/g, ' ');
            h.setAttribute('aria-label', text);
            h.textContent = '';
            text.split(' ').forEach((word, i, arr) => {
                const mask = document.createElement('span');
                mask.className = 'sw';
                mask.setAttribute('aria-hidden', 'true');
                const inner = document.createElement('span');
                inner.className = 'sw__i';
                inner.style.setProperty('--wi', i);
                inner.textContent = word;
                mask.appendChild(inner);
                h.appendChild(mask);
                if (i < arr.length - 1) h.appendChild(document.createTextNode(' '));
            });
        });

        const targets = $$('[data-reveal], [data-split]');
        if (reduce || !('IntersectionObserver' in window)) { targets.forEach((t) => t.classList.add('is-in')); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
        }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
        targets.forEach((t) => io.observe(t));
    }

    /* ======================================================================
       5. Motor de scroll: escenas con progreso suavizado (inercia)
          Un solo bucle, sin addEventListener('scroll'); solo se actualizan
          las escenas visibles y solo se escribe lo que cambia.
       ====================================================================== */
    const S = { y: window.scrollY, sy: window.scrollY, last: window.scrollY, vh: window.innerHeight, vw: window.innerWidth, docH: 1, vel: 0 };
    const scenes = [];
    const sceneIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => { e.target.__scene.on = e.isIntersecting; });
    }, { rootMargin: '30% 0px 30% 0px' });

    function addScene(el, update, measure) {
        if (!el) return null;
        const scene = { el, update, measure, on: false, top: 0, h: 0 };
        el.__scene = scene;
        scenes.push(scene);
        sceneIO.observe(el);
        return scene;
    }

    function measureAll() {
        S.vh = window.innerHeight;
        S.vw = window.innerWidth;
        S.docH = Math.max(1, document.documentElement.scrollHeight);
        scenes.forEach((s) => {
            const r = s.el.getBoundingClientRect();
            s.top = r.top + window.scrollY;
            s.h = r.height;
            if (s.measure) s.measure(s);
        });
    }

    function initEngine() {
        const bar = $('#progress-bar');
        const marqueeTrack = $('[data-marquee]');
        let marqueeAnim = null;
        let lastBar = -1;

        tasks.push(() => {
            S.y = window.scrollY;
            const d = S.y - S.sy;
            S.sy = Math.abs(d) < 0.08 || reduce ? S.y : S.sy + d * 0.13;
            S.vel = lerp(S.vel, S.y - S.last, 0.2);
            S.last = S.y;

            // Barra de progreso de lectura
            const p = clamp(S.sy / Math.max(1, S.docH - S.vh));
            if (Math.abs(p - lastBar) > 0.0005) { bar.style.transform = `scaleX(${p.toFixed(4)})`; lastBar = p; }

            // El marquee acelera con la velocidad del scroll
            if (marqueeTrack && !reduce) {
                if (!marqueeAnim) marqueeAnim = marqueeTrack.getAnimations()[0] || null;
                if (marqueeAnim) marqueeAnim.playbackRate = 1 + clamp(Math.abs(S.vel) / 10, 0, 4.5);
            }

            for (let i = 0; i < scenes.length; i++) {
                const s = scenes[i];
                if (s.on || s.force) s.update(s, S);
            }
        });

        window.addEventListener('resize', debounce(measureAll, 150));
        window.addEventListener('load', () => { measureAll(); scenes.forEach((s) => { s.force = true; }); setTimeout(() => scenes.forEach((s) => { s.force = false; }), 300); });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
        if ('ResizeObserver' in window) new ResizeObserver(debounce(measureAll, 120)).observe(body);
    }

    function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

    /* ---------- Escena: parallax de salida del hero ---------- */
    function sceneHero() {
        const hero = $('.hero');
        const inner = $('.hero__inner');
        if (!hero || reduce) return;
        addScene(hero, (s, st) => {
            const y = clamp(st.sy / s.h);
            inner.style.translate = `0 ${(y * 70).toFixed(1)}px`;
            inner.style.opacity = (1 - y * 0.85).toFixed(3);
        });
    }

    /* ---------- Escena: manifiesto, palabras que se encienden ---------- */
    function sceneManifesto() {
        const text = $('.manifesto__text');
        if (!text) return;
        const raw = text.textContent.trim().replace(/\s+/g, ' ');
        text.setAttribute('aria-label', raw);
        text.textContent = '';
        const words = raw.split(' ').map((w, i, arr) => {
            const span = document.createElement('span');
            span.className = 'w';
            span.setAttribute('aria-hidden', 'true');
            span.textContent = w;
            text.appendChild(span);
            if (i < arr.length - 1) text.appendChild(document.createTextNode(' '));
            return span;
        });
        if (reduce) { words.forEach((w) => w.classList.add('on')); return; }
        let lit = -1;
        const sc = addScene(text, (s, st) => {
            const p = clamp((st.sy + st.vh * 0.82 - s.top) / (s.h + st.vh * 0.22));
            const n = Math.round(p * words.length * 1.03);
            if (n !== lit) { words.forEach((w, i) => w.classList.toggle('on', i < n)); lit = n; }
        });
        if (sc) sc.force = true;
    }

    /* ---------- Escena: imagen que se expande ---------- */
    function sceneExpand() {
        const ex = $('[data-expand]');
        if (!ex) return;
        if (reduce) return;   // el CSS ya muestra el estado final
        const set = (k, v) => ex.style.setProperty(k, v);
        const sc = addScene(ex, (s, st) => {
            const p = clamp((st.sy - s.top) / Math.max(1, s.h - st.vh));
            const k = clamp(p / 0.68);
            const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // easeInOutCubic: el crecimiento acompaña al scroll
            const mobile = st.vw < 768;
            const x0 = mobile ? 9 : 29;
            const y0 = mobile ? 21 : 17;
            set('--cx', (x0 * (1 - e)).toFixed(2) + '%');
            set('--cy', (y0 * (1 - e)).toFixed(2) + '%');
            set('--cr', (40 * (1 - e)).toFixed(1) + 'px');
            set('--is', (1.28 - 0.28 * e).toFixed(4));
            set('--wo', clamp(p / 0.48).toFixed(3));
            const o = clamp((p - 0.5) / 0.24);
            set('--so', clamp((p - 0.4) / 0.3).toFixed(3));
            set('--oo', o.toFixed(3));
            set('--oy', ((1 - o) * 44).toFixed(1) + 'px');
            ex.classList.toggle('is-live', p > 0.62);
        });
        if (sc) sc.force = true;
    }

    /* ---------- Escena: tarjetas de servicios apiladas ---------- */
    function sceneStack() {
        const stack = $('[data-stack]');
        const cards = $$('[data-stack-card]');
        if (!stack || cards.length < 2 || reduce) return;
        const mq = window.matchMedia('(min-width: 900px) and (min-height: 660px)');
        let stuck = [];
        const measureStuck = () => { stuck = cards.map((c) => parseFloat(getComputedStyle(c).top) || 0); };
        measureStuck();
        mq.addEventListener('change', measureStuck);
        window.addEventListener('resize', debounce(measureStuck, 150));

        addScene(stack, () => {
            if (!mq.matches) return;
            const rects = cards.map((c) => c.getBoundingClientRect());
            for (let i = 0; i < cards.length - 1; i++) {
                const start = stuck[i] + rects[i].height;
                const end = stuck[i + 1];
                const t = clamp((start - rects[i + 1].top) / Math.max(1, start - end));
                const svc = cards[i].firstElementChild;
                const sNew = (1 - t * 0.06).toFixed(4);
                if (svc.__s !== sNew) {
                    svc.style.setProperty('--s', sNew);
                    svc.style.setProperty('--b', (1 - t * 0.06).toFixed(4));
                    svc.__s = sNew;
                }
            }
        });
    }

    /* ---------- Escena: línea de tiempo del proceso ---------- */
    function sceneTimeline() {
        const tl = $('[data-timeline]');
        if (!tl) return;
        const steps = $$('[data-tl]', tl).map((el) => ({ el, y: 0 }));
        if (reduce) { tl.style.setProperty('--tp', 1); steps.forEach((s) => s.el.classList.add('is-active')); return; }
        let first = 0, last = 1;
        const sc = addScene(tl, (s, st) => {
            const line = st.sy + st.vh * 0.62;
            const p = clamp((line - first) / Math.max(1, last - first));
            tl.style.setProperty('--tp', p.toFixed(4));
            steps.forEach((x) => x.el.classList.toggle('is-active', line >= x.y - 10));
        }, () => {
            steps.forEach((x) => { const n = $('.tl__node', x.el).getBoundingClientRect(); x.y = n.top + window.scrollY + n.height / 2; });
            first = steps[0].y; last = steps[steps.length - 1].y;
            // La barra va del centro del primer nodo al centro del último
            tl.style.setProperty('--rt', (first - tl.__scene.top).toFixed(1) + 'px');
            tl.style.setProperty('--rb', (tl.__scene.top + tl.__scene.h - last).toFixed(1) + 'px');
        });
        if (sc) sc.force = true;
    }

    /* ---------- Escena: galería con parallax en columnas ---------- */
    function sceneGallery() {
        const g = $('[data-gallery]');
        if (!g || reduce) return;
        const cols = $$('[data-col]', g).map((el) => ({ el, dir: Number(el.dataset.col) }));
        addScene(g, (s, st) => {
            const p = clamp((st.sy + st.vh - s.top) / (s.h + st.vh));
            const amp = st.vw < 768 ? 54 : 130;
            cols.forEach((c) => c.el.style.setProperty('--py', ((0.5 - p) * 2 * amp * c.dir).toFixed(1) + 'px'));
        });
    }

    /* ======================================================================
       6. Escena 3D del hero + tarjetas con inclinación
       ====================================================================== */
    function initTilt() {
        if (reduce) return;
        const items = [];
        const stage = $('[data-stage]');
        if (stage) items.push({ el: stage, host: $('.hero'), max: 9, idle: [5, 3.5], ph: 0 });
        $$('[data-tilt]').forEach((el, i) => items.push({ el, host: el.parentElement, max: 20, idle: [7, 5], ph: i * 1.7 }));

        const vis = new IntersectionObserver((entries) => entries.forEach((e) => { e.target.__vis = e.isIntersecting; }));
        items.forEach((it) => {
            it.tx = 0; it.ty = 0; it.cx = 0; it.cy = 0; it.t = 0;
            it.host.__vis = true;
            vis.observe(it.host);
            if (finePointer) {
                it.host.addEventListener('pointermove', (e) => {
                    const r = it.host.getBoundingClientRect();
                    const px = (e.clientX - r.left) / r.width - 0.5;
                    const py = (e.clientY - r.top) / r.height - 0.5;
                    it.tx = px * 2 * it.max;
                    it.ty = -py * 2 * it.max;
                    it.t = performance.now();
                });
                it.host.addEventListener('pointerleave', () => { it.tx = 0; it.ty = 0; it.t = 0; });
            }
        });

        tasks.push((t) => {
            const now = performance.now();
            for (const it of items) {
                if (!it.host.__vis) continue;
                let tx = it.tx, ty = it.ty;
                if (!it.t || now - it.t > 2400) {
                    tx = Math.sin(t / 1900 + it.ph) * it.idle[0];
                    ty = Math.cos(t / 2400 + it.ph) * it.idle[1];
                }
                it.cx = lerp(it.cx, tx, 0.075);
                it.cy = lerp(it.cy, ty, 0.075);
                it.el.style.setProperty('--ry', it.cx.toFixed(2) + 'deg');
                it.el.style.setProperty('--rx', it.cy.toFixed(2) + 'deg');
            }
        });
    }

    /* Monedas 3D construidas con capas (grosor real al girar) */
    function initCoins() {
        $$('[data-coin]').forEach((coin) => {
            const frag = document.createDocumentFragment();
            for (let z = -4; z <= 4; z++) {
                const edge = document.createElement('i');
                edge.className = 'coin__edge';
                edge.style.transform = `translateZ(${z}px)`;
                frag.appendChild(edge);
            }
            const f = document.createElement('i');
            f.className = 'coin__face coin__face--f';
            f.textContent = '$';
            const b = document.createElement('i');
            b.className = 'coin__face coin__face--b';
            b.textContent = '$';
            frag.append(f, b);
            coin.appendChild(frag);
        });
    }

    /* ======================================================================
       7. Partículas: destellos dorados, esmeralda y cielo
       ====================================================================== */
    function initSparks() {
        const canvas = $('#sparks');
        if (!canvas || reduce) return;
        const ctx = canvas.getContext('2d');
        const hero = canvas.closest('.hero');
        const colors = [[244, 182, 63], [25, 195, 154], [92, 195, 240], [255, 226, 154]];
        const sprites = colors.map(([r, g, b]) => {
            const c = document.createElement('canvas');
            c.width = c.height = 64;
            const x = c.getContext('2d');
            const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
            gr.addColorStop(0, `rgba(${r},${g},${b},.9)`);
            gr.addColorStop(0.35, `rgba(${r},${g},${b},.28)`);
            gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
            x.fillStyle = gr;
            x.fillRect(0, 0, 64, 64);
            return c;
        });

        let w = 0, h = 0, visible = true;
        const P = [];
        const trail = [];
        const mouse = { x: -999, y: -999 };

        const spawn = (init) => ({
            x: Math.random() * w, y: init ? Math.random() * h : h + 24,
            r: 2 + Math.random() * 4.5, vy: 0.14 + Math.random() * 0.36, vx: (Math.random() - 0.5) * 0.16,
            ph: Math.random() * 6.28, tw: 0.0015 + Math.random() * 0.003,
            ci: Math.floor(Math.random() * colors.length), star: Math.random() < 0.62
        });

        function resize() {
            const r = hero.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = r.width; h = r.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = clamp(Math.round((w * h) / 17000), 18, 80);
            while (P.length < count) P.push(spawn(true));
            P.length = count;
        }
        resize();
        if ('ResizeObserver' in window) new ResizeObserver(debounce(resize, 150)).observe(hero);
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

        if (finePointer) {
            hero.addEventListener('pointermove', (e) => {
                const r = hero.getBoundingClientRect();
                mouse.x = e.clientX - r.left;
                mouse.y = e.clientY - r.top;
                if (trail.length < 40 && Math.random() < 0.45) {
                    trail.push({ x: mouse.x + (Math.random() - 0.5) * 12, y: mouse.y + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 0.7, vy: -0.2 - Math.random() * 0.6, r: 1.6 + Math.random() * 2.6, life: 1, ci: Math.random() < 0.6 ? 0 : 3 });
                }
            });
            hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
        }

        const star = (x, y, R) => {
            ctx.beginPath();
            ctx.moveTo(x, y - R);
            ctx.quadraticCurveTo(x, y, x + R, y);
            ctx.quadraticCurveTo(x, y, x, y + R);
            ctx.quadraticCurveTo(x, y, x - R, y);
            ctx.quadraticCurveTo(x, y, x, y - R);
            ctx.fill();
        };

        tasks.push((t) => {
            if (!visible) return;
            ctx.clearRect(0, 0, w, h);
            for (const p of P) {
                p.y -= p.vy;
                p.x += p.vx + Math.sin(t * 0.0004 + p.ph) * 0.14;
                const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
                if (d2 < 14400) { const d = Math.sqrt(d2) || 1; const f = (120 - d) / 120; p.x += (dx / d) * f * 2.4; p.y += (dy / d) * f * 2.4; }
                if (p.y < -24) Object.assign(p, spawn(false));
                if (p.x < -24) p.x = w + 24; else if (p.x > w + 24) p.x = -24;
                const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * p.tw * 6 + p.ph));
                ctx.globalAlpha = a * 0.85;
                ctx.drawImage(sprites[p.ci], p.x - p.r * 4, p.y - p.r * 4, p.r * 8, p.r * 8);
                const [r, g, b] = colors[p.ci];
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.globalAlpha = a;
                if (p.star) star(p.x, p.y, p.r * 1.9); else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.55, 0, 6.283); ctx.fill(); }
            }
            for (let i = trail.length - 1; i >= 0; i--) {
                const q = trail[i];
                q.x += q.vx; q.y += q.vy; q.life -= 0.022;
                if (q.life <= 0) { trail.splice(i, 1); continue; }
                ctx.globalAlpha = q.life * 0.9;
                ctx.drawImage(sprites[q.ci], q.x - q.r * 4, q.y - q.r * 4, q.r * 8, q.r * 8);
                const [r, g, b] = colors[q.ci];
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                star(q.x, q.y, q.r * 1.7 * q.life);
            }
            ctx.globalAlpha = 1;
        });
    }

    /* ======================================================================
       8. Interacciones: botones magnéticos, spotlight, rotador, marquee
       ====================================================================== */
    function initPointerFx() {
        if (finePointer && !reduce) {
            $$('[data-magnetic]').forEach((el) => {
                el.addEventListener('pointermove', (e) => {
                    const r = el.getBoundingClientRect();
                    const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
                    const y = (e.clientY - (r.top + r.height / 2)) * 0.32;
                    el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
                });
                el.addEventListener('pointerleave', () => { el.style.translate = ''; });
            });
        }
        $$('[data-spot]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
                el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
            });
        });
    }

    function initRotator() {
        const rot = $('[data-rotator]');
        if (!rot || reduce) return;
        const items = $$('span', rot);
        let i = 0;
        setInterval(() => {
            const cur = items[i];
            i = (i + 1) % items.length;
            const next = items[i];
            cur.classList.remove('is-on');
            cur.classList.add('is-out');
            next.classList.remove('is-out');
            next.classList.add('is-on');
            setTimeout(() => cur.classList.remove('is-out'), 700);
        }, 2800);
    }

    function initMarquee() {
        const track = $('[data-marquee]');
        if (!track) return;
        const list = $('.marquee__list', track);
        const clone = list.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
    }

    /* ---------- Contadores ---------- */
    function initCounters() {
        const els = $$('[data-count]');
        if (!els.length) return;
        const run = (el) => {
            const end = Number(el.dataset.count);
            if (reduce) { el.textContent = end.toLocaleString('es-MX'); return; }
            const dur = 1800;
            const t0 = performance.now();
            const tick = (now) => {
                const p = clamp((now - t0) / dur);
                el.textContent = Math.round(end * easeOut(p)).toLocaleString('es-MX');
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
        }, { threshold: 0.6 });
        els.forEach((el) => { el.textContent = '0'; io.observe(el); });
    }

    /* ======================================================================
       9. Componentes: acordeón y pestañas
       ====================================================================== */
    function initAccordion() {
        const acc = $('[data-accordion]');
        if (!acc) return;
        const items = $$('.acc__item', acc);
        items.forEach((item) => {
            const btn = $('.acc__btn', item);
            btn.addEventListener('click', () => {
                const open = !item.classList.contains('is-open');
                items.forEach((o) => {
                    o.classList.remove('is-open');
                    $('.acc__btn', o).setAttribute('aria-expanded', 'false');
                });
                if (open) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
            });
        });
    }

    function initTabs() {
        const wrap = $('[data-tabs]');
        if (!wrap) return;
        const tabs = $$('[role="tab"]', wrap);
        const panels = $$('[role="tabpanel"]', wrap);
        const select = (idx, focus) => {
            tabs.forEach((t, i) => {
                const on = i === idx;
                t.classList.toggle('is-active', on);
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
                panels[i].hidden = !on;
                panels[i].classList.toggle('is-active', on);
            });
            if (focus) tabs[idx].focus();
            // En móvil la fila de pestañas se desplaza: mantiene visible la elegida
            if (idx > 0 || focus) tabs[idx].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
        };
        tabs.forEach((t, i) => {
            t.addEventListener('click', () => select(i));
            t.addEventListener('keydown', (e) => {
                let n = null;
                if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
                if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
                if (e.key === 'Home') n = 0;
                if (e.key === 'End') n = tabs.length - 1;
                if (n !== null) { e.preventDefault(); select(n, true); }
            });
        });
        select(0);
    }

    /* ======================================================================
       10. Formulario: validación + mensaje prellenado a WhatsApp
       ====================================================================== */
    function burst(x, y) {
        if (reduce) return;
        for (let i = 0; i < 24; i++) {
            const c = document.createElement('i');
            c.className = 'burst-coin';
            c.style.left = x + 'px';
            c.style.top = y + 'px';
            document.body.appendChild(c);
            const ang = Math.random() * Math.PI * 2;
            const dist = 80 + Math.random() * 190;
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist - 90;
            const s = 0.6 + Math.random() * 0.9;
            c.animate([
                { transform: `translate(-50%,-50%) scale(${s})`, opacity: 1 },
                { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 240}px)) rotate(${Math.random() * 720}deg) scale(${s})`, opacity: 0 }
            ], { duration: 1100 + Math.random() * 800, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => c.remove();
        }
    }

    function initForm() {
        const form = $('#contact-form');
        if (!form) return;
        const f = {
            name: $('#f-name'), phone: $('#f-phone'), service: $('#f-service'), msg: $('#f-msg')
        };
        const err = { name: $('#e-name'), phone: $('#e-phone'), service: $('#e-service') };
        const ok = $('#form-ok');
        const retry = $('#form-retry');

        const setErr = (key, text) => {
            err[key].textContent = text;
            f[key].closest('.field').classList.toggle('has-error', Boolean(text));
            f[key].setAttribute('aria-invalid', text ? 'true' : 'false');
        };

        const validate = () => {
            let first = null;
            const name = f.name.value.trim();
            const digits = f.phone.value.replace(/\D/g, '');
            const phoneOk = digits.length === 10 || (digits.length === 12 && digits.startsWith('52'));
            const checks = [
                ['name', name.length >= 2, 'Escribe tu nombre para poder dirigirnos a ti.'],
                ['phone', phoneOk, 'Escribe un teléfono de 10 dígitos, por ejemplo 5512345678.'],
                ['service', Boolean(f.service.value), 'Elige el trámite que te interesa.']
            ];
            checks.forEach(([key, valid, text]) => {
                setErr(key, valid ? '' : text);
                if (!valid && !first) first = f[key];
            });
            return first;
        };

        ['name', 'phone', 'service'].forEach((k) => {
            f[k].addEventListener('input', () => { if (err[k].textContent) setErr(k, ''); });
            f[k].addEventListener('change', () => { if (err[k].textContent) setErr(k, ''); });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const invalid = validate();
            if (invalid) { invalid.focus(); return; }

            const lines = [
                `Hola, soy ${f.name.value.trim()}.`,
                `Me interesa: ${f.service.value}.`,
                `Mi teléfono: ${f.phone.value.trim()}.`
            ];
            if (f.msg.value.trim()) lines.push(`Mi caso: ${f.msg.value.trim()}`);
            const url = waUrl(lines.join('\n'));

            retry.href = url;
            ok.hidden = false;
            const btn = $('button[type="submit"]', form);
            const r = btn.getBoundingClientRect();
            burst(r.left + r.width / 2, r.top + r.height / 2);
            window.open(url, '_blank', 'noopener');
            ok.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
        });
    }

    /* ======================================================================
       11. WhatsApp flotante: burbuja de ayuda
       ====================================================================== */
    function initWaFloat() {
        const wrap = $('#wa-float');
        if (!wrap) return;
        let seen = false;
        try { seen = sessionStorage.getItem('pp-wa-bubble') === '1'; } catch (_) { /* sin almacenamiento */ }
        if (seen) return;
        const show = () => {
            wrap.classList.add('is-shown');
            try { sessionStorage.setItem('pp-wa-bubble', '1'); } catch (_) { /* sin almacenamiento */ }
            setTimeout(() => wrap.classList.remove('is-shown'), 8000);
        };
        setTimeout(show, 14000);
        $('.wa-float__btn', wrap).addEventListener('click', () => wrap.classList.remove('is-shown'));
    }

    /* ======================================================================
       Arranque
       ====================================================================== */
    function boot() {
        initLinks();
        initNav();
        initReveal();
        initMarquee();
        initCoins();
        initCounters();
        initAccordion();
        initTabs();
        initForm();
        initPointerFx();
        initRotator();
        initWaFloat();

        sceneHero();
        sceneManifesto();
        sceneExpand();
        sceneStack();
        sceneTimeline();
        sceneGallery();
        initEngine();
        measureAll();
        scenes.forEach((s) => { s.force = true; s.update(s, S); s.force = false; });

        initTilt();
        initSparks();
        initLoader();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    // Al volver con el botón "atrás" (bfcache) no se debe quedar el preloader
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            const l = $('#loader');
            if (l) l.classList.add('is-gone');
            body.classList.remove('is-loading');
            body.classList.add('is-ready');
        }
    });
})();
