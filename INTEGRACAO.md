# Integração na plataforma Kobalt

## Base e destino

O diagnóstico fornecido em 03/11/2026 informa Next.js/React, TypeScript, Tailwind, CSS por componente e publicação pela Vercel. A aplicação atende a home pública e `app.kobalt.com.br` conforme o host. Essas informações foram recebidas da fábrica; o estado atual do cockpit não foi verificado nesta entrega.

Confirmar as instruções do repositório canônico na VPS e a base atual antes de alterar código. O GitHub `brenosotovieira-spec/kobalt-cockpit` foi descrito como espelho. Este repositório visual não muda essa relação.

## Blocos da home

1. Cabeçalho: logo original à esquerda, sem menu.
2. Hero e transição: uma cena com pedra 3D central; H1 inferior esquerdo, apoio à direita; sem CTA, logos de clientes ou vídeo. A rolagem revela a frase aprovada sobre branco.
3. Soluções e ecossistema: três cards; fundo estático com sobreposição preta de 70%; iluminação acumulativa dos quatro papéis.
4. Resultados: cinco cases e suas métricas aprovadas.
5. Aplicações: áreas da empresa e implementação da IA na operação.
6. Método: acordeão com quatro etapas e troca a cada sete segundos, sincronizada com a cena do método.
7. FAQ e contato: chamada final em um card dentro da área de perguntas.
8. Rodapé: marca, links e efeito de metal líquido azul.

## Adaptação para Next.js/React

- Preservar o roteamento por host, layouts internos, login, dados e tarefas da aplicação. Integrar os componentes na página pública.
- Manter interatividade em componentes cliente conforme as convenções existentes. Converter os scripts globais para efeitos e handlers com escopo no componente.
- Ao desmontar a hero, cancelar `requestAnimationFrame`, remover eventos, desconectar observers e liberar geometrias, materiais, render targets, ambiente e renderer. O script de referência limpa recursos ao sair da página; em React, a limpeza também precisa acompanhar desmontagens e navegações internas.
- O motor da hero está em `source/home/hero-mineral-3d.js`. Usa Three.js 0.180.0 com pós-processamento. Instalar a versão equivalente no projeto e resolver os imports pelo bundler; o import map e os imports HTTP locais servem à referência estática. Se optar pelos módulos estáticos, copiar toda a árvore do vendor e ajustar os caminhos à rota final.
- O mineral é procedural: frente, verso, paredes, fissura e cristais. A imagem azul é somente fallback. Preservar a câmera, o percurso e a resposta à rolagem; transformar uma imagem plana não reproduz essa cena.
- Estilos globais da referência não devem ser importados no layout compartilhado. Portar para CSS Modules ou para o padrão por componente da plataforma. Preservar a ordem registrada em `style-layers.json` e isolar as variáveis da home.
- Respeitar movimento reduzido, suspensão fora de vista/aba oculta e o ajuste de enquadramento em telas estreitas. `source/home/hero-mineral-3d.css` define o palco de rolagem e a revelação da frase.
- Reutilizar as fontes Archivo e IBM Plex Mono já existentes ou os arquivos locais incluídos, o logo original e os SVGs Font Awesome com atribuição.

## Contato e métricas

O botão final da referência leva a `https://kobalt.com.br/#contato`. Na aplicação definitiva, vinculá-lo ao formulário real; copiar o link literalmente para a própria home pode apenas voltar ao card. Reaproveitar endpoint, validações, estados, origem/UTM e eventos Google existentes, com o consentimento aplicável. Evitar tags ou conversões duplicadas.

Preservar os significados dos resultados:

- Restaurantes: 60% menos tempo em funções administrativas.
- Oficina: 40% menos tempo e 10% mais receita com o mesmo custo.
- Deguste: 30% menos tempo para gerar a folha.
- Grancereal: 70% menos tempo no fechamento mensal do RH.
- Sistemas: 25% menos custo, sem atribuir a cliente não identificado.

## Revisão e publicação

Criar uma alteração isolada pelo procedimento da fábrica, adaptar a home, executar as verificações obrigatórias e produzir uma prévia revisável. Conferir desktop, celular, teclado, cards, cases, método, FAQ, formulário e isolamento dos dois hosts. Verificar também navegação interna/desmontagem da cena 3D, desempenho no celular, movimento reduzido e fallback sem WebGL.

A publicação na plataforma segue o fluxo de liberação da fábrica. Este pacote não contém um patch já integrado ao cockpit. As evidências da referência e seus limites estão em `docs/verificacao-origem.json`.
