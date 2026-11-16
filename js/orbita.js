/* =====================================================================
   DeMap · variante "Órbita" — a Terra vista do espaço
   ---------------------------------------------------------------------
   Globo em projeção ortográfica desenhado em <canvas> com continentes
   reais (Natural Earth, js/dados/terra.js). Um "tour" orbital alterna
   vista distante girando e zoom em regiões de interesse, com HUD de
   alvo, coordenadas e altitude aproximada.
   - Longe: usa a base leve (1:110m); perto: a detalhada (1:50m).
   - Pausa quando o hero sai da tela ou a aba fica oculta.
   - prefers-reduced-motion: desenha um único quadro, sem animação.
   Depende de: d3 (d3-geo) e window.DEMAP_TERRA.
   ===================================================================== */
(function () {
  "use strict";
  const cv = document.getElementById("globo");
  if (!cv || !window.d3 || !window.DEMAP_TERRA) return;
  const leitura = document.getElementById("leitura");
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Regiões do tour: [nome, longitude, latitude, zoom]
  const ALVOS = [
    ["Pantanal", -57.0, -18.5, 7],
    ["Cordilheira dos Andes", -69.5, -27.0, 5],
    ["Amazônia", -61.0, -4.5, 5.5],
    ["Mata Atlântica", -46.5, -23.0, 7],
    ["Cerrado", -47.5, -13.5, 6],
  ];

  const grat = d3.geoGraticule().step([15, 15])();
  const esfera = { type: "Sphere" };
  let w = 0, h = 0, ctx = null, dpr = 1, estrelas = [];

  function prepara() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect(); w = r.width; h = r.height;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Campo de estrelas fixo (semente determinística)
    let s = 99; const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    estrelas = Array.from({ length: Math.round((w * h) / 2600) }, () => [rnd() * w, rnd() * h, rnd() * 1.2 + 0.2, rnd() * 6]);
  }

  // Centro e raio base do globo conforme a largura (texto à esquerda no desktop)
  function geometria() {
    const largo = w > 760;
    return {
      cx: largo ? w * 0.68 : w * 0.5,
      cy: largo ? h * 0.52 : Math.min(h * 0.3, 220),
      R0: largo ? Math.min(w * 0.27, h * 0.42) : Math.min(w * 0.42, 170),
    };
  }

  const suave = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
  const mistura = (a, b, t) => a + (b - a) * t;
  function misturaLon(a, b, t) { let d = ((b - a + 540) % 360) - 180; return a + d * t; }

  // Linha do tempo de um ciclo por alvo (segundos)
  const T_GIRO = 4, T_ZOOM = 3, T_FICA = 3.5, T_VOLTA = 2.5;
  const CICLO = T_GIRO + T_ZOOM + T_FICA + T_VOLTA;

  // Estado da câmera no instante t (s): longitude, latitude, zoom e alvo
  function camera(t) {
    const i = Math.floor(t / CICLO) % ALVOS.length;
    const alvo = ALVOS[i], ant = ALVOS[(i + ALVOS.length - 1) % ALVOS.length];
    let f = t % CICLO, lon, lat, z, fase;
    const lonLonge = ant[1] - 25, lonLongeAlvo = alvo[1] - 25; // vista distante, um pouco a oeste
    if (f < T_GIRO) {                             // gira devagar até o próximo alvo, de longe
      const k = suave(f / T_GIRO);
      lon = misturaLon(lonLonge, lonLongeAlvo, k); lat = mistura(ant[2] * 0.5, alvo[2] * 0.5, k); z = 1; fase = "aproximando";
    } else if ((f -= T_GIRO) < T_ZOOM) {          // mergulho no alvo
      const k = suave(f / T_ZOOM);
      lon = misturaLon(lonLongeAlvo, alvo[1], k); lat = mistura(alvo[2] * 0.5, alvo[2], k); z = mistura(1, alvo[3], k); fase = "descendo";
    } else if ((f -= T_ZOOM) < T_FICA) {          // sobrevoo lento
      lon = alvo[1] + f * 0.25; lat = alvo[2]; z = alvo[3]; fase = "observando";
    } else {                                      // sobe de volta
      f -= T_FICA; const k = suave(f / T_VOLTA);
      lon = misturaLon(alvo[1] + T_FICA * 0.25, lonLongeAlvo, k); lat = mistura(alvo[2], alvo[2] * 0.5, k); z = mistura(alvo[3], 1, k); fase = "subindo";
    }
    return { lon, lat, z, alvo, fase };
  }

  function dms(v, pos, neg) {
    const hm = v < 0 ? neg : pos; v = Math.abs(v);
    const g = Math.floor(v), m = Math.floor((v - g) * 60);
    return g + "°" + String(m).padStart(2, "0") + "′" + hm;
  }

  let ultimoHud = "";
  function quadro(t) {
    const { cx, cy, R0 } = geometria();
    const c = camera(t);
    const R = R0 * c.z;
    const proj = d3.geoOrthographic().rotate([-c.lon, -c.lat]).scale(R).translate([cx, cy]).clipAngle(90).precision(0.5);
    const path = d3.geoPath(proj, ctx);
    const terra = c.z > 2.2 ? DEMAP_TERRA.terra : DEMAP_TERRA.terraLeve;
    const agua = css("--agua"), mata = css("--mata"), ambar = css("--magenta");

    // Fundo e estrelas (as estrelas somem conforme o zoom aproxima)
    ctx.fillStyle = "#05080f"; ctx.fillRect(0, 0, w, h);
    const brilhoEstrelas = Math.max(0, 1 - (c.z - 1) / 2.5);
    if (brilhoEstrelas > 0) {
      for (const [x, y, r, fase] of estrelas) {
        ctx.globalAlpha = brilhoEstrelas * (0.45 + 0.35 * Math.sin(t * 1.3 + fase));
        ctx.fillStyle = "#cfe3ff"; ctx.fillRect(x, y, r, r);
      }
      ctx.globalAlpha = 1;
    }

    // Atmosfera: halo azul ao redor do disco
    const halo = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.12);
    halo.addColorStop(0, "rgba(74,163,216,0.55)"); halo.addColorStop(1, "rgba(74,163,216,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2); ctx.fill();

    // Oceano com luz vinda do alto à esquerda
    const mar = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    mar.addColorStop(0, "#14456b"); mar.addColorStop(1, "#061a2c");
    ctx.fillStyle = mar; ctx.beginPath(); path(esfera); ctx.fill();

    // Graticulado
    ctx.strokeStyle = agua; ctx.globalAlpha = 0.16; ctx.lineWidth = 0.6;
    ctx.beginPath(); path(grat); ctx.stroke(); ctx.globalAlpha = 1;

    // Continentes e fronteiras
    ctx.fillStyle = "#1d3b33"; ctx.beginPath(); path(terra); ctx.fill();
    ctx.strokeStyle = mata; ctx.globalAlpha = 0.85; ctx.lineWidth = c.z > 2.2 ? 1.1 : 0.8;
    ctx.beginPath(); path(terra); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.lineWidth = 0.6; ctx.beginPath(); path(DEMAP_TERRA.fronteiras); ctx.stroke();
    ctx.globalAlpha = 1;

    // Sombra do lado noturno (terminador simulado)
    const noite = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.45, R * 0.3, cx - R * 0.2, cy - R * 0.2, R * 1.45);
    noite.addColorStop(0, "rgba(5,8,15,0)"); noite.addColorStop(1, "rgba(5,8,15,0.78)");
    ctx.fillStyle = noite; ctx.beginPath(); path(esfera); ctx.fill();

    // Retícula âmbar no alvo enquanto desce/observa
    const p = proj([c.alvo[1], c.alvo[2]]);
    if (p && c.fase !== "aproximando") {
      const a = c.fase === "subindo" ? 0.5 : 1;
      ctx.strokeStyle = ambar; ctx.globalAlpha = a; ctx.lineWidth = 1.3;
      const s = 22;
      ctx.beginPath();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        ctx.moveTo(p[0] + sx * s, p[1] + sy * (s - 8)); ctx.lineTo(p[0] + sx * s, p[1] + sy * s); ctx.lineTo(p[0] + sx * (s - 8), p[1] + sy * s);
      });
      ctx.stroke();
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.5, 0, Math.PI * 2); ctx.fillStyle = ambar; ctx.fill();
      ctx.globalAlpha = 1;
    }

    // HUD em texto (só atualiza o DOM quando muda)
    const alt = Math.round(35786 / Math.pow(c.z, 2.2) / 10) * 10; // altitude ilustrativa, km
    const hud = (c.fase === "aproximando" ? "rumo a " : "") + "<b>" + c.alvo[0] + "</b> · " + dms(c.lat, "N", "S") + " " + dms(c.lon, "L", "O") +
      " · alt. ≈ " + alt.toLocaleString("pt-BR") + " km";
    if (leitura && hud !== ultimoHud) { leitura.innerHTML = hud; ultimoHud = hud; }
  }

  // Laço de animação, pausado fora da tela ou com a aba oculta
  let rodando = false, visivel = true, t0 = null, tPausa = 0;
  function laco(ts) {
    if (!rodando) return;
    if (t0 === null) t0 = ts - tPausa * 1000;
    tPausa = (ts - t0) / 1000;
    quadro(tPausa);
    requestAnimationFrame(laco);
  }
  // ctx só existe depois de inicia(); antes disso liga() não faz nada
  function liga() { if (!ctx || rodando || semMovimento || !visivel || document.hidden) return; rodando = true; t0 = null; requestAnimationFrame(laco); }
  function desliga() { rodando = false; }

  function inicia() {
    prepara();
    if (semMovimento) { quadro(T_GIRO + T_ZOOM + 0.5); return; } // quadro parado sobre o Pantanal
    quadro(0); liga();
  }
  new IntersectionObserver((e) => { visivel = e[0].isIntersecting; visivel ? liga() : desliga(); }).observe(cv);
  document.addEventListener("visibilitychange", () => (document.hidden ? desliga() : liga()));
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { prepara(); quadro(tPausa); }, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(inicia); else inicia();
})();
