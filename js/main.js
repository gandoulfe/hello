/* ==========================================================================
   David Nazar — moteur d'animations
   Barba (transitions) · GSAP (timelines, ScrollTrigger, SplitText, Flip) · Lenis
   ========================================================================== */
(() => {
  'use strict';

  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const saveData = !!navigator.connection?.saveData;
  const root = document.documentElement;
  const isCalm = () => root.classList.contains('is-calm');
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const ROUTES = {
    home: { num: 'I', title: 'Accueil', hint: '— retour à la surface —' },
    projets: { num: 'II', title: 'Les Chambres', hint: '— douze portes vous attendent —' },
    apropos: { num: 'III', title: 'Chroniques', hint: '— le récit commence —' },
    contact: { num: 'IV', title: 'Le Styx', hint: '— le passeur vous attend —' },
  };
  const nsFromPath = (path = '') => {
    const file = path.split('/').pop();
    return !file || file === 'index.html' ? 'home' : file.replace('.html', '');
  };

  history.scrollRestoration = 'manual';

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTop = (immediate) =>
    lenis ? lenis.scrollTo(0, { immediate, force: true, duration: 1.6 }) : scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });

  /* ---------- Braises (canvas) ----------
     Sobriété : rendu en 1x et à 30 i/s, extinction après inactivité, coupées en mode calme / économie de données */
  const emberState = { boost: 0, hue: null, rainbow: false };
  const burst = (v = 1) => gsap.fromTo(emberState, { boost: v }, { boost: 0, duration: 2.2, ease: 'power2.out', overwrite: true });

  const embers = (() => {
    const canvas = $('#embers');
    const ctx = canvas.getContext('2d');
    const count = reduce || saveData ? 0 : innerWidth < 700 ? 40 : 90;
    const mouse = { x: -999, y: -999 };
    const IDLE_MS = 12000;
    let w, h, frame = 0, lastInput = performance.now(), running = false;
    const parts = [];

    const spawn = (p, anywhere) => Object.assign(p, {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.3 + Math.random() * 0.9),
      r: 0.6 + Math.random() * 2.2,
      life: 0,
      max: 300 + Math.random() * 500,
      hue: emberState.rainbow ? Math.random() * 360 : (emberState.hue ?? 12) + Math.random() * 32,
      ph: Math.random() * 6.28,
      dead: false,
    });

    const resize = () => {
      w = innerWidth; h = innerHeight;
      canvas.width = w; canvas.height = h;
    };
    resize();
    addEventListener('resize', resize);
    for (let i = 0; i < count; i++) parts.push(spawn({}, true));

    const draw = () => {
      if (++frame % 2) return; // 30 i/s suffisent pour des braises
      const idle = performance.now() - lastInput > IDLE_MS;
      const speed = (1 + emberState.boost * 6) * 2;
      let alive = 0;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        if (p.dead) continue;
        alive++;
        p.life += 2; p.ph += 0.06;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400) {
          const d = Math.sqrt(d2) + 1, f = (1 - d2 / 14400) * 0.6;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        p.vx *= 0.96;
        p.vy += (-(0.3 + p.r * 0.25) - p.vy) * 0.02;
        p.x += (p.vx + Math.sin(p.ph) * 0.35) * speed;
        p.y += p.vy * speed;
        if (p.y < -20 || p.life > p.max || p.x < -20 || p.x > w + 20) {
          if (idle) { p.dead = true; continue; }
          spawn(p);
        }
        if (emberState.rainbow) p.hue = (p.hue + 2) % 360;
        const a = Math.sin(Math.min(p.life / p.max, 1) * Math.PI) * (0.55 + 0.45 * Math.sin(p.ph * 3));
        ctx.fillStyle = `hsla(${p.hue},100%,58%,${a * 0.22})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        ctx.fillStyle = `hsla(${p.hue + 15},100%,75%,${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (!alive) stop(); // toutes les braises sont éteintes : plus aucun calcul
    };

    function start() {
      if (running || !count || isCalm()) return;
      running = true;
      gsap.ticker.add(draw);
    }
    function stop() {
      running = false;
      gsap.ticker.remove(draw);
      ctx.clearRect(0, 0, w, h);
    }
    const wake = () => {
      lastInput = performance.now();
      if (running || isCalm()) return;
      parts.forEach((p) => { if (p.dead) spawn(p); });
      start();
    };
    addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; wake(); }, { passive: true });
    ['scroll', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, wake, { passive: true }));
    start();
    return { start, stop, wake, respawn: () => parts.forEach((p) => spawn(p, true)) };
  })();

  /* ---------- Curseur ---------- */
  const cursor = (() => {
    const el = $('.cursor');
    if (!fine) return { reset() {} };
    const dot = $('.cursor__dot', el), ring = $('.cursor__ring', el), label = $('.cursor__label', el);
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: -100, y: -100 });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });

    addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    addEventListener('pointerdown', () => el.classList.add('is-down'));
    addEventListener('pointerup', () => el.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => gsap.to(el, { opacity: 0, duration: 0.3 }));
    document.addEventListener('mouseenter', () => gsap.to(el, { opacity: 1, duration: 0.3 }));
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a, button, [data-cursor], input, textarea, label, .weapon');
      const text = t?.dataset.cursor;
      el.classList.toggle('is-hover', !!t && !text);
      el.classList.toggle('is-label', !!text);
      if (text) label.textContent = text;
    });
    return { reset: () => el.classList.remove('is-hover', 'is-label') };
  })();

  /* ---------- Navigation ---------- */
  const nav = $('.nav');
  const pill = $('.nav__pill');
  const progress = $('.nav__progress');
  const navLinks = $$('.nav__link');
  let currentNs = nsFromPath(location.pathname);

  const movePill = (link, duration = 0.8, ease = 'elastic.out(1, .75)') =>
    link && gsap.to(pill, { x: link.offsetLeft, width: link.offsetWidth, duration, ease });

  function setActive(ns, instant) {
    currentNs = ns;
    let active;
    navLinks.forEach((l) => {
      const on = l.dataset.ns === ns;
      l.classList.toggle('is-active', on);
      on ? l.setAttribute('aria-current', 'page') : l.removeAttribute('aria-current');
      if (on) active = l;
    });
    movePill(active, instant ? 0 : 0.9);
  }
  navLinks.forEach((l) => l.addEventListener('pointerenter', () => movePill(l, 0.5, 'power3.out')));
  $('.nav__links').addEventListener('pointerleave', () => setActive(currentNs));
  addEventListener('resize', () => setActive(currentNs, true));

  let lastY = 0;
  const onScroll = (y) => {
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > 320);
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    gsap.set(progress, { scaleX: max > 0 ? y / max : 0 });
  };
  lenis ? lenis.on('scroll', ({ scroll }) => onScroll(scroll)) : addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  // Clic sur la page courante : remontée douce plutôt qu'un rechargement
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target || a.protocol === 'mailto:') return;
    const url = new URL(a.href, location.href);
    if (url.origin === location.origin && nsFromPath(url.pathname) === currentNs && !url.hash) {
      e.preventDefault();
      e.stopPropagation();
      scrollTop(false);
    }
  }, true);

  /* ---------- Annonces lecteur d'écran ---------- */
  const announcer = $('[data-announcer]');
  const announce = (msg) => { announcer.textContent = ''; setTimeout(() => { announcer.textContent = msg; }, 60); };

  /* ---------- Mode calme : met en pause tout ce qui bouge en continu (WCAG 2.2.2) ---------- */
  const calmBtn = $('[data-calm-toggle]');
  const calmListeners = new Set();
  function setCalm(on, silent) {
    root.classList.toggle('is-calm', on);
    calmBtn.setAttribute('aria-pressed', String(on));
    $('.sr-only', calmBtn).textContent = on ? 'Relancer les animations' : 'Mettre en pause les animations';
    calmBtn.title = on ? 'Relancer les animations' : 'Mettre en pause les animations';
    on ? embers.stop() : embers.wake();
    calmListeners.forEach((fn) => fn(on));
    store.set('dn-calm', on ? '1' : '0');
    if (!silent) announce(on ? 'Animations en pause' : 'Animations relancées');
  }
  setCalm(isCalm(), true);
  calmBtn.addEventListener('click', () => setCalm(!isCalm()));

  /* ---------- Toast ---------- */
  const toastEl = $('.toast');
  gsap.set(toastEl, { y: 0, yPercent: 220 });
  function toast(html) {
    toastEl.innerHTML = html;
    gsap.timeline()
      .to(toastEl, { yPercent: 0, duration: 0.9, ease: 'expo.out', overwrite: true })
      .to(toastEl, { yPercent: 220, duration: 0.6, ease: 'expo.in' }, '+=2.8');
  }

  /* ==========================================================================
     Cycle de vie des pages
     ========================================================================== */
  let pageCtx = null;
  let cleanups = [];
  const on = (el, ev, fn, opts) => { el.addEventListener(ev, fn, opts); cleanups.push(() => el.removeEventListener(ev, fn, opts)); };

  function initPage(c) {
    const ns = c.dataset.barbaNamespace;
    pageCtx = gsap.context(() => {
      c._intro = buildIntro(c);
      reveals(c);
      parallax(c);
      magnetic(c);
      tilt(c);
      scramble(c);
      counters(c);
      pauseOffscreen(c);
      PAGES[ns]?.(c);
    }, c);
  }

  // Sobriété : les animations CSS en boucle (sceaux, médaillon) s'arrêtent hors écran
  function pauseOffscreen(c) {
    const els = $$('.hero, .medallion', c);
    if (!els.length) return;
    const io = new IntersectionObserver((entries) =>
      entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting)));
    els.forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());
  }

  function destroyPage() {
    cleanups.forEach((fn) => fn());
    cleanups = [];
    pageCtx?.revert();
    pageCtx = null;
  }

  const playIntro = (c) => c._intro?.play();

  /* ---------- Intro de page (après loader / transition) ---------- */
  function buildIntro(c) {
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });

    const title = $('[data-hero-title]', c);
    if (title) {
      const split = SplitText.create(title.querySelectorAll('.word'), { type: 'chars', charsClass: 'char', aria: 'none' });
      tl.fromTo(split.chars,
        { yPercent: 120, rotateX: -95, opacity: 0, filter: 'blur(14px)' },
        { yPercent: 0, rotateX: 0, opacity: 1, filter: 'blur(0px)', duration: 1.8, stagger: { each: 0.05, from: 'center' } }, 0);
    }

    $$('[data-hero-lines]', c).forEach((el) => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
      tl.from(split.lines, { yPercent: 115, rotate: 4, duration: 1.4, stagger: 0.12 }, 0.05);
    });

    const weight = $('[data-weight-title]', c);
    if (weight) {
      const split = SplitText.create(weight, { type: 'chars', charsClass: 'char' });
      weight._chars = split.chars;
      tl.fromTo(split.chars,
        { yPercent: 70, opacity: 0, filter: 'blur(12px)' },
        { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.5, stagger: 0.05 }, 0);
    }

    const fades = $$('[data-hero-fade]', c);
    if (fades.length) tl.from(fades, { y: 34, opacity: 0, duration: 1.3, stagger: 0.08 }, 0.35);

    $$('[data-hero-stagger]', c).forEach((el) =>
      tl.from(el.children, { y: 70, opacity: 0, duration: 1.3, stagger: 0.07, clearProps: 'transform,opacity' }, 0.55));

    const medallion = $('[data-hero-medallion]', c);
    if (medallion) tl.from(medallion, { scale: 0.5, rotate: -120, opacity: 0, duration: 2 }, 0.1);

    const sigil = $('.hero__sigil', c);
    if (sigil) tl.from(sigil, { scale: 0.6, rotate: -50, opacity: 0, duration: 2.6 }, 0);

    return tl;
  }

  /* ---------- Briques communes ---------- */
  function reveals(c) {
    $$('[data-reveal]', c).forEach((el) =>
      gsap.from(el, { y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

    $$('[data-split-lines]', c).forEach((el) => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
      gsap.from(split.lines, {
        yPercent: 115, rotate: 3, duration: 1.4, stagger: 0.12, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      });
    });
  }

  function parallax(c) {
    if (!fine) return;
    const layers = $$('[data-depth]', c).map((el) => ({
      d: +el.dataset.depth,
      x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }),
      y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }),
    }));
    if (!layers.length) return;
    on(window, 'pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      layers.forEach((l) => { l.x(nx * l.d * 50); l.y(ny * l.d * 50); });
    });
  }

  function magnetic(root, bind = on) {
    if (!fine) return;
    $$('[data-magnetic]', root).forEach((el) => {
      const inner = $('.btn__inner', el);
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      const ixTo = inner && gsap.quickTo(inner, 'x', { duration: 0.6, ease: 'power3' });
      const iyTo = inner && gsap.quickTo(inner, 'y', { duration: 0.6, ease: 'power3' });
      bind(el, 'pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        xTo(x * 0.35); yTo(y * 0.35);
        if (inner) { ixTo(x * 0.15); iyTo(y * 0.15); }
        el.style.setProperty('--rx', e.clientX - r.left + 'px');
        el.style.setProperty('--ry', e.clientY - r.top + 'px');
      });
      bind(el, 'pointerleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, .35)' });
        if (inner) gsap.to(inner, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, .35)' });
      });
    });
  }

  function tilt(c) {
    if (!fine) return;
    $$('[data-tilt]', c).forEach((el) => {
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3' });
      on(el, 'pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 20); rx((0.5 - py) * 20);
        el.style.setProperty('--mx', px * 100 + '%');
        el.style.setProperty('--my', py * 100 + '%');
        el.style.setProperty('--sx', px * 100 + '%');
      });
      on(el, 'pointerleave', () => { rx(0); ry(0); });
    });
  }

  const GLYPHS = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ✦';
  function scramble(c) {
    $$('[data-scramble]', c).forEach((el) => {
      const final = el.textContent;
      el.setAttribute('aria-label', final); // le texte brouillé ne doit pas être lu
      const o = { p: 0 };
      on(el, 'pointerenter', () => {
        gsap.fromTo(o, { p: 0 }, {
          p: 1, duration: 0.7, ease: 'none', overwrite: true,
          onUpdate() {
            const n = Math.floor(o.p * final.length);
            el.textContent = final.slice(0, n) + [...final.slice(n)].map((ch) => (ch === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
          },
          onComplete() { el.textContent = final; },
        });
      });
    });
  }

  function counters(c) {
    $$('[data-count]', c).forEach((el) => {
      // Valeur finale lue directement, le compteur animé est masqué aux lecteurs d'écran
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = el.dataset.count;
      el.setAttribute('aria-hidden', 'true');
      el.after(sr);
      const o = { v: 0 };
      gsap.to(o, {
        v: +el.dataset.count, duration: 2.4, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('fr-FR'); },
      });
    });
  }

  function segmented(group, onChange) {
    const segPill = $('.segmented__pill', group);
    const btns = $$('button', group);
    let active = btns.find((b) => b.classList.contains('is-active'));
    const move = (b, duration = 0.7) => gsap.to(segPill, { x: b.offsetLeft, width: b.offsetWidth, duration, ease: 'expo.out' });
    move(active, 0);
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === active)));
    btns.forEach((b) => on(b, 'click', () => {
      if (b === active) return;
      active = b;
      btns.forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      // Mobile : le filtre choisi est recentré dans la ligne défilante
      if (group.scrollWidth > group.clientWidth) {
        group.scrollTo({ left: b.offsetLeft - (group.clientWidth - b.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
      }
      move(b);
      onChange(b.dataset.value);
    }));
    on(window, 'resize', () => move(active, 0));
  }

  /* ==========================================================================
     Pages
     ========================================================================== */
  const PAGES = {
    home(c) {
      const hero = $('.hero', c);
      const scrub = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to($('.hero__content', c), { yPercent: 35, opacity: 0, ease: 'none', scrollTrigger: scrub });
      gsap.to($('.hero__sigil svg', c), { scale: 1.6, rotate: 70, opacity: 0, ease: 'none', scrollTrigger: { ...scrub } });

      // Manifeste : les mots s'allument au fil du scroll
      const manifesto = $('[data-scrub-words]', c);
      const words = SplitText.create(manifesto, { type: 'words', wordsClass: 'word', aria: 'none' }).words;
      gsap.fromTo(words, { opacity: 0.55, filter: 'blur(1.5px)' }, {
        opacity: 1, filter: 'blur(0px)', stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: manifesto, start: 'top 80%', end: 'bottom 45%', scrub: true },
      });

      // Terminal : les lignes se « tapent » au scroll (le texte reste entier dans le DOM pour les lecteurs d'écran)
      const term = $('[data-terminal]', c);
      if (term) {
        const lines = $$('.term__line', term);
        const tl = gsap.timeline({ scrollTrigger: { trigger: term, start: 'top 75%', once: true } });
        lines.forEach((l) => {
          const n = Math.max(8, Math.round(l.textContent.length / 2));
          tl.fromTo(l, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: n * 0.028, ease: `steps(${n})` }, '+=0.12');
        });
      }

      // Bénédictions : scroll horizontal épinglé
      const mm = gsap.matchMedia();
      cleanups.push(() => mm.revert());
      mm.add('(min-width: 900px)', () => {
        const section = $('[data-boons]', c), track = $('.boons__track', c);
        const dist = () => track.scrollWidth - innerWidth;
        const tween = gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: section, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true },
        });
        $$('.boon', track).forEach((card) => gsap.from(card, {
          y: 140, rotate: 8, opacity: 0.15, ease: 'power2.out',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 105%', end: 'left 65%', scrub: true },
        }));
      });

      // Marquee : accélère et s'inverse avec le scroll
      const track = $('[data-marquee] .marquee__track', c);
      const clone = track.firstElementChild.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
      const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 30, repeat: -1 });
      loop.totalTime(loop.duration() * 100);
      // Sobriété : la boucle ne tourne que visible à l'écran, et jamais en mode calme
      const marqueeST = ScrollTrigger.create({
        trigger: track, start: 'top bottom', end: 'bottom top',
        onToggle: (self) => loop.paused(!self.isActive || isCalm()),
        onUpdate(self) {
          if (isCalm()) return;
          const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 250, 6);
          gsap.to(loop, {
            timeScale: self.direction * boost, duration: 0.2, overwrite: true,
            onComplete: () => gsap.to(loop, { timeScale: self.direction, duration: 1.2 }),
          });
        },
      });
      loop.paused(!marqueeST.isActive || isCalm());
      const onCalm = (calm) => loop.paused(calm || !marqueeST.isActive);
      calmListeners.add(onCalm);
      cleanups.push(() => calmListeners.delete(onCalm));
    },

    projets(c) {
      const works = $('[data-works]', c);
      const items = $$('.work', works);

      // Un clic pendant une animation termine la précédente au lieu de s'empiler
      let flip = null;
      const finishFlip = () => { flip?.progress(1).kill(); gsap.killTweensOf(items); gsap.set(items, { clearProps: 'opacity,transform' }); };

      segmented($('[data-filter]', c), (value) => {
        finishFlip();
        const state = Flip.getState(items, { props: 'opacity' });
        items.forEach((it) => { it.style.display = value === 'all' || it.dataset.cat === value ? '' : 'none'; });
        const shown = items.filter((it) => it.style.display !== 'none').length;
        announce(`${shown} référence${shown > 1 ? 's' : ''} affichée${shown > 1 ? 's' : ''}`);
        flip = Flip.from(state, {
          duration: 0.55, ease: 'power3.out', absolute: true,
          onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.03, ease: 'power3.out' }),
          onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.2, ease: 'power1.in' }),
          onComplete: () => ScrollTrigger.refresh(),
        });
      });

      segmented($('[data-view]', c), (value) => {
        finishFlip();
        hidePreview();
        const state = Flip.getState(items);
        works.classList.toggle('is-grid', value === 'grid');
        announce(value === 'grid' ? 'Affichage en grille' : 'Affichage en liste');
        flip = Flip.from(state, { duration: 0.7, ease: 'power3.inOut', absolute: true, stagger: 0.02, onComplete: () => ScrollTrigger.refresh() });
        if (value === 'grid') gsap.fromTo($$('.work__art', works), { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, delay: 0.15, stagger: 0.03, ease: 'power3.out' });
      });

      // Aperçu flottant qui suit le curseur (mode liste)
      const preview = $('.preview', c);
      const art = $('.art', preview);
      const hidePreview = () => gsap.to(preview, { scale: 0, opacity: 0, duration: 0.45, ease: 'power3.in', overwrite: 'auto' });
      if (!fine) return;
      gsap.set(preview, { scale: 0, opacity: 0, xPercent: -50, yPercent: -50 });
      const xTo = gsap.quickTo(preview, 'x', { duration: 0.7, ease: 'power3' });
      const yTo = gsap.quickTo(preview, 'y', { duration: 0.7, ease: 'power3' });
      const rTo = gsap.quickTo(preview, 'rotation', { duration: 0.9, ease: 'power3' });
      let lastX = 0;
      on(works, 'pointermove', (e) => {
        xTo(e.clientX); yTo(e.clientY);
        rTo(gsap.utils.clamp(-14, 14, (e.clientX - lastX) * 0.9));
        lastX = e.clientX;
      });
      on(works, 'pointerleave', hidePreview);
      const desc = $('.preview__desc', preview);
      items.forEach((it) => on(it, 'pointerenter', () => {
        if (works.classList.contains('is-grid')) return;
        art.style.setProperty('--h', it.dataset.hue);
        desc.textContent = it.dataset.desc;
        art.dataset.num = $('.work__num', it).textContent;
        gsap.to(preview, { scale: 1, opacity: 1, duration: 0.7, ease: 'expo.out', overwrite: 'auto' });
        gsap.fromTo(art, { scale: 1.35 }, { scale: 1, duration: 1.1, ease: 'expo.out' });
      }));
    },

    apropos(c) {
      const chron = $('[data-chronicles]', c);
      gsap.fromTo($('.draw', chron), { strokeDasharray: 1, strokeDashoffset: 1 }, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: chron, start: 'top 60%', end: 'bottom 60%', scrub: true },
      });
      $$('.chronicle', chron).forEach((ch) => ScrollTrigger.create({
        trigger: ch, start: 'top 62%',
        onEnter: () => { ch.classList.add('is-lit'); burst(0.35); },
        onLeaveBack: () => ch.classList.remove('is-lit'),
      }));

      // Les deux faces restent lisibles par les lecteurs d'écran ; au clavier, le focus retourne la carte (CSS)
      if (!fine) $$('.weapon', c).forEach((wp) => on(wp, 'click', () => wp.classList.toggle('is-flipped')));
    },

    contact(c) {
      // Titre : la graisse des lettres réagit à la proximité du curseur
      const title = $('[data-weight-title]', c);
      if (fine && title._chars) {
        let raf = 0;
        on(window, 'pointermove', (e) => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => title._chars.forEach((ch) => {
            const r = ch.getBoundingClientRect();
            const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
            const k = Math.max(0, 1 - d / 320);
            gsap.to(ch, { fontWeight: 400 + 500 * k, color: k > 0.45 ? '#d8b25a' : '#efe3cf', y: -k * 14, duration: 0.6, ease: 'power3', overwrite: 'auto' });
          }));
        });
      }

      const form = $('[data-form]', c);
      const btn = $('.submit', form);
      const msg = $('#f-msg', form);
      const counter = $('[data-count-chars]', form);
      on(msg, 'input', () => {
        counter.textContent = `${msg.value.length} / 500`;
        msg.style.height = 'auto';
        msg.style.height = msg.scrollHeight + 'px';
      });
      // Messages d'erreur reliés aux champs (aria-describedby / aria-invalid)
      const fields = $$('.field', form).map((f) => {
        const input = $('input, textarea', f);
        const err = document.createElement('span');
        err.className = 'field__error';
        err.id = input.id + '-error';
        f.appendChild(err);
        input.setAttribute('aria-describedby', err.id);
        return { f, input, err };
      });
      const setError = ({ f, input, err }, msg) => {
        f.classList.toggle('is-error', !!msg);
        input.setAttribute('aria-invalid', String(!!msg));
        err.textContent = msg || '';
      };
      on(form, 'input', (e) => { const fd = fields.find((x) => x.input === e.target); if (fd) setError(fd, ''); });
      on(form, 'submit', (e) => {
        e.preventDefault();
        if (btn.classList.contains('is-sending')) return;
        const invalid = fields.filter((fd) => {
          const { input } = fd;
          const msg = !input.value.trim() ? 'Ce champ est obligatoire.'
            : input.type === 'email' && !input.checkValidity() ? 'Adresse e-mail invalide (ex. : nom@domaine.fr).' : '';
          setError(fd, msg);
          if (msg && !reduce) gsap.fromTo(fd.f, { x: -12 }, { x: 0, duration: 0.8, ease: 'elastic.out(1, .3)' });
          return msg;
        });
        if (invalid.length) {
          invalid[0].input.focus();
          return toast(`Le passeur exige <b>${invalid.length} correction${invalid.length > 1 ? 's' : ''}</b>.`);
        }
        btn.classList.add('is-sending');
        const data = new FormData(form);
        const subject = `[${data.get('type')}] Message de ${data.get('name')}`;
        const body = `${data.get('message')}\n\n— ${data.get('name')} (${data.get('email')})`;
        gsap.delayedCall(1.2, () => {
          btn.classList.replace('is-sending', 'is-sent');
          burst(1.2);
          location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          toast('<b>Obole prête.</b> Votre messagerie s’ouvre pour traverser le Styx.');
          gsap.delayedCall(3.2, () => {
            btn.classList.remove('is-sent');
            fields.forEach((fd) => setError(fd, ''));
            form.reset();
            counter.textContent = '0 / 500';
            msg.style.height = '';
          });
        });
      });
    },
  };

  /* ==========================================================================
     Loader — les portes du château
     ========================================================================== */
  function runLoader() {
    const loader = $('.loader');
    // Sobriété : la cinématique complète une seule fois par session, ensuite les portes s'ouvrent directement
    let seen = false;
    try { seen = sessionStorage.getItem('dn-seen') === '1'; sessionStorage.setItem('dn-seen', '1'); } catch {}
    if (seen || saveData) {
      $('.loader__center', loader).remove();
      return new Promise((resolve) => {
        gsap.timeline({ onComplete: () => loader.remove() })
          .to('.loader__gate--top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 0.1)
          .to('.loader__gate--bottom', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, 0.1)
          .add(resolve, 0.4);
      });
    }
    const shapes = $$('.loader__sigil circle, .loader__sigil path', loader);
    shapes.forEach((s) => { const l = s.getTotalLength(); gsap.set(s, { strokeDasharray: l, strokeDashoffset: l }); });
    const count = $('.loader__count', loader);
    const o = { v: 0 };

    return new Promise((resolve) => {
      gsap.timeline({ onComplete: () => loader.remove() })
        .to(shapes, { strokeDashoffset: 0, duration: 1.6, stagger: 0.12, ease: 'power2.inOut' }, 0)
        .to(o, { v: 100, duration: 2.1, ease: 'power3.inOut', onUpdate: () => { count.dataset.count = String(Math.round(o.v)).padStart(3, '0'); } }, 0)
        .fromTo('.loader__name', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out' }, 0.9)
        .to('.loader__sigil', { rotate: 180, scale: 0.85, duration: 1.1, ease: 'expo.inOut' }, 1.9)
        .to('.loader__center', { opacity: 0, scale: 0.9, duration: 0.5, ease: 'power2.in' }, 2.6)
        .to('.loader__seam', { scaleX: 1, duration: 0.7, ease: 'expo.inOut' }, 2.5)
        .add(() => burst(1.4), 3.15)
        .to('.loader__gate--top', { yPercent: -100, duration: 1.4, ease: 'expo.inOut' }, 3.15)
        .to('.loader__gate--bottom', { yPercent: 100, duration: 1.4, ease: 'expo.inOut' }, 3.15)
        .to('.loader__seam', { opacity: 0, scaleY: 8, duration: 0.7 }, 3.2)
        .add(resolve, 3.5);
    });
  }

  /* ==========================================================================
     Transition de page — panneaux obliques + carte titre façon Hades
     ========================================================================== */
  const T = $('.transition');
  const panels = $$('.transition__panel', T);
  const card = $('.transition__card', T);
  const tNum = $('.transition__num', T);
  const tTitle = $('.transition__title', T);
  const tLine = $('.transition__line', T);
  const tHint = $('.transition__hint', T);
  let titleSplit = null;
  gsap.set(panels, { skewX: -14, xPercent: -110 });

  function cover(info, current) {
    tNum.textContent = info.num;
    titleSplit?.revert();
    tTitle.textContent = info.title;
    tHint.textContent = info.hint;
    titleSplit = SplitText.create(tTitle, { type: 'chars', charsClass: 'char', aria: 'none' });
    gsap.set(card, { opacity: 1, y: 0 });
    gsap.set(current, { transformOrigin: `50% ${scrollY + innerHeight / 2}px` });

    return gsap.timeline()
      .set(T, { visibility: 'visible' })
      .to(current, { scale: 0.93, opacity: 0.25, filter: 'blur(6px)', duration: 0.95, ease: 'expo.inOut' }, 0)
      .fromTo(panels, { xPercent: -110 }, { xPercent: 0, duration: 1.05, ease: 'expo.inOut', stagger: 0.09 }, 0)
      .add(() => burst(1), 0.45)
      .fromTo(tNum, { opacity: 0, y: 20, letterSpacing: '1.4em' }, { opacity: 1, y: 0, letterSpacing: '0.5em', duration: 0.9, ease: 'expo.out' }, 0.8)
      .fromTo(titleSplit.chars, { yPercent: 60, rotate: 8, opacity: 0, filter: 'blur(8px)' }, { yPercent: 0, rotate: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, stagger: 0.03, ease: 'expo.out' }, 0.82)
      .fromTo(tLine, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'expo.inOut' }, 0.85)
      .fromTo(tHint, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7 }, 1.1)
      .to({}, { duration: 0.15 });
  }

  function uncover() {
    return gsap.timeline()
      .to(card, { opacity: 0, y: -40, duration: 0.5, ease: 'power2.in' })
      .to(panels, { xPercent: 110, duration: 1.15, ease: 'expo.inOut', stagger: { each: 0.08, from: 'end' } }, 0.2)
      .set(T, { visibility: 'hidden' });
  }

  /* ==========================================================================
     Code Konami : ↑ ↑ ↓ ↓ ← → ← → B A — choisissez une bénédiction façon Hades
     ========================================================================== */
  (() => {
    const CODE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
    const BOONS = {
      zeus: { name: 'Zeus', hue: 200, power: 'Éclair céleste', desc: 'Chaque clic invoque la foudre.' },
      ares: { name: 'Arès', hue: 350, power: 'Lame maudite', desc: 'Chaque clic tranche l’air.' },
      dionysos: { name: 'Dionysos', hue: null, power: 'Ivresse festive', desc: 'Chaque clic fait pleuvoir le raisin.' },
    };
    let overlay, flash, fx, fxCtx, effects = [], lastFlash = 0, opener = null;

    const icon = {
      zeus: '<path d="M56 10 28 54h20l-8 36 32-48H50z"/><circle cx="50" cy="50" r="46"/>',
      ares: '<path d="M18 82 70 30"/><path d="M62 18h20v20"/><path d="M26 64l10 10"/><circle cx="50" cy="50" r="46"/>',
      dionysos: '<circle cx="42" cy="40" r="8"/><circle cx="58" cy="40" r="8"/><circle cx="50" cy="54" r="8"/><circle cx="34" cy="54" r="8"/><circle cx="66" cy="54" r="8"/><circle cx="50" cy="68" r="8"/><path d="M50 32c0-8 6-14 14-16"/><circle cx="50" cy="50" r="46"/>',
    };

    function build() {
      overlay = document.createElement('div');
      overlay.className = 'konami';
      overlay.hidden = true;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'konami-title');
      overlay.innerHTML = `
        <div class="konami__inner">
          <p class="konami__code" aria-hidden="true">↑ ↑ ↓ ↓ ← → ← → B A</p>
          <h2 class="konami__title" id="konami-title">Une porte <em>secrète</em> s’ouvre</h2>
          <p class="konami__lead">Les dieux de l’Olympe vous offrent une bénédiction. Elle colore tout le site et transforme vos clics.</p>
          <div class="konami__choices">
            ${Object.entries(BOONS).map(([k, b]) => `
              <button type="button" class="konami__boon konami__boon--${k}" data-boon="${k}">
                <svg viewBox="0 0 100 100" aria-hidden="true">${icon[k]}</svg>
                <small>${b.name}</small><b>${b.power}</b><span>${b.desc}</span>
              </button>`).join('')}
          </div>
          <button type="button" class="konami__close" data-konami-close>Refuser les dieux (Échap)</button>
        </div>`;
      flash = document.createElement('div');
      flash.className = 'konami__flash';
      flash.setAttribute('aria-hidden', 'true');
      fx = document.createElement('canvas');
      fx.id = 'fx';
      fx.setAttribute('aria-hidden', 'true');
      fxCtx = fx.getContext('2d');
      document.body.append(overlay, flash, fx);
      const size = () => { fx.width = innerWidth; fx.height = innerHeight; };
      size();
      addEventListener('resize', size);

      overlay.addEventListener('click', (e) => {
        const b = e.target.closest('[data-boon]');
        if (b) choose(b.dataset.boon);
        else if (e.target.closest('[data-konami-close]')) close();
      });
      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
        if (e.key !== 'Tab') return;
        const focusables = $$('button', overlay);
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }

    function open() {
      if (!overlay) build();
      opener = document.activeElement;
      lenis?.stop();
      overlay.hidden = false;
      burst(2);
      const cards = $$('.konami__boon', overlay);
      gsap.timeline()
        .fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.5 })
        .fromTo($$('.konami__code, .konami__title, .konami__lead', overlay), { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.8, ease: 'expo.out' }, 0.1)
        .fromTo(cards, { y: 120, rotateY: 90, opacity: 0 }, { y: 0, rotateY: 0, opacity: 1, stagger: 0.12, duration: 1.1, ease: 'expo.out', transformPerspective: 900 }, 0.3);
      cards[0].focus();
      announce('Code Konami activé : choisissez une bénédiction');
    }

    function close() {
      gsap.to(overlay, { opacity: 0, duration: 0.4, onComplete: () => { overlay.hidden = true; } });
      lenis?.start();
      opener?.focus?.();
    }

    function choose(key) {
      const boon = BOONS[key];
      root.dataset.boon = key;
      emberState.hue = boon.hue;
      emberState.rainbow = key === 'dionysos';
      embers.respawn();
      if (!reduce) gsap.fromTo(flash, { opacity: 0.35 }, { opacity: 0, duration: 0.8, ease: 'power2.out' });
      burst(2.5);
      close();
      toast(`<b>Bénédiction de ${boon.name}</b> — ${boon.power}. Cliquez n’importe où. (Refaites le code pour en changer.)`);
      announce(`Bénédiction de ${boon.name} accordée`);
    }

    /* --- Effets au clic --- */
    const jagged = (x1, y1, x2, y2, spread) => {
      const pts = [[x1, y1]];
      const steps = 14;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        pts.push([x1 + (x2 - x1) * t + (Math.random() - 0.5) * spread, y1 + (y2 - y1) * t + (Math.random() - 0.5) * spread * 0.3]);
      }
      pts.push([x2, y2]);
      return pts;
    };

    function spawnEffect(x, y) {
      const key = root.dataset.boon;
      if (key === 'zeus') {
        const main = jagged(x + (Math.random() - 0.5) * 300, -10, x, y, 70);
        const branches = [1, 2].map(() => {
          const from = main[4 + ((Math.random() * 6) | 0)];
          return jagged(from[0], from[1], from[0] + (Math.random() - 0.5) * 260, from[1] + 80 + Math.random() * 160, 40);
        });
        effects.push({ type: 'bolt', paths: [main, ...branches], life: 1 });
        // Pas plus d'un flash toutes les 400 ms (WCAG 2.3.1 : moins de 3 flashs par seconde)
        const now = performance.now();
        if (!reduce && now - lastFlash > 400) { lastFlash = now; gsap.fromTo(flash, { opacity: 0.18 }, { opacity: 0, duration: 0.35 }); }
      } else if (key === 'ares') {
        const a = Math.random() * Math.PI;
        for (let i = 0; i < 3; i++) effects.push({ type: 'slash', x, y, a: a + (i - 1) * 0.35, len: 160 + i * 40, life: 1, delay: i * 0.06 });
        for (let i = 0; i < 18; i++) effects.push({ type: 'drop', x, y, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 7, r: 2 + Math.random() * 3, life: 1, hue: 350 });
        if (!reduce) gsap.fromTo('#main', { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, .3)', clearProps: 'x' });
      } else if (key === 'dionysos') {
        for (let i = 0; i < 26; i++) effects.push({ type: 'drop', x, y, vx: (Math.random() - 0.5) * 11, vy: -3 - Math.random() * 8, r: 4 + Math.random() * 5, life: 1, hue: 270 + Math.random() * 60 });
      }
      burst(0.6);
      gsap.ticker.remove(renderFx);
      gsap.ticker.add(renderFx);
    }

    function renderFx() {
      const ctx = fxCtx;
      ctx.clearRect(0, 0, fx.width, fx.height);
      ctx.globalCompositeOperation = 'lighter';
      effects = effects.filter((e) => e.life > 0);
      for (const e of effects) {
        if (e.delay > 0) { e.delay -= 1 / 60; continue; }
        if (e.type === 'bolt') {
          e.life -= 0.045;
          for (const [w, c] of [[10, `rgba(74,163,255,${e.life * 0.25})`], [3, `rgba(200,235,255,${e.life})`], [1, `rgba(255,255,255,${e.life})`]]) {
            ctx.lineWidth = w; ctx.strokeStyle = c; ctx.lineJoin = 'round';
            e.paths.forEach((p, i) => {
              ctx.globalAlpha = i ? 0.6 : 1;
              ctx.beginPath(); p.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
            });
          }
          ctx.globalAlpha = 1;
        } else if (e.type === 'slash') {
          e.life -= 0.05;
          const grow = Math.min(1, (1 - e.life) * 4);
          const dx = Math.cos(e.a) * e.len * grow / 2, dy = Math.sin(e.a) * e.len * grow / 2;
          ctx.lineCap = 'round';
          ctx.lineWidth = 6 * e.life; ctx.strokeStyle = `rgba(255,40,70,${e.life})`;
          ctx.beginPath(); ctx.moveTo(e.x - dx, e.y - dy); ctx.lineTo(e.x + dx, e.y + dy); ctx.stroke();
          ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,220,220,${e.life})`; ctx.stroke();
        } else {
          e.life -= 0.02; e.vy += 0.35; e.x += e.vx; e.y += e.vy;
          ctx.fillStyle = `hsla(${e.hue},90%,60%,${e.life})`;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      if (!effects.length) { ctx.clearRect(0, 0, fx.width, fx.height); gsap.ticker.remove(renderFx); }
    }

    document.addEventListener('pointerdown', (e) => {
      if (!root.dataset.boon || (overlay && !overlay.hidden)) return;
      if (e.target.closest('a, button, input, textarea, label, select, [role="button"]')) return;
      spawnEffect(e.clientX, e.clientY);
    });

    // Tampon des dernières entrées : tolère les touches en trop (↑ ↑ ↑ ↓ ↓…)
    let buffer = [];
    const push = (key) => {
      buffer = [...buffer, key].slice(-CODE.length);
      if (buffer.join() === CODE.join() && (!overlay || overlay.hidden)) { buffer = []; open(); }
    };
    addEventListener('keydown', (e) => {
      if (e.target.closest?.('input, textarea')) return;
      push(e.key.toLowerCase());
    });

    // Mobile : glisser ↑ ↑ ↓ ↓ ← → ← → puis deux tapotements (B, A)
    let start = null;
    addEventListener('touchstart', (e) => { const t = e.touches[0]; start = { x: t.clientX, y: t.clientY }; }, { passive: true });
    addEventListener('touchend', (e) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x, dy = t.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) {
        const i = buffer.length;
        return push(buffer.join().endsWith('arrowleft,arrowright') && i ? 'b' : buffer[i - 1] === 'b' ? 'a' : 'tap');
      }
      push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'arrowright' : 'arrowleft') : dy > 0 ? 'arrowdown' : 'arrowup');
    }, { passive: true });
  })();

  /* ==========================================================================
     Démarrage
     ========================================================================== */
  magnetic(nav, (el, ev, fn) => el.addEventListener(ev, fn));

  if (reduce) {
    // Mouvement réduit : navigation classique, pas de loader ni de transition
    document.fonts.ready.then(() => {
      root.classList.remove('fonts-pending');
      const c = $('[data-barba="container"]');
      $('.loader').remove();
      document.body.classList.remove('is-loading');
      setActive(c.dataset.barbaNamespace, true);
      initPage(c);
      c._intro.progress(1);
    });
    return;
  }

  barba.init({
    preventRunning: true,
    timeout: 8000,
    prevent: ({ el }) => el.target === '_blank' || el.protocol === 'mailto:' || el.getAttribute('href')?.startsWith('#'),
    transitions: [{
      name: 'hades',
      async once({ next }) {
        // Perf (LCP/CLS) : polices prêtes, puis le contenu est peint une fois sous les portes du loader avant que l’intro ne le masque
        await document.fonts.ready;
        root.classList.remove('fonts-pending');
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        setActive(next.namespace, true);
        initPage(next.container);
        await runLoader();
        document.body.classList.remove('is-loading');
        playIntro(next.container);
      },
      async leave({ current, next }) {
        lenis?.stop();
        const ns = nsFromPath(next.url.path);
        setActive(ns);
        await cover(ROUTES[ns] || ROUTES.home, current.container);
        destroyPage();
      },
      enter({ next }) {
        scrollTop(true);
        scrollTo(0, 0);
        lastY = 0;
        nav.classList.remove('is-hidden', 'is-scrolled');
        cursor.reset();
        initPage(next.container);
      },
      async after({ next }) {
        lenis?.start();
        ScrollTrigger.refresh();
        // Accessibilité : le focus suit la navigation et la nouvelle page est annoncée
        next.container.focus({ preventScroll: true });
        announce(`Page ${(ROUTES[next.namespace] || ROUTES.home).title} chargée`);
        await uncover().add(() => playIntro(next.container), 0.55);
      },
    }],
  });
})();
