# Visão geral do SPAF e estrutura interna

## Por que o SPAF existe

O projeto nasceu com um propósito claro: organizar o trabalho de laboratório em anotações, projetos e dashboards que realmente conversam entre sí.

Em vez de separar tudo em planilhas, mensagens e arquivos soltos, o SPAF reúne:

- notas com status e prazos
- dashboards que reúnem e orientam o trabalho
- equipe com permissões
- visualizações que mudam a forma como o time vê o que está acontecendo

O resultado deve ser menos “onde está aquilo?” e mais “o que precisa ser feito agora?”.

## O que queremos entregar

Um produto onde é possível:

- criar e organizar anotações
- dar status, etiquetas e prazos
- atribuir trabalho para pessoas
- montar dashboards por contexto
- mudar a forma de visualizar sem quebrar a compreensão
- editar e acompanhar mudanças em equipe

O foco não é fazer muitas coisas simultaneamente. O foco é fazer o essencial bem, em ordem, de forma que o time possa usar sem esforço desnecessário.

## Como pensamos a construção

O SPAF não vai ser feito como uma massa única. Vamos construí-lo como um conjunto de módulos com limites claros, onde cada parte tem responsabilidade definida.

Isso ajuda a:

- não misturar responsabilidades
- evoluir sem quebrar o que já funciona
- testar comportamentos reais
- manter o código legível por quem vier depois

## Princípios que guiam o projeto

1. **Responsabilidade definida**
   Cada módulo deve saber o que sabe fazer e o que não deve conhecer.

2. **Clareza antes de velocidade**
   Decisões novas devem ser documentadas quando vão afetar mais de uma parte do sistema.

3. **Estado real por trás da interface**
   A UI não deve fingir que tem certezas que não tem.

4. **Permissões reais**
   O que a interface mostra não pode ser a única fronteira de segurança.

5. **Feedback constante**
   O sistema deve comunicar o que está acontecendo: sucesso, erro, carregando, vazio, mudança.

6. **Testes com propósito**
   Testamos o que importa para o uso real, não apenas o que é fácil de cobrir.

## Visão do usuário

O SPAF serve principalmente para três tipos de uso inicial:

- alguém que cria e organiza notas e gostaria de ver tudo junto
- alguém que recebe tarefas, prazos e deve acompanhar o andamento
- alguém que coordena o time e precisa ver status, quem faz o quê e onde está o risco

Esses perfis ajudam a validar se o produto está sendo útil, não apenas completo.

## Usuários e intenções iniciais

- [[Pesquisador/analista]]: organiza ideias, observações e tarefas em notas e dashboards
- [[Membro do time/parceiro]]: acompanha o que foi atribuído e avança com visibilidade
- [[Coordenador/líder]]: vê o conjunto, distribui trabalho e identifica gargalos

Essas intenções vão influenciar diretamente o que vamos priorizar nas próximas sprints.

## Como o projeto está organizado

Uma base já foi iniciada para que o projeto tenha estrutura real:

- `package.json` com dependências base
- configuração TypeScript e Vite
- Tailwind + PostCSS configurados
- estrutura inicial de `src/app`
- `SPRINTS_PLANO.md` com o plano de sprints
- `CEREBRO_PROJETO.md` como hub central com wikilinks

Isso significa que a Sprint 0 não é apenas um documento teórico: ela já está sendo materializada no repositório.

## Onde o projeto vai evoluir

As próximas etapas principais são:

- definir histórias iniciais com critérios claros
- consolidar os módulos de anotações, dashboards e equipe
- criar componentes que façam sentido para o domínio
- validar fluxos antes de expandir
- refinar usabilidade e qualidade antes de entregar mais leve para fora

## Padrão mínimo de qualidade esperado

Durante a evolução, consideramos um trabalho mais pronto quando:

- o fluxo principal testado funciona de ponta a ponta
- estados invisíveis têm tratamento claro
- erros são comunicados de forma útil
- permissões são respeitadas em mais de um nível
- novos membros conseguem entender onde as coisas vivem

## Para lembrar

O SPAF não deve crescer como uma prova de que dá para fazer tudo. Ele deve crescer como um projeto que responde bem a necessidades reais de laboratório e equipe.

Por isso, cada sprint deve trazer valor utilizável, não só código novo.

## Links internos

- [[SPRINTS_PLANO.md]]
- [[CEREBRO_PROJETO.md]]
- [[GIT_COMMITTER.md]]
- [[Sprint 0 — Fundação]]
