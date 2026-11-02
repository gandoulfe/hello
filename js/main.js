/* ==========================================================================
   David Nazar — moteur d'animations
   Barba (transitions) · GSAP (timelines, ScrollTrigger, SplitText, Flip) · Lenis
   ========================================================================== */
(() => {
  'use strict';

  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const ROUTES = {
    home: { num: 'I', title: 'Accueil', hint: '— retour à la surface —' },
    projets: { num: 'II', title: 'Les Chambres', hint: '— huit portes vous attendent —' },
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

  /* ---------- Braises (canvas) ---------- */
  const emberState = { boost: 0 };
  const burst = (v = 1) => gsap.fromTo(emberState, { boost: v }, { boost: 0, duration: 2.2, ease: 'power2.out', overwrite: true });

  (() => {
    const canvas = $('#embers');
    const ctx = canvas.getContext('2d');
    const count = reduce ? 0 : innerWidth < 700 ? 45 : 110;
    const mouse = { x: -999, y: -999 };
    let w, h;
    const parts = [];

    const spawn = (p, anywhere) => Object.assign(p, {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.3 + Math.random() * 0.9),
      r: 0.6 + Math.random() * 2.2,
      life: 0,
      max: 300 + Math.random() * 500,
      hue: 12 + Math.random() * 32,
      ph: Math.random() * 6.28,
    });

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);
    addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    for (let i = 0; i < count; i++) parts.push(spawn({}, true));
    if (!count) return;

    gsap.ticker.add(() => {
      const speed = 1 + emberState.boost * 6;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.life++; p.ph += 0.03;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400) {
          const d = Math.sqrt(d2) + 1, f = (1 - d2 / 14400) * 0.6;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        p.vx *= 0.96;
        p.vy += (-(0.3 + p.r * 0.25) - p.vy) * 0.02;
        p.x += (p.vx + Math.sin(p.ph) * 0.35) * speed;
        p.y += p.vy * speed;
        if (p.y < -20 || p.life > p.max || p.x < -20 || p.x > w + 20) spawn(p);
        const a = Math.sin(Math.min(p.life / p.max, 1) * Math.PI) * (0.55 + 0.45 * Math.sin(p.ph * 3));
        ctx.fillStyle = `hsla(${p.hue},100%,58%,${a * 0.22})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        ctx.fillStyle = `hsla(${p.hue + 15},100%,75%,${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    });
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
      PAGES[ns]?.(c);
    }, c);
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
      const split = SplitText.create(title.querySelectorAll('.word'), { type: 'chars', charsClass: 'char' });
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
    btns.forEach((b) => on(b, 'click', () => {
      if (b === active) return;
      active = b;
      btns.forEach((x) => x.classList.toggle('is-active', x === b));
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
      const words = SplitText.create(manifesto, { type: 'words', wordsClass: 'word' }).words;
      gsap.fromTo(words, { opacity: 0.1, filter: 'blur(3px)' }, {
        opacity: 1, filter: 'blur(0px)', stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: manifesto, start: 'top 80%', end: 'bottom 45%', scrub: true },
      });

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
      ScrollTrigger.create({
        trigger: track, start: 'top bottom', end: 'bottom top',
        onUpdate(self) {
          const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 250, 6);
          gsap.to(loop, {
            timeScale: self.direction * boost, duration: 0.2, overwrite: true,
            onComplete: () => gsap.to(loop, { timeScale: self.direction, duration: 1.2 }),
          });
        },
      });
    },

    projets(c) {
      const works = $('[data-works]', c);
      const items = $$('.work', works);

      segmented($('[data-filter]', c), (value) => {
        const state = Flip.getState(items, { props: 'opacity' });
        items.forEach((it) => { it.style.display = value === 'all' || it.dataset.cat === value ? '' : 'none'; });
        Flip.from(state, {
          duration: 0.9, ease: 'expo.inOut', absolute: true, stagger: 0.03,
          onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.25, ease: 'expo.out' }),
          onLeave: (els) => gsap.to(els, { opacity: 0, y: -30, duration: 0.4, ease: 'power2.in' }),
          onComplete: () => ScrollTrigger.refresh(),
        });
      });

      segmented($('[data-view]', c), (value) => {
        hidePreview();
        const state = Flip.getState(items);
        works.classList.toggle('is-grid', value === 'grid');
        Flip.from(state, { duration: 1.1, ease: 'expo.inOut', absolute: true, stagger: 0.035, onComplete: () => ScrollTrigger.refresh() });
        if (value === 'grid') gsap.from($$('.work__art', works), { opacity: 0, scale: 0.8, duration: 1, delay: 0.45, stagger: 0.05, ease: 'expo.out' });
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
      items.forEach((it) => on(it, 'pointerenter', () => {
        if (works.classList.contains('is-grid')) return;
        art.style.setProperty('--h', it.dataset.hue);
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

      $$('.weapon', c).forEach((wp) => {
        const flip = () => wp.classList.toggle('is-flipped');
        if (!fine) on(wp, 'click', flip);
        on(wp, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
      });
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
      on(form, 'input', (e) => e.target.closest('.field')?.classList.remove('is-error'));
      on(form, 'submit', (e) => {
        e.preventDefault();
        if (btn.classList.contains('is-sending')) return;
        let ok = true;
        $$('.field', form).forEach((f) => {
          const input = $('input, textarea', f);
          const valid = input.checkValidity() && input.value.trim() !== '';
          f.classList.toggle('is-error', !valid);
          if (!valid) { ok = false; gsap.fromTo(f, { x: -12 }, { x: 0, duration: 0.8, ease: 'elastic.out(1, .3)' }); }
        });
        if (!ok) return toast('Le passeur exige que <b>tous les champs</b> soient remplis.');
        btn.classList.add('is-sending');
        gsap.delayedCall(1.5, () => {
          btn.classList.replace('is-sending', 'is-sent');
          burst(1.2);
          toast('<b>Obole reçue.</b> Votre message traverse le Styx (pour de faux).');
          gsap.delayedCall(3.2, () => {
            btn.classList.remove('is-sent');
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
    const shapes = $$('.loader__sigil circle, .loader__sigil path', loader);
    shapes.forEach((s) => { const l = s.getTotalLength(); gsap.set(s, { strokeDasharray: l, strokeDashoffset: l }); });
    const count = $('.loader__count', loader);
    const o = { v: 0 };

    return new Promise((resolve) => {
      gsap.timeline({ onComplete: () => loader.remove() })
        .to(shapes, { strokeDashoffset: 0, duration: 1.6, stagger: 0.12, ease: 'power2.inOut' }, 0)
        .to(o, { v: 100, duration: 2.1, ease: 'power3.inOut', onUpdate: () => { count.textContent = String(Math.round(o.v)).padStart(3, '0'); } }, 0)
        .fromTo('.loader__name', { opacity: 0, letterSpacing: '0.3em' }, { opacity: 1, letterSpacing: '0.8em', duration: 1.4, ease: 'expo.out' }, 0.9)
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
    titleSplit = SplitText.create(tTitle, { type: 'chars', charsClass: 'char' });
    gsap.set(card, { opacity: 1, y: 0 });
    gsap.set(current, { transformOrigin: `50% ${scrollY + innerHeight / 2}px` });

    return gsap.timeline()
      .set(T, { visibility: 'visible' })
      .to(current, { scale: 0.93, opacity: 0.25, filter: 'blur(6px)', duration: 0.95, ease: 'expo.inOut' }, 0)
      .fromTo(panels, { xPercent: -110 }, { xPercent: 0, duration: 1.05, ease: 'expo.inOut', stagger: 0.09 }, 0)
      .add(() => burst(1), 0.45)
      .fromTo(tNum, { opacity: 0, y: 20, letterSpacing: '1.4em' }, { opacity: 1, y: 0, letterSpacing: '0.5em', duration: 0.9, ease: 'expo.out' }, 0.8)
      .fromTo(titleSplit.chars, { yPercent: 120, rotate: 12, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 0.9, stagger: 0.03, ease: 'expo.out' }, 0.82)
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
     Démarrage
     ========================================================================== */
  magnetic(nav, (el, ev, fn) => el.addEventListener(ev, fn));

  if (reduce) {
    // Mouvement réduit : navigation classique, pas de loader ni de transition
    document.fonts.ready.then(() => {
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
    prevent: ({ el }) => el.target === '_blank' || el.protocol === 'mailto:',
    transitions: [{
      name: 'hades',
      async once({ next }) {
        await document.fonts.ready;
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
        await uncover().add(() => playIntro(next.container), 0.55);
      },
    }],
  });
})();
