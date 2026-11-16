"""
Gera as variantes visuais do site a partir do index.html.

O conteúdo (textos, serviços, portfólio) é mantido só no index.html.
Este script cria:
  - antiga.html  -> variante "Carta antiga" (portulano com litorais reais)
  - orbita.html  -> variante "Órbita" (a Terra vista do espaço, com zoom)

Cada variante troca apenas: fontes, folha de estilo extra, o canvas do
hero e os scripts do hero. Rode depois de editar o index.html:

    python3 ferramentas/gerar_variantes.py
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
FONTES_ORIGINAIS = (
    "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800"
    "&family=IBM+Plex+Mono:wght@400;500&family=Public+Sans:wght@400;500;600&display=swap"
)
D3 = '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>'

VARIANTES = {
    "antiga.html": {
        "fontes": "https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1"
                  "&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap",
        "css": "css/antiga.css",
        "canvas": "carta-antiga",
        "js": "js/antiga.js",
        "margem": "Projeção de Mercator · graticulado de 10° · litorais Natural Earth",
        "cor_tema": "#ecdcb6",
    },
    "orbita.html": {
        "fontes": "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600"
                  "&family=Manrope:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
        "css": "css/orbita.css",
        "canvas": "globo",
        "js": "js/orbita.js",
        "margem": "Projeção ortográfica · WGS 84 · continentes Natural Earth",
        "cor_tema": "#05080f",
    },
}


def gerar(nome: str, v: dict) -> None:
    html = (RAIZ / "index.html").read_text(encoding="utf-8")

    def troca(antigo: str, novo: str) -> None:
        nonlocal html
        if antigo not in html:
            raise SystemExit(f"[{nome}] trecho não encontrado no index.html: {antigo[:60]}...")
        html = html.replace(antigo, novo)

    troca(FONTES_ORIGINAIS, v["fontes"])
    troca('<link rel="stylesheet" href="css/estilo.css">',
          f'<link rel="stylesheet" href="css/estilo.css">\n  <link rel="stylesheet" href="{v["css"]}">')
    troca('<meta name="theme-color" content="#e9eee8">', f'<meta name="theme-color" content="{v["cor_tema"]}">')
    troca('<canvas id="relevo" aria-hidden="true"></canvas>', f'<canvas id="{v["canvas"]}" aria-hidden="true"></canvas>')
    troca("WGS 84 · EPSG:4326 · equidistância ilustrativa", v["margem"])
    troca('<script src="js/carta.js" defer></script>',
          f'{D3}\n<script src="js/dados/terra.js"></script>\n'
          f'<script src="js/carta.js" defer></script>\n<script src="{v["js"]}" defer></script>')
    (RAIZ / nome).write_text(html, encoding="utf-8")
    print("gerado:", nome)


if __name__ == "__main__":
    for nome, v in VARIANTES.items():
        gerar(nome, v)
