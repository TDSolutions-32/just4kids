/* ==========================================================================
   Just 4 Kids — "Storybook Home" runtime
   Modules: nav (sticky shadow, mobile menu, active link) · reveal on scroll ·
            pricing links → open plan details · drop-in planner ·
            season timeline · live center status · request form
   ========================================================================== */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

  const CENTER = {
    tz: 'America/New_York',
    // [open, close] in hours (24h, decimals allowed) per weekday (0 = Sun)
    hours: { 1: [7, 21], 2: [7, 21], 3: [7, 21], 4: [7, 21], 5: [7, 21], 6: [9, 19] },
    apptDays: [],   // weekdays that are by reservation only (none currently)
    // School year: weekdays open early at 6:30am for before-school drop-off.
    // Onslow County Schools 2026-27: first day Aug 24, 2026, last day Jun 4, 2027.
    // Update each year from onslow.k12.nc.us.
    schoolYear: { from: '2026-08-24', to: '2027-06-04', weekdayOpen: 6.5 },
    email: 'admin@just4kidsinc.com',
  };

  /* ------------------------------------------------------------------------
     1 · NAV — shadow once scrolled, mobile menu, current-section highlight
     ------------------------------------------------------------------------ */
  const nav = $('[data-nav]');
  const toggle = $('[data-nav-toggle]');
  const links = $('#nav-links');
  addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 10), { passive: true });

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    links.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', links).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setMenu(false); });

  // Every section is watched so the highlight clears in sections without a nav link
  const navLinks = $$('a[href^="#"]', links);
  const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    navLinks.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach((s) => spy.observe(s));

  /* ------------------------------------------------------------------------
     2 · REVEAL — fade-up as blocks enter; siblings stagger
     ------------------------------------------------------------------------ */
  const reveal = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); reveal.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('[data-reveal]').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 5));
    reveal.observe(el);
  });

  /* ------------------------------------------------------------------------
     3 · PRICING LINKS — "See 2026–27 plans" opens that plan's full rates
     ------------------------------------------------------------------------ */
  $$('[data-plan-open]').forEach((a) => a.addEventListener('click', () => {
    const d = $(`[data-plan="${a.dataset.planOpen}"]`);
    if (d) d.open = true;
  }));

  /* ------------------------------------------------------------------------
     4 · PLAN YOUR MONTH — drop-in estimator (just4kidsinc.com/pricing)
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
      const best = Array(units + 9).fill(Infinity);
      const pick = Array(units + 9).fill(null);
      best[0] = 0;
      for (let u = 1; u < best.length; u++) {
        for (const [h, c] of PACKS) {
          const prev = u - h / 10;
          if (prev >= 0 && best[prev] + c < best[u]) { best[u] = best[prev] + c; pick[u] = h; }
        }
      }
      let bestU = units;
      for (let u = units; u < best.length; u++) if (best[u] < best[bestU]) bestU = u;
      const counts = new Map();
      for (let u = bestU; u > 0; u -= pick[u] / 10) counts.set(pick[u], (counts.get(pick[u]) || 0) + 1);
      const label = [...counts].sort((a, b) => b[0] - a[0]).map(([h, n]) => (n > 1 ? `${n} × ${h}h` : `${h}h`)).join(' + ');
      return { cost: best[bestU], label };
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
      $('[data-est-plan]', est).textContent = `Best value: ${best.name.toLowerCase()}`;
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
     5 · SEASON TIMELINE — mark the current season, fade past ones
     ------------------------------------------------------------------------ */
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: CENTER.tz }));
  today.setHours(0, 0, 0, 0);

  const pins = $$('[data-season]');
  const starts = pins.map((p) => new Date(p.dataset.season + 'T00:00:00'));
  pins.forEach((p, i) => {
    const next = starts[i + 1];
    if (today >= starts[i] && (!next || today < next)) p.classList.add('is-now');
    else if (next && today >= next) p.classList.add('is-past');
  });

  /* ------------------------------------------------------------------------
     6 · LIVE STATUS — computed in center timezone, refreshed every 30s
     ------------------------------------------------------------------------ */
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const centerNow = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CENTER.tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return { dow: DOW.indexOf(get('weekday')), mins: +get('hour') * 60 + +get('minute') };
  };
  const fmtHour = (h) => {
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return `${((hh + 11) % 12) + 1}${mm ? ':' + String(mm).padStart(2, '0') : ''}${hh < 12 ? 'am' : 'pm'}`;
  };
  // Opening hours for a given weekday, with the early school-year open on weekdays
  const inSchoolYear = (d) => {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return iso >= CENTER.schoolYear.from && iso <= CENTER.schoolYear.to;
  };
  const hoursFor = (dow, date) => {
    const h = CENTER.hours[dow];
    if (!h) return null;
    return dow >= 1 && dow <= 5 && inSchoolYear(date) ? [CENTER.schoolYear.weekdayOpen, h[1]] : h;
  };

  const renderStatus = () => {
    const { dow, mins } = centerNow();
    const nowDate = new Date(new Date().toLocaleString('en-US', { timeZone: CENTER.tz }));
    const hrs = hoursFor(dow, nowDate);
    const appt = CENTER.apptDays.includes(dow);
    const isOpen = !!hrs && mins >= hrs[0] * 60 && mins < hrs[1] * 60;

    let msg;
    if (isOpen) {
      const left = hrs[1] * 60 - mins;
      const tail = left <= 60 ? `closes in ${left} min` : `until ${fmtHour(hrs[1])}`;
      msg = appt ? `Open by reservation · ${tail}` : `We're open · ${tail}`;
    } else if (hrs && mins < hrs[0] * 60) {
      msg = `Opens today at ${fmtHour(hrs[0])}${appt ? ' (by reservation)' : ''}`;
    } else {
      let ahead = 1;
      while (!CENTER.hours[(dow + ahead) % 7]) ahead++;
      const next = (dow + ahead) % 7;
      const nextDate = new Date(nowDate); nextDate.setDate(nowDate.getDate() + ahead);
      const label = ahead === 1 ? 'tomorrow' : DAY_NAMES[next];
      msg = `Closed now · opens ${label} at ${fmtHour(hoursFor(next, nextDate)[0])}`;
    }
    // Shown in the hero photo card and the Visit section
    $$('[data-status]').forEach((el) => {
      el.classList.toggle('is-open', isOpen && !appt);
      el.classList.toggle('is-appt', isOpen && appt);
      $('[data-status-text]', el).textContent = msg;
    });
  };
  renderStatus();
  setInterval(renderStatus, 30_000);

  /* ------------------------------------------------------------------------
     7 · REQUEST FORM DATE — no past days
     ------------------------------------------------------------------------ */
  const req = $('[data-req]');
  const reqDate = $('[data-req-date]');
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (reqDate) reqDate.min = iso(today);

  /* ------------------------------------------------------------------------
     8 · REQUEST FORM — validates, then composes an email (no backend)
     ------------------------------------------------------------------------ */
  if (req) {
    const err = $('[data-req-err]', req);
    req.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(req));
      const missing = ['name', 'phone'].filter((k) => !String(f[k] || '').trim());
      $$('input, select, textarea', req).forEach((el) => el.removeAttribute('aria-invalid'));
      missing.forEach((k) => req.elements[k].setAttribute('aria-invalid', 'true'));
      if (missing.length) {
        err.textContent = 'Please add your name and phone number so we can reach you.';
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

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
