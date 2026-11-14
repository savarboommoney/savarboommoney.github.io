/* ТЫ ПРАВ — первый экран без прокрутки-интро: кадр с Фемидой, живые весы, появление шапки и текста */
(() => {
const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const frame = $('frame'), first = $('top'), lvScales = $('lvScales');

if (frame) {
/* кадр 16:9 во весь экран; на телефоне Фемида правее и ниже, чтобы освободить верх под текст */
function layout() {
  const W = first.clientWidth, H = first.clientHeight, portrait = W / H < 1;
  const focus = portrait ? .66 : .5, ys = portrait ? .3 : 0;
  const s = Math.max(W / 1920, H / 1080), dw = 1920 * s, dh = 1080 * s;
  const dx = clamp(W / 2 - focus * dw, W - dw, 0), dy = (H - dh) / 2 + ys * H;
  frame.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${s.toFixed(5)})`;
}
addEventListener('resize', layout); layout();

/* за мышкой: слои сцены расходятся по глубине, весы наклоняются (поверх покачивания из CSS) */
const layers = [...frame.querySelectorAll('.ly')].map(el => [el, +el.dataset.d]);
let mx = 0, my = 0, tmx = 0, tmy = 0;
// цикл крутится только пока мышь двигается над первым экраном (на телефоне и при прокрутке ниже — не грузит процессор)
let ticking = false;
const tick = () => {
  mx += (tmx - mx) * .05; my += (tmy - my) * .05;
  for (const [el, d] of layers) el.style.transform = `translate(${(-mx * 9 * d).toFixed(2)}px,${(-my * 5 * d).toFixed(2)}px)`;
  lvScales.style.transform = `rotate(${(-mx * 4.5).toFixed(2)}deg)`;
  if (Math.abs(tmx - mx) > .002 || Math.abs(tmy - my) > .002) requestAnimationFrame(tick); else ticking = false;
};
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || scrollY > first.clientHeight) return;
  tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1;
  if (!ticking) { ticking = true; requestAnimationFrame(tick); }
}, { passive: true });

// отладка: #h=900 — первый экран фиксированной высоты (для скриншота всей страницы)
if (location.hash.startsWith('#h=')) { first.style.height = first.style.minHeight = location.hash.slice(3) + 'px'; layout(); }
}

/* ---------- появление блоков при прокрутке ---------- */
document.querySelectorAll('[data-rv-group]').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--i', i)));
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-rv],[data-rv-group]').forEach(el => io.observe(el));

/* ---------- счётчики ---------- */
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; cio.unobserve(e.target);
  const el = e.target, to = +el.dataset.count, t0 = performance.now(), dur = 1600;
  (function f(t) { const k = clamp((t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
}), { threshold: .6 });
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('[data-count]').forEach(el => { el.textContent = '0'; cio.observe(el); });

/* ---------- липкая шапка: прячется вниз / появляется вверх, полоска прогресса ---------- */
const hdr = document.querySelector('.hdr');
let lastY = scrollY;
const onScroll = () => {
  const fH = first ? first.clientHeight : 0, y = scrollY, fixed = !first || y > fH * .7;
  hdr.classList.toggle('fixed', fixed);
  const megaOpen = document.querySelector('.has-mega.open');
  // шапка всегда на виду (раньше пряталась при прокрутке вниз — пользователь попросил оставить видимой)
  hdr.classList.remove('hide'); void megaOpen;
  if (!fixed) hdr.classList.remove('hide');
  lastY = y;
  hdr.style.setProperty('--p', clamp(y / (document.documentElement.scrollHeight - innerHeight)).toFixed(4));
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---------- живой статус: работаем 10:00–22:00 по Петербургу ---------- */
const liveStatus = () => {
  const h = +new Intl.DateTimeFormat('ru-RU', { hour: 'numeric', hour12: false, timeZone: 'Europe/Moscow' }).format(new Date());
  const open = h >= 10 && h < 22;
  document.querySelectorAll('.hdr-phone').forEach(el => el.classList.toggle('is-closed', !open));
  document.querySelectorAll('.live-text').forEach(el => { el.textContent = open ? 'Сейчас на связи' : 'Ответим с 10:00 · примем заявку'; });
  return open;
};
window.tpIsOpen = liveStatus(); setInterval(() => { window.tpIsOpen = liveStatus(); }, 60000);

/* ---------- подсветка под пунктом меню ---------- */
const nav = document.querySelector('.hdr-nav'), glow = nav.querySelector('.nav-glow');
nav.querySelectorAll(':scope>a:not(.nav-vip), .nav-btn').forEach(a => a.addEventListener('pointerenter', () => {
  const r = a.getBoundingClientRect(), n = nav.getBoundingClientRect();
  glow.style.transform = `translateX(${r.left - n.left}px)`; glow.style.width = r.width + 'px'; nav.classList.add('glowing');
  nav.querySelectorAll('.is-hover').forEach(x => x.classList.remove('is-hover')); a.classList.add('is-hover');
}));
nav.addEventListener('pointerleave', () => { nav.classList.remove('glowing'); nav.querySelectorAll('.is-hover').forEach(x => x.classList.remove('is-hover')); });

/* ---------- мега-меню ---------- */
const mega = document.querySelector('.has-mega'), megaBtn = mega.querySelector('.nav-btn');
const burger = document.querySelector('.burger');
const setMega = v => { mega.classList.toggle('open', v); megaBtn.setAttribute('aria-expanded', v); document.body.classList.toggle('menu-open', v); };
burger.addEventListener('click', e => { e.stopPropagation(); setMega(!mega.classList.contains('open')); });
megaBtn.addEventListener('click', e => { e.stopPropagation(); setMega(!mega.classList.contains('open')); });
let megaT; mega.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { clearTimeout(megaT); setMega(true); } });
mega.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') megaT = setTimeout(() => setMega(false), 250); });
document.addEventListener('click', e => { if (!mega.contains(e.target)) setMega(false); });

/* ---------- попап ---------- */
const modal = $('modal');
const openModal = () => { modal.hidden = false; document.body.style.overflow = 'hidden'; setTimeout(() => modal.querySelector('input').focus(), 50); };
const closeModal = () => { modal.hidden = true; document.body.style.overflow = ''; };
document.querySelectorAll('[data-modal]').forEach(b => b.addEventListener('click', openModal));
modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); setMega(false); } });

/* ---------- отправка заявок (формы и чат-бот) ---------- */
// TODO: подключить реальную отправку (почта / Битрикс24). Сейчас заявка только пишется в консоль.
window.tpSendLead = data => { console.info('[заявка]', data); return Promise.resolve(); };

/* ---------- формы: маска телефона и проверка ---------- */
document.querySelectorAll('[data-phone]').forEach(inp => inp.addEventListener('input', () => {
  let d = inp.value.replace(/\D/g, ''); if (!d) { inp.value = ''; return; }
  if (d[0] === '8') d = '7' + d.slice(1); if (d[0] !== '7') d = '7' + d; d = d.slice(0, 11);
  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  inp.value = '+7' + (p[0] ? ' (' + p[0] : '') + (p[0].length === 3 ? ') ' : '') + p[1] + (p[2] ? '-' + p[2] : '') + (p[3] ? '-' + p[3] : '');
}));
document.querySelectorAll('.lead-form').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault(); let ok = true;
  f.querySelectorAll('.fld').forEach(l => l.classList.remove('err'));
  const name = f.elements.name, phone = f.elements.phone;
  if (!name.value.trim()) { name.closest('.fld').classList.add('err'); ok = false; }
  if (phone.value.replace(/\D/g, '').length < 11) { phone.closest('.fld').classList.add('err'); ok = false; }
  if (!f.elements.agree.checked) ok = false;
  if (!ok) return;
  window.tpSendLead({ source: f.dataset.form, name: name.value, phone: phone.value, text: f.elements.text?.value || '' });
  f.classList.add('sent'); setTimeout(() => { f.classList.remove('sent'); f.reset(); if (f.closest('.modal')) closeModal(); }, 4000);
}));

/* ---------- отзывы: слайдер ---------- */
const track = $('rvTrack');
if (track) {
const dots = $('rvDots'), cards = [...track.children];
dots.innerHTML = cards.map((_, i) => `<button type="button" aria-label="Отзыв ${i + 1}"></button>`).join('');
const go = i => track.scrollTo({ left: cards[clamp(i, 0, cards.length - 1)].offsetLeft - track.offsetLeft - 4 });
const cur = () => cards.reduce((b, c, i) => Math.abs(c.offsetLeft - track.offsetLeft - track.scrollLeft) < Math.abs(cards[b].offsetLeft - track.offsetLeft - track.scrollLeft) ? i : b, 0);
const mark = () => { const c = cur(); [...dots.children].forEach((d, i) => d.classList.toggle('on', i === c)); };
[...dots.children].forEach((d, i) => d.addEventListener('click', () => go(i)));
document.querySelector('[data-rv-prev]').addEventListener('click', () => go(cur() - 1));
document.querySelector('[data-rv-next]').addEventListener('click', () => { const c = cur(); go(track.scrollLeft + track.clientWidth >= track.scrollWidth - 8 ? 0 : c + 1); });
track.addEventListener('scroll', mark, { passive: true }); mark();
}

/* ---------- SEO-текст: читать полностью ---------- */
const seo = document.querySelector('.seo'), seoBody = $('seoBody'), seoBtn = seo && seo.querySelector('.seo-more');
if (seo) {
seoBody.addEventListener('transitionend', () => dispatchEvent(new Event('tp:relayout')));
seoBtn.addEventListener('click', () => {
  const open = !seo.classList.contains('open'); seo.classList.toggle('open', open); seoBtn.setAttribute('aria-expanded', open);
  seoBody.style.maxHeight = open ? seoBody.scrollHeight + 'px' : '';
  seoBtn.querySelector('span').textContent = open ? 'Свернуть' : 'Читать полностью';
  if (!open) seo.scrollIntoView({ block: 'start' });
});
}

/* ---------- сноска «?» об адвокатах ---------- */
const tip = $('fnTip');
const showTip = el => { tip.hidden = false; const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  let x = clamp(r.left + r.width / 2 - w / 2, 10, innerWidth - w - 10), y = r.top - h - 10; if (y < 10) y = r.bottom + 10;
  tip.style.left = x + 'px'; tip.style.top = y + 'px'; };
const hideTip = () => { tip.hidden = true; };
document.querySelectorAll('[data-fn]').forEach(el => {
  el.addEventListener('pointerenter', () => showTip(el)); el.addEventListener('pointerleave', hideTip);
  el.addEventListener('focus', () => showTip(el)); el.addEventListener('blur', hideTip);
  el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); tip.hidden ? showTip(el) : hideTip(); });
});
addEventListener('scroll', hideTip, { passive: true });

/* ---------- ночной режим: переключатель с круговым раскрытием ---------- */
const themeBtn = document.querySelector('.theme-btn');
const setTheme = night => {
  if (night) document.documentElement.dataset.theme = 'night'; else delete document.documentElement.dataset.theme;
  const label = night ? 'Дневной режим' : 'Ночной режим';
  themeBtn.setAttribute('aria-pressed', night); themeBtn.setAttribute('aria-label', label); themeBtn.title = label;
  document.querySelector('meta[name=theme-color]').content = night ? '#0f141b' : '#f4f6f8';
  try { localStorage.setItem('tpTheme', night ? 'night' : 'day'); } catch (e) {}
};
setTheme(document.documentElement.dataset.theme === 'night');
themeBtn.addEventListener('click', () => {
  const night = document.documentElement.dataset.theme !== 'night';
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return setTheme(night);
  const r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, root = document.documentElement;
  root.style.setProperty('--tx', x + 'px'); root.style.setProperty('--ty', y + 'px');
  root.style.setProperty('--tr', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
  root.classList.add('theme-anim');
  document.startViewTransition(() => setTheme(night)).finished.finally(() => root.classList.remove('theme-anim'));
});

/* ---------- 3D-иконки поворачиваются за курсором ---------- */
const follow = (cards, pick, k) => cards.forEach(c => {
  const icon = pick(c); if (!icon) return;
  c.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.classList.add('tilting');
    icon.style.setProperty('--ry', (x * k.r).toFixed(2) + 'deg'); icon.style.setProperty('--rx', (-y * k.r * .8).toFixed(2) + 'deg');
    icon.style.setProperty('--tx', (x * k.m).toFixed(1) + 'px'); icon.style.setProperty('--ty', (y * k.m).toFixed(1) + 'px');
  });
  c.addEventListener('pointerleave', () => { c.classList.remove('tilting'); ['--rx', '--ry', '--tx', '--ty'].forEach(p => icon.style.removeProperty(p)); });
});
follow(document.querySelectorAll('.svc-grid .tp-card'), c => c.querySelector('.tp-card__icon'), { r: 34, m: 10 });
follow(document.querySelectorAll('.feature'), c => c.querySelector(':scope>img'), { r: 16, m: 14 });
follow(document.querySelectorAll('.stat'), c => c.querySelector('img'), { r: 30, m: 6 });

/* ---------- оглавление SEO-текста: клик раскрывает и ведёт к разделу, подсветка текущего ---------- */
const tocLinks = seo ? [...document.querySelectorAll('.seo-toc a')] : [];
tocLinks.forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const target = document.getElementById(a.getAttribute('href').slice(1));
  const wasOpen = seo.classList.contains('open'); if (!wasOpen) seoBtn.click(); a.blur();
  setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), wasOpen ? 0 : 450);
}));
const tio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; const i = e.target.id.split('-')[1];
  tocLinks.forEach(a => a.classList.toggle('on', a.dataset.seo === i));
}), { rootMargin: '-30% 0px -60% 0px' });
document.querySelectorAll('.seo-body [id^="seo-"]').forEach(h => tio.observe(h));

/* ---------- внутренние страницы: видео по клику, подсветка оглавления ---------- */
document.querySelectorAll('.vid[data-src]').forEach(v => v.addEventListener('click', () => {
  if (v.querySelector('iframe')) return;
  const f = document.createElement('iframe'); f.src = v.dataset.src + (v.dataset.src.includes('?') ? '&' : '?') + 'autoplay=1';
  f.allow = 'autoplay; fullscreen; picture-in-picture'; f.allowFullscreen = true; v.append(f);
}));
const pgToc = [...document.querySelectorAll('.pg-toc a')];
if (pgToc.length) {
  // текущий раздел = последний заголовок, который уже ушёл выше 30% экрана; подсвечиваем его и его главный (h2) раздел
  const heads = pgToc.map(a => document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)))).map((h, i) => [h, pgToc[i]]).filter(([h]) => h);
  let curToc = -1;
  const markToc = () => {
    const line = innerHeight * .3; let i = -1;
    heads.forEach(([h], k) => { if (h.getBoundingClientRect().top <= line) i = k; });
    if (i === curToc) return; curToc = i;
    let main = i; while (main > 0 && heads[main][1].classList.contains('lv3')) main--;
    pgToc.forEach(a => a.classList.remove('on', 'on-parent'));
    if (i >= 0) heads[i][1].classList.add('on'); void main;
  };
  addEventListener('scroll', () => requestAnimationFrame(markToc), { passive: true }); markToc();
}

/* ---------- вкладки прайса ---------- */
document.querySelectorAll('.pr-tab').forEach(t => t.addEventListener('click', () => {
  const k = t.dataset.tab;
  document.querySelectorAll('.pr-tab').forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); });
  document.querySelectorAll('.pr-panel').forEach(p => p.classList.toggle('on', p.dataset.panel === k));
}));

/* ---------- блог: фильтр по темам и поиск ---------- */
const blGrid = $('blGrid');
if (blGrid) {
  const blCards = [...blGrid.children], blSearch = document.querySelector('[data-bl-search]'), blEmpty = document.querySelector('.bl-empty');
  let topic = 'all';
  const apply = () => {
    const q = (blSearch.value || '').trim().toLowerCase(); let n = 0;
    blCards.forEach(c => { const ok = (topic === 'all' || c.dataset.topic === topic) && (!q || c.textContent.toLowerCase().includes(q)); c.hidden = !ok; if (ok) n++; });
    blEmpty.hidden = n > 0;
  };
  document.querySelectorAll('[data-bl-topic]').forEach(b => b.addEventListener('click', () => {
    topic = b.dataset.blTopic; document.querySelectorAll('[data-bl-topic]').forEach(x => x.classList.toggle('on', x === b)); apply();
  }));
  blSearch.addEventListener('input', apply);
}

/* ---------- наклон карточек преимуществ за мышкой ---------- */
document.querySelectorAll('[data-tilt]').forEach(c => {
  c.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.transform = `perspective(900px) rotateX(${(.5 - y) * 7}deg) rotateY(${(x - .5) * 9}deg) translateY(-4px)`;
    c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
  });
  c.addEventListener('pointerleave', () => { c.style.transform = ''; });
});
})();
