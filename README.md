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
