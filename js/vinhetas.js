/* =====================================================================
   DeMap · demap.com.br — vinhetas do portfólio
   ---------------------------------------------------------------------
   Pequenos mapas ilustrativos desenhados em <canvas> para cada caso do
   portfólio (atributo data-tipo). Cores lidas dos tokens CSS.
   Para trocar uma vinheta por imagem real, substitua o <canvas> por
   <img class="vinheta" src="img/arquivo.jpg" alt="...">.
   Sem dependências externas.
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

  /* ---------- Vinhetas dos casos ---------- */

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
  function inicia() { iniciaVinhetas(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(inicia);
  else window.addEventListener("load", inicia);

  // Ano corrente no rodapé
  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();
})();
