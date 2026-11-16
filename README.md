# demap.com.br

Site institucional e portfólio da **DeMap**: inteligência geográfica, automação de estudos ambientais, análise geoespacial e WebGIS para projetos em qualquer lugar do mundo.

Site estático, sem build: HTML, CSS e JavaScript puros. A única dependência externa é o d3 (cdnjs), usado no globo do topo.

## Estrutura

```
index.html        página única (serviços, trabalhos, método, equipe, atuação, contato)
css/estilo.css    tokens de cor/tipografia (tema escuro único) e layout
js/orbita.js      hero: a Terra em projeção ortográfica com zoom animado (d3-geo)
js/dados/terra.js continentes e fronteiras (Natural Earth via world-atlas, domínio público)
js/vinhetas.js    pequenos mapas ilustrativos dos casos do portfólio
img/              favicon e, futuramente, imagens dos trabalhos
CNAME             domínio para o GitHub Pages
```

## Rodar localmente

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Publicar no GitHub Pages

1. Criar o repositório (sugestão: `Rob-eng/demap-site`) e enviar estes arquivos para a branch `main`.
2. Em *Settings → Pages*: *Deploy from a branch*, `main`, pasta `/ (root)`.
3. No registro do domínio (Registro.br), apontar `demap.com.br`:
   - registros **A** para `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - **CNAME** `www` → `rob-eng.github.io`
4. Voltar em *Settings → Pages*, conferir o domínio e marcar *Enforce HTTPS*.

## Editar conteúdo

- Textos dos trabalhos: bloco `Trabalhos` em `index.html`. Clientes aparecem só por região e tipo de imóvel.
- Trocar a vinheta de um caso por imagem real: substituir o `<canvas class="vinheta">` por
  `<img class="vinheta" src="img/arquivo.jpg" alt="descrição">`.
- Cores e fontes: bloco `:root` no topo de `css/estilo.css`.
- Regiões do tour do globo: lista `ALVOS` no topo de `js/orbita.js` (nome, longitude, latitude, zoom).
- Contato: bloco `Contato` em `index.html` (o e-mail ainda está marcado com `TODO`).
