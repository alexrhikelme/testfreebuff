# Cérebro do Projeto — [[Plataforma de Notas e Dashboards Colaborativos]]

> Este arquivo é o hub central do conhecimento do projeto. Use **wikilinks** para conectar decisões, requisitos, design e sprints.

---

## 1. Identidade e propósito

**Produto:** Plataforma de anotações e dashboards colaborativos para gestão de laboratório.

**Problema principal:** organizar trabalho disperso em anotações, statuses, prazos e dashboards compartilhados, com controle de quem edita o quê.

**Valor esperado:**

- Tarefas e anotações menos perdidas
- Visibilidade melhor sobre progresso e responsabilidades
- Colaboração mais segura e menos dependência de “preguiça de perguntar”

## 2. Links centrais

- [[DESIGN.md]]
- [[Paleta Oficial Combogó Unicap]]
- [[SPRINTS_PLANO.md]]
- [[Requisitos Funcionais]]
- [[Histórias de Usuário]]
- [[Arquitetura e Módulos]]
- [[Decisões Técnicas]]
- [[Testes e Qualidade]]

## 3. Requisitos

Ver: [[Requisitos Funcionais]].

Resumo por domínio:

- [[Anotações]]
    - CRUD
    - Status
    - Tags
    - Prazos (início e término)
    - Atribuição a parceiros/membros
- [[Dashboards]]
    - Múltiplos dashboards
    - Adicionar/remover anotações
    - Compartilhamento com membros
- [[Equipe e Permissões]]
    - Convidar/remover membros
    - Níveis de permissão
- [[Visualizações]]
    - Kanban por status
    - Grade de cards
    - Lista/tabela
    - Drag-and-drop e reordenação
- [[Colaboração]]
    - Edição colaborativa
    - Indicadores visuais em tempo real

## 4. Visão do usuário

### Personas (inicial)

- [[Pesquisador/Analista]] — cria e organiza anotações, quer ver progresso rapidamente
- [[Membro de Time/Parceiro]] — recebe atribuições, edita, mudar status, acompanha prazos
- [[Líder/Coordenador]] — vê dashboards, distribui trabalho, monitora status e prazos

### Fluxos principais

- [[Flujo: Criar anotação]]
- [[Flujo: Organizar em dashboard]]
- [[Flujo: Atribuir e mudar status]]
- [[Flujo: Reordenar e visualizar]]

## 5. Design e experiência

Ver: [[DESIGN.md]].

Pontos centrais:

- [[Minimalismo-Espectral]]: interface que recua e deixa o trabalho à frente
- [[Sistema de Status]]: cores e chips com significado claro
- [[Tipografia e Hierarquia]]: leitura densa sem perda de ritmo
- [[Componentes Base]]: buttons, cards, chips, inputs, seleção
- [[Motion e Feedback]]: feedback sutil, mas perceptível

## 6. Arquitetura e organização de módulos

Ver: [[Arquitetura e Módulos]].

Principais módulos:

- [[Módulo: Auth]]
- [[Módulo: Notes]]
- [[Módulo: Dashboards]]
- [[Módulo: Members]]
- [[Módulo: Shared UI]]
- [[Módulo: Views/Layouts]]

Princípios:

- responsabilidade única por módulo
- limites explícitos de dependência
- separar regras de negócio da apresentação
- manter código compartilhado realmente compartilhado

## 7. Backlog e sprints

Ver: [[SPRINTS_PLANO.md]].

Visão macro:

- [[Sprint 0 — Fundação]]
- [[Sprint 1 — Auth e Onboarding]]
- [[Sprint 2 — CRUD de anotações]]
- [[Sprint 3 — Status, tags, prazos]]
- [[Sprint 4 — Dashboards e equipe]]
- [[Sprint 5 — Visualizações e interação]]
- [[Sprint 6 — Colaboração e refinamento]]
- [[Sprint 7 — Qualidade e usabilidade]]

Arquivos reais criados para a Sprint 1:

- `src/app/router/AppRouter.tsx`
- `src/app/router/index.ts`
- `src/app/pages/AuthPage.tsx`
- `src/app/pages/AppShellPage.tsx`
- `src/app/pages/HomePage.tsx`
- `src/app/pages/DashboardOverviewPage.tsx`
- `src/app/pages/NotesPage.tsx`
- `src/app/pages/DashboardsPage.tsx`
- `src/app/pages/TeamPage.tsx`
- `src/app/pages/index.ts`
- `src/app/router/Sprint1AuthNotes.ts`
- `src/app/pages/Sprint1OnboardingNotes.ts`

### Sprint 0 em andamento

O projeto começou com a foundation do repositório e da aplicação:

- `package.json` com base React + Vite + TypeScript + Tailwind
- `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- `index.html` e `src/main.tsx`
- `src/styles/global.css` com tokens do [[DESIGN.md]]
- `src/app/App.tsx` com header e hero inicial
- `SPRINTS_PLANO.md`, `ESPIRITO_E_STRUTURA_SPAF.md` e `GIT_COMMITTER.md`
- preview configurado e subindo corretamente

Ver: [[Sprint 0 — Fundação]].

### Sprint 2 em andamento

Foco em CRUD de anotações e identidade visual da marca:

- módulo `features/notes` completo: tipos, store com CRUD, chip de status e view com busca/filtros
- [[Paleta Oficial Combogó Unicap]] aplicada nos tokens do tema (dark-first)
- componente `Logo` recriado com a mandala laranja + wordmark COMBOGÓ UNICAP (`src/shared/components/Logo.tsx`), em destaque na home, auth e app shell
- CTAs, tags e estados ativos usando o laranja Combogó `#E85D04`

Ver: [[Sprint 2 — CRUD de anotações]].

### Sprint 1 em andamento

Foco em auth e onboarding com estrutura mínima funcional:

- roteamento com proteção básica de rotas (`AuthShell`, `RequireAuth`, `PublicOnly`)
- tela de login/signup com estados de loading e erro
- app shell autenticado com sidebar e painéis placeholder
- home pública com call-to-action para acesso

Ver: [[Sprint 1 — Auth e Onboarding]].

## 8. Testes e qualidade

Ver: [[Testes e Qualidade]].

Planos:

- [[Plano de Testes — Unitário]]
- [[Plano de Testes — Integração]]
- [[Plano de Testes — E2E/Funcional]]
- [[Plano de Testes de Usabilidade]]

Critérios de foco:

- [[Caminhos críticos]]
- [[Permissões e acesso]]
- [[Estados de erro, loading e empty]]
- [[Drag-and-drop e reordenação]]

## 9. Risco e dívida técnica

Riscos iniciais a acompanhar:

- Complexidade de colaboração real e sincronização
- Difusão de responsabilidades entre módulos
- Acoplamento entre UI e regras de negócio
- Acessibilidade e usabilidade deixadas para depois

Deuda técnica observável:

- Módulos comMany responsabilidades
- Tipo/validação espalhada
- Estado local fingindo ser verdade única
- Componentes genéricos que crescem sem intenção

Monitorar com: [[Notas de Dívida Técnica]].

## 10. Decisões técnicas

Para cada decisão relevante, registrar:

- Contexto
- Alternativas
- Decisão
- Consequências esperadas
- Data e dono (quem decidiu)

Ver: [[Decisões Técnicas]].

Exemplos de decisões para documentar:

- Stack frontend/backend e justificativa
- Abordagem de auth e sessão
- Estratégia de estado e reatividade
- Modelo de permissões
- Organização de módulos e limites de importação
- Padrão de componentes e design tokens

Decisões desta sprint:

- auth simulado localmente com contexto React para a Sprint 1
- roteamento protegido pelo lado do cliente para demonstração
- app shell com sidebar para navegação futura
- telas placeholder para manter andamento sem atrasar módulos reais

### Sprint 2

- [[Paleta Oficial Combogó Unicap]] definida como sistema de cores oficial, dark-first, aplicada em tokens `@theme`:
  - Laranja Combogó `#E85D04` / `#F97316` — marca, CTAs, destaques e estados ativos (`brand`, `brand-glow`)
  - Azul Noturno Profundo `#0B132B` / `#0F172A` — fundo principal e superfícies escuras
  - Azul Ardósia `#1E293B` / `#233148` — cards, modais e formulários (`surface-container-*`)
  - Branco Suave `#F8FAFC` / `#FFFFFF` — tipografia de alta prioridade (WCAG AAA)
  - Cinza Secundário `#94A3B8` / `#64748B` — textos auxiliares, placeholders e bordas
  - Verde Esmeralda / Ciano `#10B981` / `#0284C7` — status ativo e sucesso (`tertiary`, `primary`)
- logo recriada como SVG (mandala geométrica laranja + wordmark COMBOGÓ UNICAP + tagline "Agência de Soluções Interativas") em `src/shared/components/Logo.tsx`, com o `MandalaMark` exportável
- notas persistidas em store em memória (contexto React) até haver backend
- CRUD de anotações dentro de `features/notes` para facilitar manutenção

## 11. Glossário e documentos do time

- [[Nota]]: unidade principal de informação/trabalho
- [[Dashboard]]: agrupamento organizacional de notas
- [[Status]]: estágio da nota (ex: não iniciada, em andamento, concluída, bloqueada)
- [[Tag]]: rótulo de categorização
- [[Prazo]]: data de início e/ou término
- [[Membro/Parceiro]]: pessoa associada a um dashboard ou nota
- [[Permissão]]: nível de acesso/edição dado a um membro

Documentos de contexto do projeto:

- [[ESPIRITO_E_STRUTURA_SPAF.md]]: visão, propósito e estrutura interna
- [[GIT_COMMITTER.md]]: guia de commit e organização do repositório
- [[SPRINTS_PLANO.md]]: divisão por sprints, entregáveis e critérios

## 12. Como usar este cérebro

- Quando criar uma nova página, conectá-la aqui com wikilinks
- Manter descrições curtas e com propósito claro
- Evitar duplicar o que já existe em outro documento; linkar
- Quando uma decisão afetar vários módulos, registrar em [[Decisões Técnicas]] e linkar de lá
- Quando uma história/sprint mudar algo estrutural, atualizar [[Arquitetura e Módulos]] e os links afetados
