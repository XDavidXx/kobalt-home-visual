# Kobalt Design System · 1.1.0

Padrão de marca e interface consolidado em 3 de novembro de 2026. Baseado nas decisões do projeto da home: azul predominante, logo original, respiro, superfícies claras e escuras, Font Awesome e movimento sutil em tons frios.

## Usar

Carregue `fonts.css`, `tokens.css` e `components.css`, nesta ordem. Mantenha a pasta `assets/` relativa a `fonts.css`. Aplique `class="kb-scope" data-kb-theme="light"` no contêiner da interface; troque o tema por `dark` quando necessário. Os componentes são opt-in e não incluem reset global de outras aplicações.

```html
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">
<main class="kb-scope" data-kb-theme="light">
  <button class="kb-button" type="button">Continuar</button>
</main>
```

Abra `examples.html` para ver a biblioteca sem depender de framework. Os arquivos funcionam servidos por qualquer servidor estático. `tokens.ts` exporta os mesmos valores para TypeScript. `tailwind.preset.cjs` é um adaptador opcional para Tailwind 3; mescle em `presets` e use classes com prefixo `kb-`.

## Fonte de verdade

`tokens.json` é a origem dos valores. No kit, execute `python3 generate.py` para gerar `tokens.css` e `tokens.ts`, sem dependências externas. `build.py` no projeto de origem gera também o guia e a ponte de fundamentos da home. Não edite os arquivos gerados em paralelo. No próximo release, altere o JSON, regenere, confira o guia e as telas afetadas e registre a alteração em `CHANGELOG.md`.

## Marca

- Nome escrito Kobalt. Não reconstruir o lettering com uma fonte.
- `assets/brand/kobalt-original.svg` preserva o original recebido. As versões branca e azul derivam exatamente da mesma geometria.
- Reserva mínima: metade da altura do símbolo ao redor do conjunto. Largura mínima de uso digital: 120 px. Essas duas regras são novas especificações desta versão; os arquivos vetoriais são a referência de proporção.
- Azul principal #315FE5; o detalhe azul #5B90E8 do SVG original permanece preservado e não substitui a cor dos controles.
- Archivo variável para texto e títulos. IBM Plex Mono para índices, rótulos técnicos curtos e código. As fontes WOFF2 latinas incluídas cobrem o português. Outros idiomas podem exigir subconjuntos adicionais.
- Ícones Font Awesome Free 6.7.2 em SVG. Preserve `viewBox`, proporção e comentários de licença. Nunca substitua por emoji ou caractere Unicode. Use `currentColor` para ícones SVG inline; `img` externo não herda essa cor.

## Componentes e comportamento

Botões primários são azuis e arredondados; use uma ação principal por bloco. Controles têm 48 px de altura; botões editoriais 56 px; alvos isolados pelo menos 44 × 44 px. O padrão de alvo adotado é mais confortável que o mínimo de 24 px da WCAG 2.2, que contém exceções.

Formulários usam label visível e associação `for`/`id`; ajuda e erro ligados por `aria-describedby`. `aria-invalid` comunica erro. Não use placeholder como label. Campos ficam com fonte de pelo menos 16 px em mobile. Estados de erro têm mensagem, não apenas cor. Botões apenas com ícone precisam de nome acessível. Loading preserva a ação escrita e sinaliza `aria-busy`.

`details`/`summary` é o acordeão básico sem JavaScript. Abas exigem `role`, `aria-selected`, `tabindex`, painéis associados e navegação por setas, Home e End; o guia demonstra o comportamento. Não use apenas CSS para simular essas interações.

Sem dados, explique o que falta e ofereça uma próxima ação. Após erro, preserve os dados do usuário e ofereça recuperação. Dados de exemplo no guia são demonstrativos, sem representar desempenho real da Kobalt.

## Hero e carrossel de clientes

A hero usa `kb-scope` e `data-kb-theme="dark"`, o título H1 em duas linhas na escala de seção (`type.h2`) no desktop, com 28–40 px no celular, o texto Lead e `kb-button kb-button--large`. A composição mantém o cenário de marca, mas seus valores de tipografia, cores, espaçamento, foco e ação vêm dos tokens compartilhados.

Carregue `logo-carousel.css` e `logo-carousel.js` para o componente `.kb-logo-marquee`. Dentro dele: `.kb-logo-viewport`, `.kb-logo-track`, uma `.kb-logo-group` com `role="list"` e itens `.kb-logo-item` com `role="listitem"`. Cada item contém uma imagem com nome do cliente em `alt`. O script conta os itens e cria apenas uma cópia visual com `aria-hidden` e `inert`; a lista acessível mantém os seis nomes uma única vez.

A janela mostra três logos. A duração de 32 segundos por ciclo vem de `motion.logos`; a faixa tem máscara em degradê nas bordas. A largura acompanha a descrição da hero (`layout.hero-reading`), logo abaixo do botão. A animação pausa com hover/foco, fora da tela e com a aba oculta. Em `prefers-reduced-motion`, o componente mostra todos os logos em grade estática, sem máscara. Sem JavaScript também exibe a grade. O grupo recebe `tabindex="0"` para permitir foco pelo teclado.

A composição atual faz a queda metálica tocar diretamente a borda superior do vídeo. A luz se abre sobre a borda e acompanha seu canto arredondado, com o ponto de contato recalculado conforme o tamanho do quadro. O vídeo atravessa a divisão entre o fundo escuro e a área branca, em rolagem nativa e contínua. Essa composição pertence à home; não altera os tokens globais. O clipe atual é demonstrativo, com controles nativos e reprodução sem som apenas quando visível. A pausa manual é preservada. Com movimento reduzido, o cenário fica estático e o vídeo exige reprodução manual.

## Layout e responsividade

Base de espaçamento 4 px. Priorize 8, 16, 24, 32, 48 e 64 px dentro de componentes; 64–112 px entre seções, com heros mais amplas. Grid: 4 colunas abaixo de 640 px, 8 até 1099 px e 12 a partir de 1100 px. Contêiner máximo 1536 px; textos longos até 65 caracteres de largura. Breakpoints são exportados no JSON e no preset; CSS custom properties não funcionam em media queries.

Texto de leitura 18 px; interface 16 px; apoio 14 px; rótulos de seção 13 px. Não reduza corpo para caber. Títulos são fluidos, com um único H1 por página. Em 320 px, cards e formulários usam uma coluna. Tabelas extensas podem ter rolagem horizontal dentro do próprio contêiner, nunca na página inteira.

## Cor e movimento

Azul domina ações e identidade. Violeta e rosa frios são acentos esparsos em cenas de marca. Amarelo não participa do efeito da hero; a cor de atenção pode existir em estados funcionais acompanhados de texto. Evite gradientes sobre a imagem inteira: escureça a área necessária para leitura. O cenário “Cada parte tem um papel” mantém sobreposição preta de 70%.

Transições de interface: 120–240 ms. Mudanças de cena: até 600 ms. Acordeão de método editorial: 7 s, com interrupção durante foco/interação e movimento reduzido respeitado. Sequência de cards: acumule os estados iluminados antes de reiniciar. Não aplicar autoplay em formulários ou fluxos operacionais. Efeitos de marca devem parar fora da viewport e com a aba oculta, e oferecer estado estático em `prefers-reduced-motion`.

## Aplicação atual e fábrica

O guia e a home de referência consomem os mesmos fundamentos gerados: fontes, azul principal e estados de foco. As composições editoriais existentes da home permanecem específicas. A home não foi totalmente reescrita com as classes `kb-*` nesta entrega.

Campos, alertas, tabelas e estados de produto são padrões definidos agora e demonstrados no guia. A aplicação Next.js da fábrica não foi acessada nem alterada. O diagnóstico recebido informa Archivo + IBM Plex Mono e Tailwind 3; confirme o código real antes de integrar.

No Next.js, importe os três CSS no layout do escopo desejado e coloque `kb-scope`/tema nesse contêiner. Se `next/font/local` já carrega as mesmas fontes, reutilize-o e omita `fonts.css` para não carregar duas vezes. Primeiro aplique em uma rota de prévia; migre componentes existentes por área, preservando autenticação, formulários, UTMs e rastreamento. Não copie estilos da hero para dentro das telas de gestão.

## Versões

- PATCH: correção sem mudança visual intencional.
- MINOR: token ou componente novo compatível.
- MAJOR: remoção, renomeação ou alteração que exija migração.

Alterações de marca e composição devem ser revisadas no guia e nas telas afetadas. A versão publicada, o JSON e o pacote devem coincidir.

## Licenças e referências

Os logos Kobalt pertencem à marca. Fontes Archivo e IBM Plex Mono sob SIL Open Font License; textos completos em `assets/fonts/`. Ícones Font Awesome Free: SVGs sob CC BY 4.0; fonte sob SIL OFL e código sob MIT, conforme `assets/icons/LICENSE.txt`. Crédito: https://fontawesome.com/ . O shader de terceiros da hero não é redistribuído neste pacote.

Referências de contraste e alvos: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html e https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html . `contrast.json` registra o cálculo dos pares sólidos do padrão, não uma certificação da aplicação inteira.
