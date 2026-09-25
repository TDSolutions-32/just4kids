/* ==========================================================================
   Just 4 Kids — interaction runtime
   Modules: scroll physics · parallax · hero stars · split reveal · tile reveal ·
            magnetic elements · cursor · programs matrix · slideshows · FAQ orb ·
            drawer · rate tabs · drop-in estimator · year strip ·
            live center status · visit calendar · request form
   ========================================================================== */
(() => {
  'use strict';

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE    = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

  const CENTER = {
    tz: 'America/New_York',
    // [open, close] in 24h per weekday (0 = Sun); Saturday is by reservation
    hours: { 1: [7, 21], 2: [7, 21], 3: [7, 21], 4: [7, 21], 5: [7, 21], 6: [9, 19] },
    apptDays: [6],
    email: 'admin@just4kidsinc.com',
  };

  /* ------------------------------------------------------------------------
     1 · SCROLL PHYSICS (Lenis) + chrome state
     ------------------------------------------------------------------------ */
  let lenis = null;
  let scrollY = window.scrollY;
  const chrome = $('[data-chrome]');
  const onScroll = (y) => { scrollY = y; chrome?.classList.toggle('is-scrolled', y > 8); };

  if (!REDUCED && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on('scroll', (e) => onScroll(e.scroll));
  } else {
    addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  }

  const offsetTop = () => (chrome?.offsetHeight || 0) + ($('.ticker')?.offsetHeight || 0);
  const scrollToEl = (target) => {
    lenis ? lenis.scrollTo(target, { duration: 1.3, offset: -offsetTop() + 1 }) : target.scrollIntoView();
  };
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id.length > 1 && $(id);
    if (!target) return;
    e.preventDefault();
    scrollToEl(target);
  }));

  /* ------------------------------------------------------------------------
     2 · PARALLAX — [data-speed]
     ------------------------------------------------------------------------ */
  const parallax = REDUCED || innerWidth <= 980 ? [] : $$('[data-speed]').map((el) => ({ el, speed: parseFloat(el.dataset.speed), mid: 0 }));
  const measure = () => parallax.forEach((p) => {
    p.el.style.transform = '';
    const r = p.el.getBoundingClientRect();
    p.mid = r.top + scrollY + r.height / 2;
  });

  /* ------------------------------------------------------------------------
     3 · HERO STARS — pointer depth
     ------------------------------------------------------------------------ */
  const stars = FINE && !REDUCED ? $$('[data-depth]').map((el) => ({ el, d: parseFloat(el.dataset.depth), x: 0, y: 0 })) : [];

  /* ------------------------------------------------------------------------
     4 · SPLIT-TYPE REVEAL + TILE REVEAL
     ------------------------------------------------------------------------ */
  $$('[data-split]').forEach((el) => {
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            [...part].forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'c';
              c.style.setProperty('--i', i++);
              c.textContent = ch;
              w.append(c);
            });
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
  });

  const revealIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
  }), { threshold: 0.25 });
  $$('[data-split]').forEach((el) => revealIO.observe(el));
  $$('[data-reveal]').forEach((el) => {
    el.style.setProperty('--d', [...el.parentElement.children].indexOf(el) % 4);
    revealIO.observe(el);
  });

  /* ------------------------------------------------------------------------
     5 · MAGNETIC ELEMENTS + CURSOR
     ------------------------------------------------------------------------ */
  const MAG_RADIUS = 30;
  const cursorEl = $('.cursor');
  const pointer = { x: -999, y: -999, cx: -999, cy: -999 };
  const magnets = FINE && !REDUCED ? $$('[data-magnetic]').map((el) => ({
    el, label: el.querySelector('.cta__label, .burger__label'), x: 0, y: 0, tx: 0, ty: 0,
  })) : [];

  if (FINE) {
    addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', () => cursorEl?.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cursorEl?.classList.remove('is-hidden'));
  }

  const tickMagnets = () => {
    let anyActive = false;
    magnets.forEach((m) => {
      const r = m.el.getBoundingClientRect();
      if (r.width === 0) return;
      const dx = Math.max(r.left - pointer.x, 0, pointer.x - r.right);
      const dy = Math.max(r.top - pointer.y, 0, pointer.y - r.bottom);
      const inField = Math.hypot(dx, dy) <= MAG_RADIUS;
      if (inField) {
        m.tx = (pointer.x - (r.left + r.width / 2)) * 0.3;
        m.ty = (pointer.y - (r.top + r.height / 2)) * 0.3;
        anyActive = true;
      } else { m.tx = 0; m.ty = 0; }
      const k = inField ? 0.18 : 0.12;
      m.x = lerp(m.x, m.tx, k);
      m.y = lerp(m.y, m.ty, k);
      if (Math.abs(m.x) < 0.01 && Math.abs(m.y) < 0.01 && !inField) { m.x = m.y = 0; }
      m.el.style.transform = `translate3d(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px, 0)`;
      if (m.label) m.label.style.transform = `translate3d(${(m.x * 0.5).toFixed(2)}px, ${(m.y * 0.5).toFixed(2)}px, 0)`;
    });
    cursorEl?.classList.toggle('is-magnet', anyActive);
  };

  /* ------------------------------------------------------------------------
     6 · MASTER rAF LOOP
     ------------------------------------------------------------------------ */
  const frame = (t) => {
    lenis?.raf(t);
    const vhMid = scrollY + innerHeight / 2;
    for (const p of parallax) {
      p.el.style.transform = `translate3d(0, ${((vhMid - p.mid) * p.speed).toFixed(2)}px, 0)`;
    }
    if (FINE) {
      pointer.cx = lerp(pointer.cx, pointer.x, 0.25);
      pointer.cy = lerp(pointer.cy, pointer.y, 0.25);
      if (cursorEl) cursorEl.style.transform = `translate3d(${pointer.cx}px, ${pointer.cy}px, 0)`;
      if (magnets.length) tickMagnets();
      if (stars.length && scrollY < innerHeight) {
        const nx = pointer.x < 0 ? 0 : pointer.x / innerWidth - 0.5;
        const ny = pointer.y < 0 ? 0 : pointer.y / innerHeight - 0.5;
        for (const s of stars) {
          s.x = lerp(s.x, nx * 40 * s.d, 0.08);
          s.y = lerp(s.y, ny * 40 * s.d, 0.08);
          s.el.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0) rotate(${(s.x * 0.4).toFixed(2)}deg)`;
        }
      }
    }
    requestAnimationFrame(frame);
  };
  addEventListener('resize', () => requestAnimationFrame(measure));
  addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  measure();
  requestAnimationFrame(frame);

  /* ------------------------------------------------------------------------
     7 · PROGRAMS MATRIX — hover (desktop) / focus + tap → data-active
     ------------------------------------------------------------------------ */
  const matrix = $('[data-matrix]');
  if (matrix) {
    const panels = $$('[data-panel]', matrix);
    const activate = (idx) => {
      if (matrix.dataset.active === String(idx)) return;
      matrix.dataset.active = idx;
      panels.forEach((p, i) => {
        p.classList.toggle('is-active', i === idx);
        p.setAttribute('aria-expanded', i === idx);
      });
      setTimeout(() => { measure(); lenis?.resize(); }, 950);
    };
    panels.forEach((p, i) => {
      if (FINE) p.addEventListener('pointerenter', () => activate(i));
      p.addEventListener('focus', () => activate(i));
      p.addEventListener('click', () => activate(i));
      p.addEventListener('keydown', (e) => {
        if (e.target !== p) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); panels[(i + 1) % panels.length].focus(); }
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); panels[(i + panels.length - 1) % panels.length].focus(); }
      });
    });
    activate(0);
  }

  /* ------------------------------------------------------------------------
     7b · SLIDESHOWS — [data-slideshow] > [data-slide][data-dur] (s)
     Runs only while its panel is open AND on screen.
     ------------------------------------------------------------------------ */
  $$('[data-slideshow]').forEach((box) => {
    const items = $$('[data-slide]', box);
    const bar = $('[data-slide-bar]', box);
    const panel = box.closest('[data-panel]');
    let idx = 0, timer = null, running = false, onScreen = false;
    const live = () => !REDUCED && onScreen && (!panel || panel.classList.contains('is-active'));

    const go = (n) => {
      idx = n;
      items.forEach((el, k) => el.classList.toggle('is-on', k === n));
      const ms = parseFloat(items[n].dataset.dur) * 1000;
      if (bar) {
        bar.style.transition = 'none';
        bar.style.transform = 'scaleX(0)';
        void bar.offsetWidth;
        bar.style.transition = `transform ${ms}ms linear`;
        bar.style.transform = 'scaleX(1)';
      }
      timer = setTimeout(() => go((n + 1) % items.length), ms);
    };
    const start = () => { if (running) return; running = true; go(idx); };
    const stop = () => {
      running = false;
      clearTimeout(timer);
      if (bar) { bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)'; }
    };
    const sync = () => (live() ? start() : stop());
    if (panel) new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['class'] });
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }, { threshold: 0.2 }).observe(box);
  });

  /* ------------------------------------------------------------------------
     8 · FAQ ORB — hover opens (fine pointer), tap pins; Esc/outside closes
     ------------------------------------------------------------------------ */
  const faq = $('[data-faq]');
  let setFaq = () => {};
  if (faq) {
    const orb = $('[data-faq-orb]', faq);
    const panel = $('#faq-panel');
    let pinned = false, closeT;
    setFaq = (open) => {
      clearTimeout(closeT);
      if (open === faq.classList.contains('is-open')) return;
      orb.setAttribute('aria-expanded', open);
      if (open) {
        panel.hidden = false;
        void panel.offsetWidth;
        faq.classList.add('is-open');
      } else {
        pinned = false;
        faq.classList.remove('is-open');
        const done = () => { if (!faq.classList.contains('is-open')) panel.hidden = true; };
        REDUCED ? done() : setTimeout(done, 450);
      }
    };
    if (FINE) {
      faq.addEventListener('pointerenter', () => setFaq(true));
      faq.addEventListener('pointerleave', () => { if (!pinned) closeT = setTimeout(() => setFaq(false), 250); });
    }
    orb.addEventListener('click', () => {
      if (faq.classList.contains('is-open') && pinned) { setFaq(false); return; }
      pinned = true;
      setFaq(true);
    });
    document.addEventListener('pointerdown', (e) => { if (!faq.contains(e.target)) setFaq(false); });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && faq.classList.contains('is-open')) { setFaq(false); orb.focus({ preventScroll: true }); }
    });
  }

  /* ------------------------------------------------------------------------
     9 · DRAWER — circle clip reveal, Esc/links close, focus return, scroll lock
     ------------------------------------------------------------------------ */
  const burger = $('.burger');
  const drawer = $('#drawer');
  const setDrawer = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.querySelector('.burger__label').textContent = open ? 'Close' : 'Menu';
    if (open) {
      setFaq(false);
      drawer.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open')));
      lenis?.stop();
      drawer.querySelector('a')?.focus({ preventScroll: true });
    } else {
      drawer.classList.remove('is-open');
      lenis?.start();
      const done = () => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; };
      REDUCED ? done() : drawer.addEventListener('transitionend', done, { once: true });
      burger.focus({ preventScroll: true });
    }
  };
  burger.addEventListener('click', () => setDrawer(burger.getAttribute('aria-expanded') !== 'true'));
  $$('[data-drawer-link]').forEach((a) => a.addEventListener('click', () => setDrawer(false)));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setDrawer(false);
  });

  /* ------------------------------------------------------------------------
     10 · RATE TABS — roving tabindex, arrow keys, sliding ink
     ------------------------------------------------------------------------ */
  const tabsBox = $('[data-tabs]');
  let selectTab = () => {};
  if (tabsBox) {
    const tabs = $$('[role="tab"]', tabsBox);
    const ink = $('.tabs__ink', tabsBox);
    const placeInk = () => {
      const t = tabs.find((b) => b.getAttribute('aria-selected') === 'true');
      if (!t || !ink) return;
      ink.style.width = `${t.offsetWidth}px`;
      ink.style.transform = `translateX(${t.offsetLeft}px)`;
    };
    selectTab = (key, focus = false) => {
      tabs.forEach((b) => {
        const on = b.dataset.tab === key;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      $$('[data-pane]', tabsBox).forEach((p) => { p.hidden = p.dataset.pane !== key; });
      placeInk();
      lenis?.resize();
    };
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => selectTab(b.dataset.tab));
      b.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        selectTab(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true);
      });
    });
    $$('[data-rate-tab]').forEach((a) => a.addEventListener('click', () => selectTab(a.dataset.rateTab)));
    addEventListener('resize', placeInk);
    document.fonts?.ready.then(placeInk);
    placeInk();
  }

  /* ------------------------------------------------------------------------
     11 · DROP-IN ESTIMATOR — published rates (just4kidsinc.com/pricing)
     Pay-as-you-go vs cheapest hourly-package mix vs monthly package.
     Package hours are child-hours (deducted per child).
     ------------------------------------------------------------------------ */
  const est = $('[data-est]');
  if (est) {
    const PACKS = [[80, 580], [40, 320], [20, 170], [10, 90]];
    const MONTHLY = { 1: 650, 2: 800, 3: 950, 4: 1100 };   // 80 hrs per child
    const MAX_KIDS = 4;
    let kids = 1;
    const hoursEl = $('[data-est-hours]', est);

    // Min-cost mix of packages covering `need` child-hours (10-hour units, unbounded)
    const packMix = (need) => {
      const units = Math.ceil(need / 10);
      const best = Array(units + 9).fill(Infinity); const pick = Array(units + 9).fill(null);
      best[0] = 0;
      for (let u = 1; u < best.length; u++) {
        for (const [h, c] of PACKS) {
          const prev = u - h / 10;
          if (prev >= 0 && best[prev] + c < best[u]) { best[u] = best[prev] + c; pick[u] = h; }
        }
      }
      let bestU = units;
      for (let u = units; u < best.length; u++) if (best[u] < best[bestU]) bestU = u;
      const parts = [];
      for (let u = bestU; u > 0; u -= pick[u] / 10) parts.push(pick[u]);
      const counts = parts.reduce((m, h) => m.set(h, (m.get(h) || 0) + 1), new Map());
      const label = [...counts].sort((a, b) => b[0] - a[0]).map(([h, n]) => (n > 1 ? `${n} × ${h}h` : `${h}h`)).join(' + ');
      return { cost: best[bestU], label, hours: bestU * 10 };
    };

    const render = () => {
      const h = +hoursEl.value;
      const childHours = kids * h;
      $('[data-est-kids-out]', est).textContent = kids;
      $('[data-est-hours-out]', est).textContent = h;
      hoursEl.style.setProperty('--p', `${((h - hoursEl.min) / (hoursEl.max - hoursEl.min)) * 100}%`);
      $$('[data-est-kids]', est).forEach((b) => {
        const d = +b.dataset.estKids;
        b.disabled = (d < 0 && kids <= 1) || (d > 0 && kids >= MAX_KIDS);
      });

      const payg = { name: 'Pay as you go', cost: childHours * (kids === 1 ? 10 : 8), note: kids === 1 ? '$10/hr' : `$8/hr × ${kids}` };
      const mix = packMix(childHours);
      const pack = { name: 'Hourly packages', cost: mix.cost, note: mix.label };
      const monthlyOk = h <= 80 && MONTHLY[kids];
      const monthly = { name: 'Monthly package', cost: monthlyOk ? MONTHLY[kids] : Infinity, note: monthlyOk ? `${kids * 80} hrs` : 'over 80 hrs/child' };

      const opts = [payg, pack, monthly];
      const best = opts.reduce((a, b) => (b.cost < a.cost ? b : a));
      $('[data-est-plan]', est).textContent = best.name;
      $('[data-est-total]', est).textContent = money(best.cost);
      $('[data-est-rows]', est).innerHTML = opts.map((o) => {
        const cls = o === best ? 'is-best' : o.cost === Infinity ? 'is-na' : '';
        return `<li class="${cls}"><span>${o === best ? '★ ' : ''}${o.name} · ${o.note}</span><span>${o.cost === Infinity ? '—' : money(o.cost)}</span></li>`;
      }).join('');
    };
    $$('[data-est-kids]', est).forEach((b) => b.addEventListener('click', () => {
      kids = Math.min(MAX_KIDS, Math.max(1, kids + +b.dataset.estKids));
      render();
    }));
    hoursEl.addEventListener('input', render);
    render();
  }

  /* ------------------------------------------------------------------------
     12 · YEAR STRIP — marks the current season, drag-to-scroll on desktop
     ------------------------------------------------------------------------ */
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: CENTER.tz }));
  today.setHours(0, 0, 0, 0);

  const strip = $('[data-strip]');
  if (strip) {
    const seasons = $$('[data-season]', strip);
    const starts = seasons.map((s) => new Date(s.dataset.season + 'T00:00:00'));
    let nowIdx = -1;
    seasons.forEach((s, i) => {
      const next = starts[i + 1];
      if (today >= starts[i] && (!next || today < next)) { s.classList.add('is-now'); nowIdx = i; }
      else if (next && today >= next) s.classList.add('is-past');
    });
    if (nowIdx > 0) strip.scrollLeft = seasons[nowIdx].offsetLeft - strip.offsetLeft;

    if (FINE) {
      let down = false, sx = 0, sl = 0, moved = false;
      strip.addEventListener('pointerdown', (e) => {
        if (e.target.closest('a')) return;
        down = true; moved = false; sx = e.clientX; sl = strip.scrollLeft;
      });
      addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - sx;
        if (Math.abs(dx) > 4) { moved = true; strip.classList.add('is-drag'); }
        strip.scrollLeft = sl - dx;
      });
      addEventListener('pointerup', () => {
        if (!down) return;
        down = false;
        strip.classList.remove('is-drag');
        if (moved) {
          const w = seasons[0].offsetWidth + 16;
          strip.scrollTo({ left: Math.round(strip.scrollLeft / w) * w, behavior: 'smooth' });
        }
      });
    }
  }

  /* ------------------------------------------------------------------------
     13 · LIVE STATUS — computed in center timezone, refreshed every 30s
     ------------------------------------------------------------------------ */
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const centerNow = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CENTER.tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return { dow: DOW.indexOf(get('weekday')), mins: +get('hour') * 60 + +get('minute') };
  };
  const fmtHour = (h) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;

  const renderStatus = () => {
    const el = $('[data-status]');
    const text = $('[data-status-text]');
    if (!el) return;
    const { dow, mins } = centerNow();
    const hrs = CENTER.hours[dow];
    const appt = CENTER.apptDays.includes(dow);
    const isOpen = !!hrs && mins >= hrs[0] * 60 && mins < hrs[1] * 60;
    el.classList.toggle('is-open', isOpen && !appt);
    el.classList.toggle('is-appt', isOpen && appt);

    if (isOpen) {
      const left = hrs[1] * 60 - mins;
      const tail = left <= 60 ? `closes in ${left} min` : `until ${fmtHour(hrs[1])}`;
      text.textContent = appt ? `Open by reservation · ${tail}` : `Open now · ${tail}`;
    } else if (hrs && mins < hrs[0] * 60) {
      text.textContent = `Closed · opens today ${fmtHour(hrs[0])}${appt ? ' (by reservation)' : ''}`;
    } else {
      let next = (dow + 1) % 7;
      while (!CENTER.hours[next]) next = (next + 1) % 7;
      const label = next === (dow + 1) % 7 ? 'tomorrow' : DOW[next];
      text.textContent = `Closed · opens ${label} ${fmtHour(CENTER.hours[next][0])}`;
    }
  };
  renderStatus();
  setInterval(renderStatus, 30_000);

  /* ------------------------------------------------------------------------
     14 · VISIT CALENDAR — rolling 14 days from this week's Monday.
     Sundays disabled, Saturdays flagged by-reservation; pick → request form.
     ------------------------------------------------------------------------ */
  const reqDate = $('[data-req-date]');
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (reqDate) reqDate.min = iso(today);

  const cal = $('[data-cal]');
  if (cal) {
    const grid = $('[data-cal-grid]', cal);
    const selectedEl = $('[data-cal-selected]', cal);
    const overlay = $('[data-cal-overlay]', cal);
    const bookBtn = $('[data-cal-book]', cal);
    const closeBtn = $('[data-cal-close]', cal);
    let picked = null;

    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const end = new Date(start); end.setDate(start.getDate() + 13);
    const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
    const longFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    $('[data-cal-month]', cal).textContent = start.getMonth() === end.getMonth()
      ? monthFmt.format(start)
      : `${start.toLocaleString('en-US', { month: 'short' })} — ${monthFmt.format(end)}`;

    const setOverlay = (open) => {
      cal.classList.toggle('is-picked', open);
      overlay.setAttribute('aria-hidden', !open);
      bookBtn.tabIndex = closeBtn.tabIndex = open ? 0 : -1;
      if (!open) $$('.cal__day', grid).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    };

    for (let i = 0; i < 14; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const appt = CENTER.apptDays.includes(d.getDay());
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal__day mono' + (appt ? ' is-appt' : '');
      btn.textContent = d.getDate();
      btn.setAttribute('aria-label', longFmt.format(d) + (appt ? ', by reservation' : ''));
      btn.setAttribute('aria-pressed', 'false');
      if (+d === +today) btn.setAttribute('aria-current', 'date');
      if (d < today || !CENTER.hours[d.getDay()]) btn.disabled = true;

      btn.addEventListener('click', () => {
        $$('.cal__day', grid).forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        picked = d;
        selectedEl.textContent = longFmt.format(d) + (appt ? ' · by reservation' : '');
        setOverlay(true);
        bookBtn.focus({ preventScroll: true });
      });
      li.append(btn);
      grid.append(li);
    }

    bookBtn.addEventListener('click', () => {
      if (picked && reqDate) reqDate.value = iso(picked);
      setOverlay(false);
      setTimeout(() => $('#request input[name="name"]')?.focus({ preventScroll: true }), 700);
    });
    closeBtn.addEventListener('click', () => setOverlay(false));
    cal.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOverlay(false); });
  }

  /* ------------------------------------------------------------------------
     15 · REQUEST FORM — validates, then composes an email (no backend)
     ------------------------------------------------------------------------ */
  const req = $('[data-req]');
  if (req) {
    const err = $('[data-req-err]', req);
    req.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(req));
      const missing = ['name', 'phone'].filter((k) => !String(f[k] || '').trim());
      $$('input, select, textarea', req).forEach((el) => el.removeAttribute('aria-invalid'));
      missing.forEach((k) => req.elements[k].setAttribute('aria-invalid', 'true'));
      if (missing.length) {
        err.textContent = 'Please add your name and phone so we can reach you.';
        req.elements[missing[0]].focus();
        return;
      }
      err.textContent = '';
      const when = f.date ? new Date(f.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Flexible';
      const body = [
        `Name: ${f.name}`, `Phone: ${f.phone}`, `Email: ${f.email || '—'}`,
        `Interested in: ${f.service}`, `Preferred day: ${when}`, `Children & ages: ${f.kids || '—'}`,
        '', f.message || '',
      ].join('\n');
      location.href = `mailto:${CENTER.email}?subject=${encodeURIComponent(`Information request — ${f.service}`)}&body=${encodeURIComponent(body)}`;
    });
  }

  /* ------------------------------------------------------------------------
     16 · MISC
     ------------------------------------------------------------------------ */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
