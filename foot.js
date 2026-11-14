/* Подвал: верхний край карточки — волна, по ней идёт шёлковая лента и обвязывает карточку по бокам.
   Карточка обрезается clip-path по той же линии, что и центр ленты, — лента «лежит» на кромке. */
(() => {
const stage = document.querySelector('.foot-stage'), card = stage && stage.querySelector('.foot-in'), svg = stage && stage.querySelector('.foot-silk');
if (!card || !svg) return;
const NS = 'http://www.w3.org/2000/svg';

function build() {
  const S = stage.getBoundingClientRect(), C = card.getBoundingClientRect();
  const W = S.width, H = stage.offsetHeight, cl = C.left - S.left, ct = C.top - S.top, cw = C.width, ch = C.height;
  if (!cw) return;
  const mobile = cw < 600, k = cw / 2400, R = mobile ? 26 : 32;
  // десктоп: геометрия из направляющей Codex (холст 3000×800, карточка x 300–2700, верх y 160, волна base 60 + A 70)
  const A = mobile ? 12 : 26, base = mobile ? 22 : 40;
  const wy = x => base + A * Math.sin((x / cw) * Math.PI * 2 * (mobile ? .9 : 1.25) + .6); // волна, в координатах карточки

  // 1) обрезка карточки по волне
  let clip = `M0 ${wy(0).toFixed(1)}`;
  for (let x = 8; x <= cw; x += 8) clip += `L${Math.min(x, cw).toFixed(1)} ${wy(Math.min(x, cw)).toFixed(1)}`;
  clip += `L${cw} ${ch - R}Q${cw} ${ch} ${cw - R} ${ch}L${R} ${ch}Q0 ${ch} 0 ${ch - R}Z`;
  card.style.clipPath = `path('${clip}')`;
  card.style.setProperty('--wave-pad', (base + A + 26) + 'px');


  // 2) осевая линия ленты: слева снизу из-за карточки → по волне → вниз справа
  const ly = ct + ch * (mobile ? .5 : .58), y0 = ct + wy(0), y1 = ct + wy(cw), out = mobile ? 40 : 170;
  let d = `M${cl - out} ${ly}C${cl - out * .35} ${ly - 10} ${cl - 34} ${y0 + 46} ${cl} ${y0}`;
  for (let x = 6; x <= cw; x += 6) d += `L${(cl + x).toFixed(1)} ${(ct + wy(x)).toFixed(1)}`;
  d += `C${cl + cw + 34} ${y1 + 46} ${cl + cw + out * .35} ${ly - 10} ${cl + cw + out} ${ly + 8}`;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
  const guide = document.createElementNS(NS, 'path'); guide.setAttribute('d', d); guide.setAttribute('fill', 'none');
  svg.replaceChildren(guide);
  const len = guide.getTotalLength(), N = Math.round(len / 6), wMax = mobile ? 16 : 30, twists = len / (mobile ? 420 : 640);
  const P = [];
  for (let i = 0; i <= N; i++) {
    const s = len * i / N, p = guide.getPointAtLength(s), q = guide.getPointAtLength(Math.min(len, s + 1)), r = guide.getPointAtLength(Math.max(0, s - 1));
    let tx = q.x - r.x, ty = q.y - r.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const c = Math.cos((i / N * twists + .25) * Math.PI * 2), w = wMax * (.18 + .82 * Math.abs(c)) / 2;
    P.push({ ax: p.x - ty * w, ay: p.y + tx * w, bx: p.x + ty * w, by: p.y - tx * w, c });
  }
  guide.remove();

  // концы растворяются по горизонтали
  const x0 = cl - out, x1 = cl + cw + out;
  svg.innerHTML = `<defs>
    <filter id="fsShadow" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
    <linearGradient id="fsFade" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x1}" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${(out * .7 / (x1 - x0)).toFixed(3)}" stop-color="#fff"/>
      <stop offset="${(1 - out * .7 / (x1 - x0)).toFixed(3)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="fsMask" maskUnits="userSpaceOnUse" x="-600" y="-200" width="${W + 1200}" height="${H + 400}"><rect x="-600" y="-200" width="${W + 1200}" height="${H + 400}" fill="url(#fsFade)"/></mask></defs>`;
  const g = document.createElementNS(NS, 'g'); g.setAttribute('mask', 'url(#fsMask)');
  const sh = document.createElementNS(NS, 'path');
  sh.setAttribute('d', d); sh.setAttribute('class', 'fs-shadow'); sh.setAttribute('stroke-width', wMax * .7);
  sh.setAttribute('filter', 'url(#fsShadow)'); sh.setAttribute('transform', 'translate(0 9)');
  g.append(sh);
  for (let i = 0; i < N; i++) {
    const a = P[i], b = P[i + 1], c = (a.c + b.c) / 2, face = c >= 0, t = Math.abs(c);
    const L = face ? 34 + 22 * t + (t > .93 ? 12 * (t - .93) / .07 : 0) : 24 + 12 * t;
    const col = `hsl(${face ? 352 : 350} ${face ? 88 : 80}% ${L.toFixed(1)}%)`;
    const q = document.createElementNS(NS, 'path');
    q.setAttribute('d', `M${a.ax.toFixed(1)},${a.ay.toFixed(1)}L${b.ax.toFixed(1)},${b.ay.toFixed(1)}L${b.bx.toFixed(1)},${b.by.toFixed(1)}L${a.bx.toFixed(1)},${a.by.toFixed(1)}Z`);
    q.setAttribute('fill', col); q.setAttribute('stroke', col); q.setAttribute('stroke-width', '.7');
    g.append(q);
  }
  let hl = ''; P.forEach((p, i) => { hl += (i ? 'L' : 'M') + (p.ax * .75 + p.bx * .25).toFixed(1) + ',' + (p.ay * .75 + p.by * .25).toFixed(1); });
  const shine = document.createElementNS(NS, 'path'); shine.setAttribute('d', hl); shine.setAttribute('class', 'fs-shine');
  g.append(shine);
  svg.append(g);
}

let t; const rebuild = () => { clearTimeout(t); t = setTimeout(build, 80); };
new ResizeObserver(rebuild).observe(stage);
addEventListener('load', build);
build();
})();
