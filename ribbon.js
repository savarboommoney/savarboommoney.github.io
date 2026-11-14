/* Красная шёлковая лента через всю главную: продолжает ленту Фемиды, вьётся между блоками
   и прорисовывается по мере прокрутки. Объём: ширина меняется по |cos| (лента перекручивается),
   лицевая сторона светлее, изнанка темнее. */
(() => {
const main = document.querySelector('main');
if (!main) return;
const NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(NS, 'svg');
svg.classList.add('silk'); svg.setAttribute('aria-hidden', 'true');
main.prepend(svg);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let clipRect, H = 0;

function build() {
  const W = main.clientWidth; H = main.offsetHeight;
  const mobile = W < 760;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.height = H + 'px';
  // опорные точки: по краям у каждого блока, переходы — в промежутках между блоками
  const secs = [...main.querySelectorAll(':scope > section')];
  const pts = [[W * (mobile ? 1.04 : .9), -40]];
  secs.forEach((s, i) => {
    const y = s.offsetTop + s.offsetHeight * .5;
    // на телефоне лента вьётся только у правого края и не пересекает текст
    pts.push(mobile ? [W * (i % 2 ? 1.02 : .955), y] : [i % 2 ? W * .975 : W * .025, y]);
  });
  pts.push([mobile ? W * .96 : W * .5, H - 90]);
  // Catmull-Rom → кубические кривые; точки считаем сами (getPointAtLength на длинном пути — секунды на слабом телефоне)
  let d = `M${pts[0][0]},${pts[0][1]}`;
  const dense = [[pts[0][0], pts[0][1]]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, k = 1 / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k], c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    for (let s = 1; s <= 48; s++) { const t = s / 48, u = 1 - t;
      dense.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]); }
  }
  const acc = [0]; for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const len = acc[acc.length - 1];
  let j = 0; const at = s => { while (j < acc.length - 2 && acc[j + 1] < s) j++; while (j > 0 && acc[j] > s) j--; const f = (s - acc[j]) / ((acc[j + 1] - acc[j]) || 1); return { x: dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, y: dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f }; };
  svg.replaceChildren();
  const N = Math.round(len / 9), wMax = mobile ? 18 : 38, twists = len / (mobile ? 520 : 760);
  const P = [];
  for (let i = 0; i <= N; i++) {
    const s = len * i / N, r = at(Math.max(0, s - 1)), q = at(Math.min(len, s + 1)), p = at(s);
    let tx = q.x - r.x, ty = q.y - r.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const c = Math.cos(i / N * twists * Math.PI * 2), tail = Math.min(1, (N - i) / (N * .06)), w = wMax * (.12 + .88 * Math.abs(c)) / 2 * (.25 + .75 * tail);
    P.push({ ax: p.x - ty * w, ay: p.y + tx * w, bx: p.x + ty * w, by: p.y - tx * w, c });
  }
  // тень под лентой
  const g = document.createElementNS(NS, 'g');
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `<filter id="silkShadow" x="-10%" y="-2%" width="120%" height="104%"><feGaussianBlur stdDeviation="9"/></filter>
    <linearGradient id="silkFade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="silkMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#silkFade)"/></mask>`;
  svg.append(defs);
  clipRect = defs.querySelector('#silkFade');
  const shadow = document.createElementNS(NS, 'path');
  shadow.setAttribute('d', d); shadow.setAttribute('class', 'silk-shadow'); shadow.setAttribute('stroke-width', wMax * .8);
  shadow.setAttribute('filter', 'url(#silkShadow)'); shadow.setAttribute('stroke-dasharray', `${(len * .9).toFixed(0)} ${len}`); shadow.setAttribute('transform', 'translate(6 16)');
  g.append(shadow);
  // хвост (последние 12% длины): кусочки непрозрачные, растворяем одной маской-градиентом от начала хвоста к концу — без «лесенки»
  const iT = Math.floor(N * .88), mid = p => [(p.ax + p.bx) / 2, (p.ay + p.by) / 2], [t1x, t1y] = mid(P[iT]), [t2x, t2y] = mid(P[N]);
  defs.insertAdjacentHTML('beforeend', `<linearGradient id="silkTailFade" gradientUnits="userSpaceOnUse" x1="${t1x}" y1="${t1y}" x2="${t2x}" y2="${t2y}"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="silkTail" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#silkTailFade)"/></mask>`);
  const tg = document.createElementNS(NS, 'g'); tg.setAttribute('mask', 'url(#silkTail)');
  // полосы ленты: цвет зависит от того, как она повёрнута к свету
  for (let i = 0; i < N; i++) {
    const a = P[i], b = P[i + 1], c = (a.c + b.c) / 2, face = c >= 0, t = Math.abs(c);
    // лицевая: от тёмно-красного на ребре до яркого с бликом; изнанка — глубже и темнее
    const L = face ? 34 + 22 * t + (t > .93 ? 12 * (t - .93) / .07 : 0) : 24 + 12 * t;
    const S = face ? 88 : 80;
    const quad = document.createElementNS(NS, 'path');
    quad.setAttribute('d', `M${a.ax.toFixed(1)},${a.ay.toFixed(1)}L${b.ax.toFixed(1)},${b.ay.toFixed(1)}L${b.bx.toFixed(1)},${b.by.toFixed(1)}L${a.bx.toFixed(1)},${a.by.toFixed(1)}Z`);
    const col = `hsl(${352 + (face ? 0 : -2)} ${S}% ${L.toFixed(1)}%)`;
    quad.setAttribute('fill', col); quad.setAttribute('stroke', col); quad.setAttribute('stroke-width', '1.6');
    (i >= iT ? tg : g).append(quad);
  }
  g.append(tg);
  // тонкий блик по одной кромке лицевой стороны
  let hl = '';
  P.forEach((p, i) => { if (i > N * .9) return; hl += (i ? 'L' : 'M') + ((p.ax * .75 + p.bx * .25)).toFixed(1) + ',' + ((p.ay * .75 + p.by * .25)).toFixed(1); });
  const shine = document.createElementNS(NS, 'path');
  shine.setAttribute('d', hl); shine.setAttribute('class', 'silk-shine');
  g.append(shine);
  g.setAttribute('mask', 'url(#silkMask)');
  svg.append(g);
  reveal();
}

function reveal() {
  if (!clipRect) return;
  const top = main.getBoundingClientRect().top + scrollY;
  const y = reduce ? H + 400 : Math.max(0, scrollY + innerHeight * .85 - top);
  const FADE = 320; clipRect.setAttribute('y1', (y - FADE).toFixed(0)); clipRect.setAttribute('y2', Math.max(1, y).toFixed(0));
}

let t, lastW = 0, lastH = 0; const rebuild = () => { clearTimeout(t); t = setTimeout(() => { if (Math.abs(main.offsetHeight - lastH) < 40 && main.clientWidth === lastW) return; lastH = main.offsetHeight; lastW = main.clientWidth; build(); }, 250); };
new ResizeObserver(rebuild).observe(main);
addEventListener('scroll', () => requestAnimationFrame(reveal), { passive: true });
addEventListener('load', rebuild);
addEventListener('tp:relayout', () => { lastH = 0; rebuild(); });
(window.requestIdleCallback || setTimeout)(() => { lastH = main.offsetHeight; lastW = main.clientWidth; build(); });
})();
