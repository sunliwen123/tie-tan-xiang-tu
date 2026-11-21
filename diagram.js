/* ============================================================
   Fe–Fe₃C 相图（SVG 示意）
   ============================================================ */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 780;
  const H = 560;
  const M = { l: 66, r: 44, t: 30, b: 66 };
  const CMAX = 6.69;
  const TMIN = 0;
  const TMAX = 1600;

  const X = (c) => M.l + (c / CMAX) * (W - M.l - M.r);
  const Y = (t) => H - M.b - ((t - TMIN) / (TMAX - TMIN)) * (H - M.t - M.b);

  function mk(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(node);
    return node;
  }

  function poly(points, fill) {
    return points.map((p) => `${X(p[0])},${Y(p[1])}`).join(' ');
  }

  function labelC(host, x, y, text, cls, opts) {
    const o = opts || {};
    const t = mk('text', {
      x,
      y,
      class: cls,
      'text-anchor': o.anchor || 'middle',
      'dominant-baseline': o.baseline || 'auto'
    }, host);
    t.textContent = text;
    return t;
  }

  const POINTS = [
    { n: 'A', c: 0, t: 1538, dx: -9, dy: -8, a: 'end' },
    { n: 'H', c: 0.09, t: 1495, dx: -2, dy: -10, a: 'middle' },
    { n: 'J', c: 0.17, t: 1495, dx: 0, dy: 17, a: 'middle' },
    { n: 'B', c: 0.53, t: 1495, dx: 2, dy: -11, a: 'middle' },
    { n: 'N', c: 0, t: 1394, dx: 9, dy: 4, a: 'start' },
    { n: 'D', c: 6.69, t: 1227, dx: -6, dy: -12, a: 'end' },
    { n: 'E', c: 2.11, t: 1148, dx: -4, dy: -11, a: 'middle' },
    { n: 'C', c: 4.3, t: 1148, dx: 8, dy: -11, a: 'middle' },
    { n: 'F', c: 6.69, t: 1148, dx: -6, dy: 19, a: 'end' },
    { n: 'G', c: 0, t: 912, dx: 9, dy: -5, a: 'start' },
    { n: 'S', c: 0.77, t: 727, dx: 12, dy: -12, a: 'middle' },
    { n: 'P', c: 0.0218, t: 727, dx: 9, dy: 19, a: 'start' },
    { n: 'K', c: 6.69, t: 727, dx: -6, dy: 21, a: 'end' },
    { n: 'Q', c: 0.0008, t: 20, dx: 11, dy: -4, a: 'start' }
  ];

  window.renderPhaseDiagram = function (host) {
    if (!host) return;
    host.innerHTML = '';
    const svg = mk('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'phase-diagram',
      role: 'img',
      'aria-label': '铁碳合金相图'
    });
    host.appendChild(svg);

    /* ---------- 相区底色 ---------- */
    mk('polygon', { points: poly([[0, 1538], [0.53, 1495], [4.3, 1148], [6.69, 1227], [6.69, 1600], [0, 1600]]), fill: 'rgba(255,138,61,0.09)' }, svg);
    mk('polygon', { points: poly([[0, 1538], [0.53, 1495], [4.3, 1148], [2.11, 1148], [0.17, 1495], [0.09, 1495]]), fill: 'rgba(255,209,102,0.055)' }, svg);
    mk('polygon', { points: poly([[0, 1394], [0.17, 1495], [2.11, 1148], [0.77, 727], [0, 912]]), fill: 'rgba(67,220,255,0.09)' }, svg);
    mk('polygon', { points: poly([[0, 1538], [0.09, 1495], [0, 1394]]), fill: 'rgba(255,209,102,0.08)' }, svg);
    mk('polygon', { points: poly([[0, 912], [0.0218, 727], [0.0008, 20], [0, 20]]), fill: 'rgba(61,220,151,0.16)' }, svg);
    mk('polygon', { points: poly([[0.77, 727], [2.11, 1148], [6.69, 1148], [6.69, 727]]), fill: 'rgba(126,166,224,0.05)' }, svg);
    mk('polygon', { points: poly([[0.0218, 727], [0.77, 727], [0.77, 20], [0.0218, 20]]), fill: 'rgba(61,220,151,0.06)' }, svg);
    mk('polygon', { points: poly([[0.77, 727], [2.11, 727], [2.11, 20], [0.77, 20]]), fill: 'rgba(67,220,255,0.045)' }, svg);
    mk('polygon', { points: poly([[2.11, 727], [4.3, 727], [4.3, 20], [2.11, 20]]), fill: 'rgba(255,95,109,0.05)' }, svg);
    mk('polygon', { points: poly([[4.3, 727], [6.69, 727], [6.69, 20], [4.3, 20]]), fill: 'rgba(255,209,102,0.045)' }, svg);

    /* ---------- 网格 ---------- */
    for (let t = 200; t <= 1400; t += 200) {
      mk('line', { x1: M.l, y1: Y(t), x2: W - M.r, y2: Y(t), class: 'gridline' }, svg);
    }
    for (let c = 1; c <= 6; c += 1) {
      mk('line', { x1: X(c), y1: M.t, x2: X(c), y2: H - M.b, class: 'gridline' }, svg);
    }

    /* ---------- 坐标轴 ---------- */
    mk('line', { x1: M.l, y1: H - M.b, x2: W - M.r, y2: H - M.b, class: 'axis' }, svg);
    mk('line', { x1: M.l, y1: M.t, x2: M.l, y2: H - M.b, class: 'axis' }, svg);

    for (let t = 0; t <= 1600; t += 200) {
      mk('line', { x1: M.l - 4, y1: Y(t), x2: M.l, y2: Y(t), class: 'axis' }, svg);
      labelC(svg, M.l - 10, Y(t) + 4, String(t), 'ax-label', { anchor: 'end' });
    }
    [0, 1, 2, 3, 4, 5].forEach((c) => {
      mk('line', { x1: X(c), y1: H - M.b, x2: X(c), y2: H - M.b + 4, class: 'axis' }, svg);
      labelC(svg, X(c), H - M.b + 19, c.toFixed(1), 'ax-label');
    });
    mk('line', { x1: X(CMAX), y1: H - M.b, x2: X(CMAX), y2: H - M.b + 4, class: 'axis' }, svg);
    labelC(svg, X(CMAX), H - M.b + 19, '6.69', 'ax-label');

    labelC(svg, W - M.r, H - 18, '碳的质量分数 w(C) / %', 'ax-title', { anchor: 'end' });
    labelC(svg, M.l - 44, M.t + 4, '温度 T / ℃', 'ax-title', { anchor: 'start' });

    /* ---------- 相界线 ---------- */
    const line = (pts, cls) =>
      mk('polyline', { points: pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(' '), class: cls }, svg);

    line([[0, 1538], [0.53, 1495], [4.3, 1148], [6.69, 1227]], 'curve accent'); // 液相线 A-B-C-D
    line([[0, 1538], [0.09, 1495]], 'curve'); // 固相线 A-H
    line([[0.09, 1495], [0.53, 1495]], 'curve'); // 包晶线 H-J-B
    line([[0.17, 1495], [2.11, 1148]], 'curve'); // J-E
    line([[0, 1394], [0.09, 1495]], 'curve'); // N-H
    line([[0, 1394], [0.17, 1495]], 'curve'); // N-J
    line([[0, 1394], [0, 1538]], 'curve'); // 左边界
    line([[2.11, 1148], [6.69, 1148]], 'curve hot'); // 共晶线 E-C-F
    line([[0.77, 727], [6.69, 727]], 'curve hot'); // 共析线 P-S-K
    line([[0, 912], [0.77, 727]], 'curve'); // GS
    line([[0, 912], [0.0218, 727]], 'curve'); // GP
    line([[0.77, 727], [2.11, 1148]], 'curve'); // ES / Acm
    line([[0.0218, 727], [0.0008, 20]], 'curve'); // PQ
    line([[6.69, 1227], [6.69, 20]], 'curve carbide'); // 渗碳体垂线

    /* ---------- 相区文字 ---------- */
    labelC(svg, X(2.0), Y(1450), '液相 L', 'region');
    labelC(svg, X(2.65), Y(1275), 'L + A', 'region');
    labelC(svg, X(5.5), Y(1200), 'L + Fe₃C_I', 'region small');
    labelC(svg, X(0.8), Y(1020), '奥氏体 A', 'region');
    labelC(svg, X(1.85), Y(930), 'A + Fe₃C_II', 'region small');
    labelC(svg, X(3.3), Y(930), 'Ld（A + Fe₃C）', 'region small');
    labelC(svg, X(5.45), Y(930), 'Ld + Fe₃C_I', 'region small');
    labelC(svg, X(0.4), Y(430), 'F + P', 'region small');
    labelC(svg, X(1.42), Y(430), 'P + Fe₃C_II', 'region small');
    labelC(svg, X(3.15), Y(430), 'P + Fe₃C_II + Ld′', 'region small');
    labelC(svg, X(5.45), Y(430), 'Ld′ + Fe₃C_I', 'region small');

    /* ---------- 标注 ---------- */
    labelC(svg, X(3.15), Y(1172), '1148℃ 共晶线 ECF', 'anote');
    labelC(svg, X(3.35), Y(700), '727℃ 共析线 PSK（A₁）', 'anote');
    labelC(svg, X(2.05), Y(790), 'Acm', 'anote');
    labelC(svg, X(0.4), Y(800), 'A₃', 'anote');

    /* ---------- 关键点 ---------- */
    POINTS.forEach((p) => {
      const cx = X(p.c);
      const cy = Y(p.t);
      const g = mk('g', {}, svg);
      const hit = mk('circle', { cx, cy, r: 12, class: 'hit' }, g);
      mk('title', {}, hit).textContent = `${p.n} 点：${p.c === 0 ? '0' : p.c}% C，${p.t}℃`;
      mk('circle', { cx, cy, r: 4.2, class: 'pt' }, g);
      labelC(g, cx + p.dx, cy + p.dy, p.n, 'pt-label', { anchor: p.a });
    });
  };

  const LEGEND = [
    { name: '液相 L', color: 'rgba(255,138,61,0.55)' },
    { name: '奥氏体 A', color: 'rgba(67,220,255,0.7)' },
    { name: '铁素体 F', color: 'rgba(61,220,151,0.7)' },
    { name: '渗碳体 Fe₃C', color: 'rgba(255,209,102,0.7)' },
    { name: '珠光体 P', color: 'rgba(160,200,255,0.45)' },
    { name: '莱氏体 Ld', color: 'rgba(255,95,109,0.55)' }
  ];

  window.renderPhaseLegend = function (host) {
    if (!host) return;
    host.innerHTML = LEGEND.map(
      (l) => `<span><i style="background:${l.color}"></i>${l.name}</span>`
    ).join('');
  };
})();
