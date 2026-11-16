/* =====================================================================
   DeMap · demap.com.br — desenhos em canvas
   ---------------------------------------------------------------------
   1) Hero: campo de curvas de nível gerado por ruído e "marching
      squares", com leitura de coordenadas (WGS 84) sob o cursor,
      mapeando a área do hero para o globo inteiro (lon ±180°, lat ±75°).
   2) Vinhetas: pequenos mapas ilustrativos para cada caso do portfólio.
   Sem dependências externas. Cores lidas dos tokens CSS, então os
   desenhos acompanham o tema claro/escuro.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- Utilidades ---------- */

  // Lê um token de cor definido em :root (estilo.css)
  function token(nome) {
    return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  }

  // Gerador pseudoaleatório com semente (mulberry32): desenho reprodutível
  function aleatorio(semente) {
    return function () {
      semente |= 0; semente = (semente + 0x6d2b79f5) | 0;
      let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Ruído de valor 2D suavizado, somado em oitavas (relevo plausível)
  function criaRuido(semente) {
    const rnd = aleatorio(semente);
    const N = 256, tab = new Float32Array(N * N);
    for (let i = 0; i < tab.length; i++) tab[i] = rnd();
    const v = (x, y) => tab[((y & (N - 1)) * N) + (x & (N - 1))];
    const suave = (t) => t * t * (3 - 2 * t);
    function base(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const fx = suave(x - xi), fy = suave(y - yi);
      const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
    return function (x, y) {
      let s = 0, amp = 1, freq = 1, norma = 0;
      for (let o = 0; o < 4; o++) {
        s += base(x * freq, y * freq) * amp;
        norma += amp; amp *= 0.5; freq *= 2;
      }
      return s / norma;
    };
  }

  // Ajusta o canvas à densidade de pixels da tela
  function preparaCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  /* ---------- Marching squares ----------
     Para um nível, percorre a grade e traça os segmentos onde o campo
     cruza esse valor (interpolação linear nas arestas da célula). */
  function tracaNivel(ctx, campo, cols, lins, passo, nivel) {
    ctx.beginPath();
    for (let j = 0; j < lins - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = campo[j * cols + i], b = campo[j * cols + i + 1];
        const c = campo[(j + 1) * cols + i + 1], d = campo[(j + 1) * cols + i];
        let caso = 0;
        if (a > nivel) caso |= 8; if (b > nivel) caso |= 4;
        if (c > nivel) caso |= 2; if (d > nivel) caso |= 1;
        if (caso === 0 || caso === 15) continue;
        const x = i * passo, y = j * passo;
        const t = (p, q) => (nivel - p) / (q - p);
        const N = [x + t(a, b) * passo, y];            // aresta de cima
        const E = [x + passo, y + t(b, c) * passo];    // direita
        const S = [x + t(d, c) * passo, y + passo];    // de baixo
        const O = [x, y + t(a, d) * passo];            // esquerda
        const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
        switch (caso) {
          case 1: case 14: seg(O, S); break;
          case 2: case 13: seg(S, E); break;
          case 3: case 12: seg(O, E); break;
          case 4: case 11: seg(N, E); break;
          case 6: case 9: seg(N, S); break;
          case 7: case 8: seg(O, N); break;
          case 5: seg(O, N); seg(S, E); break;
          case 10: seg(N, E); seg(O, S); break;
        }
      }
    }
    ctx.stroke();
  }

  /* ---------- 1. Hero ---------- */
  // Extensão mapeada no hero: o mundo todo (latitudes extremas cortadas)
  const EXTENSAO = { oeste: -180, leste: 180, norte: 75, sul: -75 };

  function grausParaDMS(v, pos, neg) {
    const h = v < 0 ? neg : pos; v = Math.abs(v);
    const g = Math.floor(v), m = Math.floor((v - g) * 60);
    const s = ((v - g) * 60 - m) * 60;
    return g + "°" + String(m).padStart(2, "0") + "′" + s.toFixed(1).padStart(4, "0") + "″" + h;
  }

  function iniciaHero() {
    const cv = document.getElementById("relevo");
    if (!cv) return;
    const leitura = document.getElementById("leitura");
    const ruido = criaRuido(1977);
    let estado = null;

    function desenha(destaque) {
      const { ctx, w, h } = preparaCanvas(cv);
      const passo = 8;
      const cols = Math.ceil(w / passo) + 2, lins = Math.ceil(h / passo) + 2;
      const campo = new Float32Array(cols * lins);
      for (let j = 0; j < lins; j++)
        for (let i = 0; i < cols; i++)
          campo[j * cols + i] = ruido(i * passo / 260, j * passo / 260);

      ctx.clearRect(0, 0, w, h);
      const curva = token("--curva"), agua = token("--agua");

      // Curvas de nível: equidistância fixa, mestra a cada 5
      const niveis = 34;
      for (let k = 1; k < niveis; k++) {
        const nivel = 0.2 + (k / niveis) * 0.6;
        const mestra = k % 5 === 0;
        ctx.strokeStyle = curva;
        ctx.globalAlpha = mestra ? 0.75 : 0.32;
        ctx.lineWidth = mestra ? 1.3 : 0.7;
        tracaNivel(ctx, campo, cols, lins, passo, nivel);
      }

      // "Talvegue": nível mais baixo destacado em azul (lâmina d'água)
      ctx.globalAlpha = 0.9; ctx.strokeStyle = agua; ctx.lineWidth = 1.6;
      tracaNivel(ctx, campo, cols, lins, passo, 0.33);
      ctx.globalAlpha = 1;

      // Quadrícula de coordenadas em magenta (sobreimpressão)
      ctx.strokeStyle = token("--magenta"); ctx.globalAlpha = 0.18; ctx.lineWidth = 1;
      const q = 160;
      ctx.beginPath();
      for (let x = q; x < w; x += q) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = q; y < h; y += q) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke(); ctx.globalAlpha = 1;

      estado = { w, h, ctx };
      if (destaque) mira(destaque.x, destaque.y);
    }

    // Retícula do cursor + leitura de coordenadas
    function mira(x, y) {
      if (!estado) return;
      const { w, h } = estado;
      const lon = EXTENSAO.oeste + (x / w) * (EXTENSAO.leste - EXTENSAO.oeste);
      const lat = EXTENSAO.norte + (y / h) * (EXTENSAO.sul - EXTENSAO.norte);
      const cota = Math.round(80 + ruido(x / 260 * 1, y / 260) * 900); // cota fictícia, m
      if (leitura) {
        leitura.innerHTML =
          "<b>" + grausParaDMS(lat, "N", "S") + "</b> · <b>" + grausParaDMS(lon, "E", "O") +
          "</b> · cota ≈ " + cota + " m";
      }
      // retícula desenhada num canvas sobreposto (não refaz as curvas)
      const sobre = document.getElementById("mira");
      if (!sobre) return;
      const { ctx } = preparaCanvas(sobre);
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = token("--magenta"); ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 18, y); ctx.lineTo(x - 5, y); ctx.moveTo(x + 5, y); ctx.lineTo(x + 18, y);
      ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 5); ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 18);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    }

    let ultimo = null;
    const hero = cv.parentElement;
    hero.addEventListener("pointermove", (e) => {
      const r = cv.getBoundingClientRect();
      ultimo = { x: e.clientX - r.left, y: e.clientY - r.top };
      mira(ultimo.x, ultimo.y);
    });

    desenha();
    // posição inicial da retícula: à direita do título, longe do texto
    const r = cv.getBoundingClientRect();
    const x0 = r.width * 0.72, y0 = r.height * 0.32;
    ultimo = { x: x0, y: y0 };
    mira(x0, y0);

    // redesenha ao redimensionar e ao trocar de tema
    let tempo;
    const refaz = () => { clearTimeout(tempo); tempo = setTimeout(() => desenha(ultimo), 120); };
    window.addEventListener("resize", refaz);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", refaz);
    new MutationObserver(refaz).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* ---------- 2. Vinhetas dos casos ---------- */

  // Polígono irregular em torno de um centro (imóvel, mancha etc.)
  function poligono(rnd, cx, cy, raio, lados, irreg) {
    const pts = [];
    for (let i = 0; i < lados; i++) {
      const a = (i / lados) * Math.PI * 2;
      const r = raio * (1 - irreg / 2 + rnd() * irreg);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75]);
    }
    return pts;
  }
  function caminho(ctx, pts, fecha) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (fecha) ctx.closePath();
  }
  function rio(ctx, rnd, w, h, cor) {
    ctx.strokeStyle = cor; ctx.lineWidth = 1.6; ctx.beginPath();
    let y = h * (0.2 + rnd() * 0.6); ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 12) { y += (rnd() - 0.5) * 10; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  function hachura(ctx, pts, cor, esp) {
    ctx.save(); caminho(ctx, pts, true); ctx.clip();
    ctx.strokeStyle = cor; ctx.lineWidth = 1; ctx.beginPath();
    for (let d = -400; d < 800; d += esp) { ctx.moveTo(d, 0); ctx.lineTo(d + 300, 300); }
    ctx.stroke(); ctx.restore();
  }

  const VINHETAS = {
    // Série temporal: imóvel com dois polígonos de apontamento e linha do tempo
    serie(ctx, w, h, c, rnd) {
      rio(ctx, rnd, w, h, c.agua);
      const imovel = poligono(rnd, w * 0.48, h * 0.5, Math.min(w, h) * 0.55, 9, 0.35);
      ctx.strokeStyle = c.tinta; ctx.lineWidth = 1.4; caminho(ctx, imovel, true); ctx.stroke();
      [[0.38, 0.42, 0.13], [0.6, 0.6, 0.09]].forEach(([x, y, r]) => {
        const p = poligono(rnd, w * x, h * y, w * r, 7, 0.4);
        hachura(ctx, p, c.magenta, 5);
        ctx.strokeStyle = c.magenta; caminho(ctx, p, true); ctx.stroke();
      });
      const anos = ["2007", "2008", "2012", "…", "2026"];
      ctx.font = "10px " + c.mono; ctx.fillStyle = c.tinta2;
      anos.forEach((a, i) => {
        const x = 14 + i * ((w - 40) / (anos.length - 1));
        ctx.fillRect(x, h - 22, 1, 6); ctx.fillText(a, x - 10, h - 6);
      });
      ctx.fillRect(14, h - 19, w - 28, 1);
    },
    // GeoPDF: mesmo desenho em duas posições (antes/depois da correção)
    geopdf(ctx, w, h, c, rnd) {
      const lotes = [];
      for (let i = 0; i < 6; i++) lotes.push(poligono(rnd, w * (0.2 + (i % 3) * 0.28), h * (0.32 + Math.floor(i / 3) * 0.36), w * 0.11, 4, 0.2));
      ctx.setLineDash([4, 3]); ctx.strokeStyle = c.tinta2; ctx.lineWidth = 1;
      lotes.forEach((p) => { caminho(ctx, p.map(([x, y]) => [x - 14, y - 17]), true); ctx.stroke(); });
      ctx.setLineDash([]); ctx.strokeStyle = c.tinta; ctx.lineWidth = 1.4;
      lotes.forEach((p) => { caminho(ctx, p, true); ctx.stroke(); });
      // via férrea: referência de conferência
      ctx.strokeStyle = c.curva; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(0, h * 0.85); ctx.bezierCurveTo(w * 0.3, h * 0.7, w * 0.6, h * 0.95, w, h * 0.78); ctx.stroke();
      // vetor de deslocamento
      ctx.strokeStyle = c.magenta; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(w * 0.5 - 14, h * 0.5 - 17); ctx.lineTo(w * 0.5, h * 0.5); ctx.stroke();
      ctx.font = "10px " + c.mono; ctx.fillStyle = c.magenta;
      ctx.fillText("Δ 22 m → 0,12 m", w * 0.5 + 6, h * 0.5 - 4);
    },
    // Plataforma: pontos (animais/cercas), cerca virtual e células NDVI
    plataforma(ctx, w, h, c, rnd) {
      const tam = 14;
      for (let y = 0; y < h; y += tam) for (let x = 0; x < w; x += tam) {
        ctx.globalAlpha = 0.08 + rnd() * 0.32; ctx.fillStyle = c.mata;
        ctx.fillRect(x, y, tam - 1, tam - 1);
      }
      ctx.globalAlpha = 1;
      const cerca = poligono(rnd, w * 0.5, h * 0.5, Math.min(w, h) * 0.5, 6, 0.2);
      ctx.setLineDash([6, 4]); ctx.strokeStyle = c.magenta; ctx.lineWidth = 1.6;
      caminho(ctx, cerca, true); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c.tinta;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath(); ctx.arc(w * (0.3 + rnd() * 0.4), h * (0.3 + rnd() * 0.4), 2.4, 0, 7); ctx.fill();
      }
    },
    // Selo: imóvel do CAR, faixa de buffer e manchas de desmatamento
    selo(ctx, w, h, c, rnd) {
      const imovel = poligono(rnd, w * 0.5, h * 0.5, Math.min(w, h) * 0.5, 8, 0.3);
      ctx.lineWidth = 16; ctx.strokeStyle = c.curva; ctx.globalAlpha = 0.18;
      caminho(ctx, imovel, true); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.lineWidth = 1.4; ctx.strokeStyle = c.tinta; caminho(ctx, imovel, true); ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const p = poligono(rnd, w * (0.15 + rnd() * 0.7), h * (0.15 + rnd() * 0.7), w * 0.05, 6, 0.5);
        ctx.fillStyle = c.magenta; ctx.globalAlpha = 0.55; caminho(ctx, p, true); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    // Mapas técnicos: rede de drenagem ramificada
    mapas(ctx, w, h, c, rnd) {
      function ramo(x, y, ang, comp, esp) {
        if (comp < 8) return;
        const x2 = x + Math.cos(ang) * comp, y2 = y + Math.sin(ang) * comp;
        ctx.lineWidth = esp; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
        ramo(x2, y2, ang - 0.35 - rnd() * 0.3, comp * 0.72, esp * 0.7);
        ramo(x2, y2, ang + 0.35 + rnd() * 0.3, comp * 0.68, esp * 0.7);
      }
      ctx.strokeStyle = c.agua; ramo(w * 0.5, h, -Math.PI / 2, h * 0.32, 3);
      ctx.strokeStyle = c.tinta; ctx.lineWidth = 1; ctx.strokeRect(8, 8, w - 16, h - 16);
      // seta de norte
      ctx.fillStyle = c.tinta; ctx.beginPath();
      ctx.moveTo(w - 26, 20); ctx.lineTo(w - 20, 36); ctx.lineTo(w - 32, 36); ctx.fill();
      ctx.font = "10px " + c.mono; ctx.fillText("N", w - 30, 48);
    },
  };

  function iniciaVinhetas() {
    const cvs = document.querySelectorAll("canvas.vinheta[data-tipo]");
    function desenhaTodas() {
      const c = {
        tinta: token("--tinta"), tinta2: token("--tinta-2"), agua: token("--agua"),
        mata: token("--mata"), curva: token("--curva"), magenta: token("--magenta"),
        mono: token("--f-mono") || "monospace",
      };
      cvs.forEach((cv, i) => {
        const f = VINHETAS[cv.dataset.tipo]; if (!f) return;
        const { ctx, w, h } = preparaCanvas(cv);
        ctx.clearRect(0, 0, w, h);
        f(ctx, w, h, c, aleatorio(42 + i * 7));
      });
    }
    desenhaTodas();
    let tempo;
    const refaz = () => { clearTimeout(tempo); tempo = setTimeout(desenhaTodas, 120); };
    window.addEventListener("resize", refaz);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", refaz);
    new MutationObserver(refaz).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  // As fontes mudam a métrica do texto nos canvases; espera carregarem
  function inicia() { iniciaHero(); iniciaVinhetas(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(inicia);
  else window.addEventListener("load", inicia);

  // Ano corrente no rodapé
  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();
})();
