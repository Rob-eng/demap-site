# demap.com.br

Site institucional e portfólio da **DeMap**: inteligência geográfica, automação de estudos ambientais, análise geoespacial e WebGIS para projetos em qualquer lugar do mundo.

Site estático, sem build: HTML, CSS e JavaScript puros. Abre direto no navegador.

## Estrutura

```
index.html        página única (seções: serviços, trabalhos, método, atuação, contato)
css/estilo.css    tokens de cor/tipografia (tema claro e escuro) e layout
js/carta.js       desenhos em canvas: curvas de nível do hero e vinhetas dos casos
img/              favicon e, futuramente, imagens dos trabalhos
CNAME             domínio para o GitHub Pages
```

## Variantes visuais

Além do `index.html` (folha topográfica), há duas propostas com o mesmo conteúdo:

- `antiga.html`: carta náutica antiga, com litorais reais em Mercator (`css/antiga.css`, `js/antiga.js`)
- `orbita.html`: a Terra vista do espaço, com zoom animado sobre regiões (`css/orbita.css`, `js/orbita.js`)

As duas usam d3-geo (cdnjs) e `js/dados/terra.js` (Natural Earth via world-atlas, domínio público).
O texto é editado só no `index.html`; depois rode `python3 ferramentas/gerar_variantes.py` para atualizar as variantes.

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
- Contato: bloco `Contato` em `index.html` (marcado com `TODO`).
