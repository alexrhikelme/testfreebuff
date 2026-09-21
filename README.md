Grupo:
Alex Rhikelme
Igor Gabriel
Lucas Mourato
Gabriel Vera
Kelvson Nilson

Uma aplicação que busca juntar o tipo de organização de projeto Kanban + Notion para a agência Combogó da UNICAP, onde será possível designar tarefas a pessoas e definir o prazo para cada atividade, além de formas de visualizar a progressão do projeto por porcentagem ou gráficos.

Tecnologias
Linguagens

TypeScript — Atualmente, a principal linguagem aplicada ao projeto.

CSS — Principal parte visual do projeto.

HTML — Utilizado apenas para introdução do Vite ao projeto.

Frameworks e Bibliotecas

React — V.19 — Biblioteca de UI, utilizando componentes funcionais e hooks.

React Router DOM — V.7 — Roteamento SPA, incluindo rotas públicas e protegidas.

Tailwind CSS — V.4 — Estilização utility-first com tema dark-first e tokens customizados.

Context API — Gerenciamento de estados.

Build e Desenvolvimento

Vite 6

TypeScript Compiler

PostCSS

Autoprefixer

Biome

Bun

Arquitetura do Projeto

O projeto utiliza uma arquitetura organizada por features/domínios, mantendo a interface e a lógica relacionadas próximas.

Design

O projeto utiliza um sistema próprio de design baseado em Design Tokens.

As cores e demais propriedades visuais são definidas através de variáveis CSS.

Esses tokens são integrados ao Tailwind CSS 4, permitindo que os componentes utilizem as classes utilitárias mantendo uma identidade visual centralizada.

Gerenciamento de Estado

O gerenciamento de estado utiliza exclusivamente a Context API do React.

Atualmente, os dados permanecem apenas em memória.

Ainda Não Implementado

Backend / Database

Drag and Drop

Testes automatizados

UI Kit externo
