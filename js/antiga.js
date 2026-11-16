/* =====================================================================
   DeMap · variante "Carta antiga" — fundo do hero
   ---------------------------------------------------------------------
   Desenha, em <canvas>, uma carta náutica no estilo dos portulanos com
   litorais REAIS (Natural Earth, js/dados/terra.js) em projeção de
   Mercator: linhas d'água em volta da costa, linhas de rumo saindo de
   duas rosas dos ventos, graticulado, letreiros em latim e textura de
   pergaminho. O cursor mostra a coordenada real do ponto.
   Depende de: d3 (d3-geo) e window.DEMAP_TERRA.
   ===================================================================== */
(function () {
  "use strict";
  const cv = document.getElementById("carta-antiga");
  if (!cv || !window.d3 || !window.DEMAP_TERRA) return;

  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const mira = document.getElementById("mira");
  const leitura = document.getElementById("leitura");
  let proj = null;

  // Gerador com semente: a "sujeira" do papel é sempre a mesma
  function rnd(seed) {
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  function prepara(c) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  function desenha() {
    const { ctx, w, h } = prepara(cv);
    const tinta = css("--tinta"), verm = css("--magenta"), verde = css("--mata"), agua = css("--agua");

    // Mercator centrada no Atlântico Sul, com a América do Sul à direita do texto
    const largo = w > 760;
    proj = d3.geoMercator()
      .center(largo ? [-75, -18] : [-58, -16])   // no desktop o continente fica à direita do texto
      .scale(Math.max(w, h * 1.25) / (largo ? 1.5 : 1.1))
      .translate([w / 2, h / 2]);
    const path = d3.geoPath(proj, ctx);
    const terra = DEMAP_TERRA.terra;

    ctx.clearRect(0, 0, w, h);

    // 1) Graticulado de 10° em tracejado fino
    ctx.save(); ctx.setLineDash([2, 4]); ctx.strokeStyle = tinta; ctx.globalAlpha = 0.18; ctx.lineWidth = 0.7;
    ctx.beginPath(); path(d3.geoGraticule().step([10, 10])()); ctx.stroke(); ctx.restore();

    // 2) Linhas de rumo: 32 direções a partir de cada rosa (preto = 8 ventos,
    //    verde = meios-ventos, vermelho = quartas), como nos portulanos
    const rosas = [[-44, -33], [-100, -12]].map((p) => proj(p));
    rosas.forEach(([x, y]) => {
      for (let k = 0; k < 32; k++) {
        const a = (k / 32) * Math.PI * 2;
        ctx.strokeStyle = k % 4 === 0 ? tinta : k % 2 === 0 ? verde : verm;
        ctx.globalAlpha = k % 4 === 0 ? 0.32 : 0.26; ctx.lineWidth = k % 4 === 0 ? 0.9 : 0.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 3000, y + Math.sin(a) * 3000); ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    // 3) Linhas d'água: contornos sucessivos da costa, mais claros para fora
    for (let k = 5; k >= 1; k--) {
      ctx.strokeStyle = agua; ctx.globalAlpha = 0.07 + (5 - k) * 0.025; ctx.lineWidth = k * 5;
      ctx.beginPath(); path(terra); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 4) Terra: preenchimento de pergaminho mais escuro e costa a pena
    ctx.fillStyle = css("--papel-2"); ctx.beginPath(); path(terra); ctx.fill();
    ctx.strokeStyle = tinta; ctx.lineWidth = 1.1; ctx.beginPath(); path(terra); ctx.stroke();

    // 5) Hachuras de relevo ao longo dos Andes (marcas curtas, à mão)
    const r = rnd(7);
    ctx.strokeStyle = tinta; ctx.globalAlpha = 0.45; ctx.lineWidth = 0.8;
    for (let lat = 8; lat > -50; lat -= 1.1) {
      const lon = -78 + (lat < -5 ? 8 + Math.min(4, (-5 - lat) * 0.05) : 2) + Math.sin(lat / 6) * 1.5;
      const p = proj([lon + (r() - 0.5) * 1.5, lat]); if (!p) continue;
      const s = 6 + r() * 6;
      ctx.beginPath(); ctx.moveTo(p[0] - s, p[1] + 3); ctx.quadraticCurveTo(p[0], p[1] - s, p[0] + s, p[1] + 3); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 6) Rosa dos ventos sobre a primeira origem de rumos
    rosa(ctx, rosas[0][0], rosas[0][1], Math.min(90, w * 0.08), tinta, verm);

    // 7) Letreiros em latim, espaçados como na gravura
    // no celular os letreiros disputam espaço com o texto: só no desktop
    if (largo) {
    letreiro(ctx, "AMERICA MERIDIONALIS", proj([-58, -8]), 15, tinta, 0.75);
    letreiro(ctx, "OCEANVS ÆTHIOPICVS", proj([-28, -14]), 13, tinta, 0.6);
    letreiro(ctx, "MARE PACIFICVM", proj([-92, -37]), 13, tinta, 0.6);
    letreiro(ctx, "AFRICA", proj([18, 4]), 15, tinta, 0.6);
    }

    // 8) Textura de pergaminho: manchas (foxing) e escurecimento das bordas
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, raio = 8 + r() * 50;
      const g = ctx.createRadialGradient(x, y, 0, x, y, raio);
      g.addColorStop(0, "rgba(120,80,30,0.07)"); g.addColorStop(1, "rgba(120,80,30,0)");
      ctx.fillStyle = g; ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    }
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(90,60,20,0)"); v.addColorStop(1, "rgba(90,60,20,0.28)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }

  // Rosa dos ventos de 8 pontas, metades claras/escuras, N com flor-de-lis simplificada
  function rosa(ctx, x, y, R, tinta, verm) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = tinta; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.88, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2, longa = k % 2 === 0;
      const L = longa ? R : R * 0.6, l = R * (longa ? 0.13 : 0.1);
      const ax = Math.cos(a), ay = Math.sin(a), px = -ay, py = ax;
      [1, -1].forEach((lado, i) => {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ax * L, ay * L); ctx.lineTo(px * l * lado, py * l * lado); ctx.closePath();
        ctx.fillStyle = i === 0 ? tinta : (k === 0 ? verm : "rgba(236,220,182,0.95)"); ctx.fill(); ctx.stroke();
      });
    }
    ctx.fillStyle = verm; ctx.beginPath(); ctx.arc(0, 0, R * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.font = "italic " + Math.round(R * 0.24) + "px 'IM Fell English', Georgia, serif";
    ctx.fillStyle = tinta; ctx.textAlign = "center"; ctx.fillText("N", 0, -R - 6);
    ctx.restore();
  }

  function letreiro(ctx, txt, p, tam, cor, alfa) {
    if (!p) return;
    ctx.save(); ctx.globalAlpha = alfa; ctx.fillStyle = cor; ctx.textAlign = "center";
    ctx.font = "italic " + tam + "px 'IM Fell English', Georgia, serif";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0.35em";
    // mantém o letreiro inteiro dentro da tela
    const meia = ctx.measureText(txt).width / 2, w = cv.getBoundingClientRect().width;
    const x = Math.min(Math.max(p[0], meia + 12), w - meia - 12);
    ctx.fillText(txt, x, p[1]); ctx.restore();
  }

  // Coordenada real sob o cursor (proj.invert)
  function dms(v, pos, neg) {
    const hm = v < 0 ? neg : pos; v = Math.abs(v);
    const g = Math.floor(v), m = Math.floor((v - g) * 60);
    return g + "° " + String(m).padStart(2, "0") + "′ " + hm;
  }
  function marca(x, y) {
    if (!proj) return;
    const ll = proj.invert([x, y]);
    if (leitura && ll) leitura.textContent = "Lat. " + dms(ll[1], "N", "S") + " · Long. " + dms(ll[0], "L", "O") + " de Greenwich";
    if (!mira) return;
    const { ctx, w, h } = prepara(mira); ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = css("--magenta"); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y); ctx.moveTo(x, y - 16); ctx.lineTo(x, y + 16); ctx.stroke();
  }

  let ultimo = null;
  cv.parentElement.addEventListener("pointermove", (e) => {
    const r = cv.getBoundingClientRect();
    ultimo = [e.clientX - r.left, e.clientY - r.top]; marca(ultimo[0], ultimo[1]);
  });

  function inicia() {
    desenha();
    const r = cv.getBoundingClientRect();
    const p0 = proj([-60, -10]) || [r.width * 0.7, r.height * 0.4]; // ponto inicial no centro do continente
    ultimo = p0; marca(p0[0], p0[1]);
  }
  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { desenha(); if (ultimo) marca(ultimo[0], ultimo[1]); }, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(inicia); else inicia();
})();
