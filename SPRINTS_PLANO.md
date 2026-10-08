# Organização do Projeto — Plataforma de Notas e Dashboards Colaborativos

Este documento reúne a divisão de trabalho por **sprints**, as **boas práticas de programação**, a estratégia de **organização modular**, e os critérios de **testes de qualidade e usabilidade** para o site/app de gestão de laboratório (plataforma de notas e dashboards colaborativos).

## Visão geral do produto

A plataforma deve permitir:

- **Gestão de anotações:** criação, leitura, atualização e exclusão de anotações; controle de status; tags; datas de início e fim; atribuição a parceiros/membros.
- **Gestão de projetos e dashboards:** criação e exclusão de dashboards; suporte a múltiplos dashboards; convite e remoção de membros com níveis de permissão.
- **Organização colaborativa:** múltiplas visualizações (Kanban por status, grade de cards, lista/tabela); drag-and-drop para mover e reordenar anotações; edição colaborativa de anotações e status; indicadores visuais de status, prazo e responsável.

## Princípios organizacionais

1. **Módulos com responsabilidade única**
   - Escolher um limite bem definido por módulo: por exemplo `auth`, `notes`, `dashboards`, `members`, `views/layouts`, `ui-kit`, `shared/helpers`.
   - Evitar “pastas genéricas” que acumulam código condicional; preferir módulos que combinam UI + lógica de forma coerente ou serviços dedicados quando a lógica é cross-cutting.

2. **Separação claro entre camadas**
   - UI / apresentação
   - Lógica de aplicação/estado (organizada por contexto, não por componente isolado quando o comportamento é compartilhado)
   - Backend/integração (no caso do Convex, separar queries/mutations/actions por domínio)
   - Validação e regras de negócio preferentialmente próximas ao domínio, não espalhadas em componentes.

3. **Naming consistente**
   - Nomes explícitos em inglês (ou conforme convenção definida) para arquivos, funções e tipos.
   - Evitar nomes como `utils`, `helpers`, `misc` sem contexto; quando usado, deixar óbvio o escopo.

4. **Dependências e estado**
   - Preferir injeção/dependency explícita ao invés de importar contextos globalmente sempre que possível.
   - Não sobre-usar estado global; manter estado próximo do consumidor, exceto quando há necessidade real de compartilhamento.

5. **Documentação próxima do código**
   - README por módulo quando o módulo for complexo.
   - Decisões técnicas devem ser registradas (ADR simples) se vierem a afetar múltiplos módulos.

## Estrutura sugerida do repositório (laboratório / projetos e dashboards)

Uma proposta prática para manter o projeto manutenível:

```
src/
  app/                 # rotas e estrutura de telas do app
  features/
    auth/
    notes/
    dashboards/
    members/
  shared/
    components/        # componentes reutilizáveis de UI
    hooks/
    lib/               # helpers, formatters, validadores
  styles/              # tokens, design system, CSS global
  types/               # tipos comuns da aplicação
  tests/               # teste unitário/integração/UI quando aplicável
convex/
  notes/
  dashboards/
  members/
  auth/
```

Regras práticas:

- Cada feature pode ter sua própria subestrutura interna (components, hooks, services, types).
- Módulos compartilhados só devem conter comportamento realmente reutilizável, não “o que ainda não decido onde colocar”.
- Evitar acoplamento circular entre features.

## Metodologia de sprints

Sugestão: sprints curtos, entregáveis tangíveis, com critérios de aceitação claros e validação não só técnica, mas também de usabilidade.

### Sprint 0 — Fundação e alinhamento

Objetivo: preparar base do projeto, definir convenções e calibrar o que “pronto” significa.

Entregáveis:

- Projeto inicial com estrutura de pasta e convenções de nomes
- Definição de Design System básico (cores, tipografia, spacing, componentes primitivos)
- Definição de critérios de aceitação para as principais histórias
- Pipeline de desenvolvimento local e verificações de qualidade

Critérios de prontidade:

- É possível criar um componente novo seguindo o padrão do projeto sem Discussão prolongada
- O time entende quais testes serão escritos e como

### Sprint 1 — Onboarding e autenticação

Objetivo: permitir que pessoas entrem no sistema e tenham uma experiência de início definida.

Entregáveis:

- Fluxo de login/cadastro/recovery conforme o modelo de auth escolhido
- Tela inicial após login que orienta o que fazer primeiro
- Estados de erro e carregamento tratados de forma consistente

Critérios de qualidade:

- Fluxos de erro acontecem de forma previsível
- Mensagens são claras e não expõem detalhes internos desnecessários
- Acessibilidade básica nas telas de auth (focus, contraste, navegação por teclado)

No projeto, a Sprint 1 foi iniciada com:

- roteamento protegido com `AuthShell`, `RequireAuth` e `PublicOnly`
- página pública `/` com hero e CTAs para acesso
- página `/auth` com alternância entre entrar e criar conta
- app shell `AppShellPage` com sidebar e painéis placeholder
- rotas protegidas `/app`, `/app/notes`, `/app/dashboards`, `/app/team`
- paginação placeholder para o que virá nas próximas sprints

### Sprint 2 — Gestão de anotações (CRUD)

Objetivo: usuários criam, leem, atualizam e excluem anotações.

Entregáveis:

- Criar anotação com campos definidos
- Editar anotação
- Excluir anotação
- Listagem básica e busca/filtro simples
- Validação de campos obrigatórios e estados inválidos

No projeto, a Sprint 2 foi implementada com:

- módulo `src/features/notes/` com tipos, store (contexto React) e view completa
- criação/edição via modal com validação de título
- exclusão direta no card
- busca por título, conteúdo e tags; filtro por status
- contadores por status e chips semânticos
- identidade visual com a cor da marca `#d66328` aplicada em CTAs, tags e logo em destaque

Critérios de prontidade:

- Não perde dados em casos comuns
- Erros de validação são comunicados ao usuário de forma legível
- O flow completo (criar → editar → excluir) funciona de ponta a ponta

### Sprint 3 — Status, tags e prazos

Objetivo: dar organização e rastreabilidade às anotações.

Entregáveis:

- Atribuição de status (ex: Não iniciada, Em andamento, Concluída, Bloqueada)
- Tags/etiquetas
- Data de início e data de término/prazo
- Indicadores visuais de prazo e status

Critérios de usabilidade:

- Mudança de status não é confusa nem requer muitos passos
- Tags ajudam a encontrar coisas rapidamente
- Prazos visíveis de forma consistente

### Sprint 4 — Dashboards e equipe

Objetivo: organizar anotações em dashboards e compartilhar com pessoas certas.

Entregáveis:

- Criar/editar/excluir dashboards
- Adicionar e remover anotações dos dashboards
- Convidar membros / gerenciar permissões básicas
- Visibilidade do que o usuário pode ver e editar

Critérios de qualidade:

- Permissões são verificadas tanto na UI quanto no backend
- Não há inconsistência entre o que se vê e o que se pode fazer
- Remoção/independência de member é tratada corretamente

### Sprint 5 — Visualizações e interação

Objetivo: oferecer múltiplas maneiras de visualizar e organizar o trabalho.

Entregáveis:

- Kanban por status
- Grade de cards
- Lista/tabela detalhada
- Drag-and-drop para reordenar/mover anotações entre visões/posições

No projeto, a Sprint 5 foi implementada com:

- `NotesBoardView` — Kanban com 4 colunas por status e drag-and-drop nativo (HTML5),
  sem dependências externas: mover entre colunas atualiza o status e reordena
- `NotesListView` — tabela compacta com mudança de status inline e destaque de atrasadas
- alternador de visualização (Grade / Kanban / Lista) no topo da página de anotações;
  busca, filtros e ordenação são preservados entre as views
- store de notas com `moveNote(id, status, beforeId)` e mapa de ordem manual por coluna
- feedback visual de drag: coluna destaca ao receber hover do card

Critérios de usabilidade:

- Transições entre views não perdem contexto do usuário
- Drag-and-drop funciona de forma previsível e tolerante a erros
- Foco visuais guia o olhar para o que mudou

### Sprint 6 — Colaboração em tempo real e refinamento

Objetivo: permitir trabalho compartilhado e melhorar a experiência geral.

Entregáveis:

- Atualização de status/attribution de forma colaborativa
- Feedback visual de mudanças recentes quando aplicável
- Polimento de microinterações, loading states, empty states

No projeto, a Sprint 6 foi implementada com:

- rastreabilidade de edições: campo `updatedBy` em cada nota ("Editada por Bruno Lima · há 5 min")
- feed de atividade (`ActivityFeed`) na página de Anotações e na Visão Geral:
  criou/editou/mudou o status/moveu/excluiu, com ator, título e tempo relativo
- pulso visual (animação CSS `pulse-once`) em notas alteradas nos últimos 12 segundos
- modais acessíveis: fecham com ESC e clique no backdrop, com `role="dialog"` e `aria-modal`
- timestamps relativos com atualização automática a cada 5 segundos

Observação: colaboração em tempo real de verdade (sincronização multiusuário via
backend) depende da persistência com Convex; o feed atual registra a atividade
da sessão local e a estrutura (`ActivityEntry`) já está pronta para o backend.

Critérios de qualidade:

- Usuários não ficam perdidos quando algo muda assincronamente
- Estado de loading/empty/erro cobre os casos mais comuns
- Aplicação se sente coerente, não “encontrada”

### Sprint 7 — Qualidade, testes e usabilidade final

Objetivo: endurecer a aplicação antes do lançamento/entrega mais ampla.

Entregáveis:

- Cobertura de testes nos caminhos críticos
- Testes de usabilidade com usuários reais ou quase-reais
- Ajustes baseados em feedback
- Checklist de lançamento

No projeto, a Sprint 7 foi implementada com:

- Vitest + Testing Library + jsdom configurados (`bun run test`, script `test:watch`)
- **48 testes automatizados** cobrindo os caminhos críticos:
  - `deadline.test.ts` (20): estados de prazo, descrições, validação de período, badges
  - `helpers.test.ts` (14): tempo relativo, janela de alteração recente, ordenação do Kanban
  - `notesStore.test.tsx` (8): CRUD, moveNote, activity log, updatedBy
  - `components.test.tsx` (6): chips de status, mudança inline, permissões por papel
- `LAUNCH_CHECKLIST.md`: checklist de lançamento com roteiro de teste de
  usabilidade (5 tarefas), acessibilidade verificada e decisão de lançamento

Critérios de prontidade:

- Caminhos principais testados manualmente e/ou automaticamente ✅
- Problemas de usabilidade críticos corrigidos (roteiro pronto para sessões)
- Decisões técnicas e comportamentais documentadas ✅

### Sprint 8 — Persistência real (Convex), validações no servidor e identidade visual

Objetivo: eliminar a dívida D1 (dados em memória), reforçar D2 (confiança no servidor) e recriar a identidade visual oficial (D4).

Entregáveis:

- Backend Convex (schema, notas, dashboards, membros, atividade, ordem do Kanban) com seed idempotente
- Migration transparente: o app roda em modo Convex quando VITE_CONVEX_URL existe; sem ela, continua no modo local (protótipo/testes) com a mesma API
- Validações no servidor: período de datas, status do domínio, e-mail de membro, duplicatas por (e-mail, dashboard), nome obrigatório, id duplicado de nota
- Ordem do Kanban persistida no servidor (tabela notes.order + query orders:getNotesOrder)
- Atividade compartilhada: o feed agora lê do banco (todos veem a mesma atividade)
- Logo UNICAP em vetor (pomba dourada à direita, wordmark à esquerda), sem PNG aproximado

No projeto, a Sprint 8 foi implementada com:

- `convex/` com `schema.ts`, `notes.ts`, `dashboards.ts`, `members.ts`, `orders.ts` e `seed.ts` (push com `bun convex dev --once` OK; 11 funções prontas)
- `src/shared/backend/` com detecção de modo (config.ts), provider condicional (AppBackendProvider.tsx) e ponte de hooks (hooks.ts) — hooks no-op seguros no modo local
- `NotesProvider` e `LabProvider` reescritos em modo duplo: Convex reativo (quando configurado) ou memória local (idêntico ao protótipo, usado nos 48 testes)
- Ids gerados no cliente e confirmados pelo servidor → continuidade otimista
- Patch de nota com semântica estável (null limpa campo; chaves ausentes preservam — sem "read-modify-write" que apaga edições concorrentes)
- Cascade atômico ao excluir dashboard: notas desvinculadas + membros removidos numa transação
- `Logo.tsx` renderiza a arte vetorial (`src/assets/unicap-logo.tsx`), PNG aproximado removido

Critérios de prontidade:

- Dados sobrevivem a recarregamentos e aparecem para todos os usuários do deployment ✅
- Servidor rejeita payloads inválidos mesmo se a view falhar ✅
- 48/48 testes continuam passando (modo local preservado) ✅

### Sprint 9 — Auth real (D3) com Convex Auth

Objetivo: substituir a sessão simulada da Sprint 1 por autenticação real (e-mail + senha) sem quebrar o protótipo local nem os testes.

Entregáveis:

- Convex Auth com provedor Password (tabelas authTables: users, authSessions, authAccounts, …) e `AUTH_SECRET` no deployment
- Sessão real: cookies/JWT gerenciados pelo Convex; cadastro preserva o nome informado (`profile`)
- Identidade no servidor: `users:me` retorna userId/name/email e o papel derivado da tabela `members` por e-mail (maior privilégio; sem convite → viewer)
- Autoria confiável: todas as mutations resolvem o `actor` pela sessão (`getActorName`) — o cliente não pode forjar autoria
- Shell de auth em modo duplo: `ConvexAuthShell` (sessão real) ou `LocalAuthShell` (simulada) atrás da mesma API `useAuth` + `useOptionalAuth`
- Mensagens de erro mapeadas para pt-BR (credenciais inválidas, conta existente, senha curta)

No projeto, a Sprint 9 foi implementada com:

- `convex/auth.ts` (convexAuth + Password), `convex/http.ts` (rotas .well-known), `convex/users.ts` (me), `convex/actor.ts` (autoria)
- `@convex-dev/auth` no cliente (`ConvexAuthProvider` + `useConvexAuth` + `useAuthActions`) montado em `AppBackendProvider`
- `AuthPage` com signIn/signUp reais, validações e estados de loading/erro
- `AppShellPage` exibe nome real e papel legível (Administrador/Editor/Visualizador); logout encerra a sessão no servidor
- `NotesProvider`/`LabProvider` usam `useOptionalAuth` para autoria/papel (fallback: protótipo)

Critérios de prontidade:

- Cadastro cria conta + sessão e entra no app; recarregar a página mantém a sessão ✅
- Credenciais inválidas mostram erro claro; notas registram o autor real ✅
- 48/48 testes seguem passando (modo local intacto) ✅

### Sprint 10 — Usabilidade: as 10 heurísticas de Nielsen aplicadas

Objetivo: auditar o app contra as heurísticas de Nielsen e fechar as lacunas concretas sem mudar o escopo funcional.

Aplicação por heurística:

1. **Visibilidade do status** — estado de carregamento nas anotações (spinner acessível quando os dados vêm do banco) e toasts confirmando cada ação (criada/excluída/dashboard/convidado).
2. **Correspondência com o mundo real** — já atendida pela linguagem do domínio (prazo, atrasada, responsável); confirmações descrevem consequências em pt-BR claro.
3. **Controle e liberdade do usuário** — confirmação antes de excluir nota/dashboard/membro + **Desfazer** (toast com ação que recria a nota excluída com os mesmos dados).
4. **Consistência e padrões** — ConfirmDialog e Toast reutilizáveis com o mesmo visual/zação dos modais existentes (ESC, backdrop, role=dialog).
5. **Prevenção de erros** — destrutivas exigem confirmação explícita; validações continuam na view E no servidor (Sprint 8).
6. **Reconhecimento em vez de memorização** — títulos/aria-labels nos selects de filtro e vinculação; badges de prazo já visíveis nos cards.
7. **Flexibilidade e eficiência** — Kanban com DnD, chip de status em 2 cliques e filtros rápidos já existentes; foco automático no primeiro campo dos modais.
8. **Estética e design minimalista** — diálogos com um texto curto e dois botões; nada de opções raras na interface principal.
9. **Ajudar a reconhecer erros** — erros de mutation deixam de ser `console.error` silencioso: toast `role=alert` em pt-BR, persistente até fechar.
10. **Ajuda e documentação** — textos de confirmação explicam consequências ("as anotações vinculadas são preservadas…"); SPRINTS_PLANO.md como documentação do projeto.

No projeto, a Sprint 10 foi implementada com:

- `src/shared/components/Toast.tsx` — provider + hook (`useToast`/`useOptionalToast`), região `aria-live`, auto-dismiss (erros persistem), ação opcional (Desfazer)
- `src/shared/components/ConfirmDialog.tsx` — confirmação acessível (ESC/backdrop/foco) para ações destrutivas
- Integração em NotesPageView (confirmação + undo + loading), DashboardsPageView e TeamPageView (confirmações)
- stores com toasts de sucesso/erro em todas as mutations (notes e dashboards)
- `src/tests/usability.test.tsx` — 4 testes novos (toast, desfazer, confirmar, ESC) → **52 testes**

Critérios de prontidade:

- Nenhuma ação destrutiva acontece sem confirmação ✅
- Todo erro de servidor chega visível ao usuário ✅
- 52/52 testes passando ✅

### Sprint 11 — Janelas do workspace (Equipe, Lixeira, Templates, Minhas Anotações)

Objetivo: incorporar as 4 janelas do novo mockup "Combogó Unicap — Gestão & Projetos" ao shell existente, mantendo sidebar, tokens de tema e permissões já estabelecidos.

Janelas entregues:

1. **Equipe & Parceiros** (`/app/team`, `src/features/dashboards/TeamPageView.tsx`) — cards das 4 equipes multidisciplinares (Design UI/UX, Desenvolvimento Web, Polo Games, Gestão Ágil) com nº de membros e líder (clique filtra a tabela por equipe) + tabela "Membros & Parceiros" com avatar de iniciais, nome, e-mail, equipe, papel (select editável para membros reais do LabProvider) e menu `...` por linha (copiar e-mail / remover com confirmação). Busca por nome/e-mail e botão **+ Convidar Membro** (modal existente, com toast no modo local).
2. **Lixeira** (`/app/trash`, `src/features/trash/`) — filtros Todos/Projetos/Documentos com contagem, busca, rótulo "Excluído há X dias" (até 30 dias) ou "em D de Mês", ações **Restaurar** e exclusão definitiva (ConfirmDialog), botão **Esvaziar Lixeira** e estado vazio. `TrashProvider` (estado em memória, API pronta para soft-delete no Convex).
3. **Templates** (`/app/templates`, `src/features/templates/`) — abas de categoria (Todos, Gestão & Scrum, Documentos & PRD, Design & UX, Jogos & VR), busca e grid de 6 modelos (Sprint Board Completo, PRD Técnico & Arquitetura, Guia de Tokens & Componentes, GDD, Pesquisa & Priorização RICE, Retrospectiva & Revisão). **Usar modelo →** cria uma anotação real com o corpo do modelo e navega para o quadro; **+ Criar Modelo** abre modal (título/descrição/categoria).
4. **Minhas Anotações** (`/app/documents`, `src/features/documents/`) — lista "Documentos Recentes" (ícone do tipo, título truncado, data) + painel de leitura com autor ("Editado ontem às 16:45"), botão **Compartilhar**, seções do PRD e checklist de tarefas com checkboxes funcionais (2 pré-marcadas riscadas). Busca e **+ Nova Anotação** criam documentos.

Integração no shell:

- Novas rotas protegidas `/app/documents`, `/app/templates`, `/app/trash` em `App.tsx` (dentro de `TrashProvider`)
- Sidebar do `AppShellPage`: "Quadro de Notas", "Minhas Anotações", "Equipe & Parceiros", "Templates", "Lixeira" + ícones novos (columns, layers, trash); rodapé "Sprint 11 — Janelas do workspace"
- Visual aderente ao mockup com os tokens existentes (`bg-surface-container-lowest`, `border-outline-variant`, `bg-brand`/`text-on-brand`) — sem novas cores

Critérios de prontidade:

- As 4 janelas acessíveis pela sidebar, protegidas por `RequireAuth` ✅
- Busca/filtros/ações funcionais com toasts e confirmações ✅
- `bun tsc -b --noEmit` limpo e 52/52 testes passando ✅

### Sprint 12 — Redesign do Quadro de Notas (mockup do board)

Objetivo: atualizar a página equivalente ao mockup "Sprint 42 – Core Features" (`/app/notes`), mantendo toda a funcionalidade existente (CRUD, DnD, filtros, undo, activity feed).

Mudanças entregues:

1. **Cabeçalho de board** (`NotesPageView.tsx`) — tile de ícone, overline "Quadro de notas", `h1 Anotações` (mantido, contrato dos testes de navegação), badge de estado derivado dos dados (**Em Execução** / Planejamento / Concluído), **Prazo:** menor vencimento entre notas não concluídas e painel de contadores **X ativas · Y concluídas · Z bloqueadas** + chip de atrasadas.
2. **Toolbar em card** — abas com ícones na ordem do mockup (**Quadro Kanban**, Grade de Cards, Lista / Tabela) com Kanban como visualização padrão, busca "Buscar cartões ou notas", seletor **Membros** e **Tags (N)** (filtros novos por responsável/tag), botão laranja **+ Nova Anotação**; status, ordenação e chips de prazo na segunda linha, com "limpar filtros".
3. **Colunas do Kanban** (`NotesBoardView.tsx`) — ordem visual do mockup (Não iniciada → Em andamento → Bloqueada → Concluída), ponto colorido por status, badge de contagem, botão **+** por coluna e rodapé tracejado **Adicionar nota** (abrem o formulário já com o status da coluna).
4. **Cartões enriquecidos** — código **#SPR-XXX** determinístico por id (cor por status), título, conteúdo (em caixa vermelha "Bloqueio:" quando bloqueada), tags com cores por hash, prazo "20 Out – 25 Out", avatar de iniciais do responsável, badge "Atrasado (dia Mês)" e ações Editar/Excluir no hover.
5. **Helpers** (`format.ts`) — `formatDayMonth`, `formatPeriodShort`, `noteCode`, `initialsOf`, `avatarClasses`, `tagClasses`, `hashString` (cores determinísticas, sem dados fake como progresso). Grade atualizada com o código #SPR também.

Critérios de prontidade:

- Página `Anotações` igual em estrutura ao mockup, sem perder nenhuma funcionalidade anterior ✅
- `bun tsc -b --noEmit` limpo e 71/71 testes passando ✅
- Preview reiniciado com "Preview is ready" ✅

## Boas práticas de programação

### 1. Código limpo e legível

- Funções pequenas e com responsabilidade clara
- Evitar lógica de negócio dentro de componentes visuais quando isso pode ser isolado
- Seletores/variáveis com significado; evitar “mágica” espalhada

### 2. Tipos e contratos

- Usar tipos para documentar forma de dados tanto na fronteira (inputs/outputs) quanto no domínio
- Validar entradas críticas antes de usá-las
- Quando um tipo muda, propagar a mudança de forma controlada, não ad-hoc

### 3. Componentização pensada

- Componentes devem ser reutilizáveis por comportamento, não apenas por aparência
- Quando um componente começa a aceitar muitos parâmetros condicionais, considerar decompor ou parametrizar por variantes claras
- Manter componentes “previsíveis”: mesmo input, mesmo output visual/ comportamento

### 4. Estado e dados

- Evitar estado derivado desnecessário
- Sincronizar estado com a origem de verdade; não fingir que o estado local é fonte confiável quando não é
- Dados carregados do backend devem ter estratégias claras para loading, erro e cache/reatividade

### 5. Erros e resiliência

- Tratar falhas de rede e validação como casos de uso, não como exceções esquecidas
- Nunca silenciar erros sem documentar o impacto
- Feedback claro e ação recuperável sempre que possível

### 6. Performance e responsividade

- Evitar re-renderizações desnecessárias em listas ePainéis ocupados
- Carregar dados sob demanda e de forma granulares quando possível
- Não pagar custo de UI pesado onde não há ganho perceptível

### 7. Segurança e permissões

- Não confiar apenas na interface para controle de acesso
- Validar permissões no backend/convex nos mutations/queries críticos
- Evitar expor dados que o usuário não tem direito de ver

### 8. Versionamento e evolução

- Mudanças de comportamento importante devem ser comunicadas ou versionadas conforme impacto
- Migrações e mudanças de schema devem ser planejadas antes de quebrar o existente
- Evitar acumular “temporarily works” que vira abrigo para dívidas técnicas

## Organização do código por módulos para manutenção

Dicas práticas:

- Definir um **contrato claro** entre módulos: o que um módulo expõe e o que ele não deve depender.
- Preferir **dependências unidirecionais**: módulos mais “baixos” não devem conhecer detalhes dos módulos mais “altos” do app.
- Separar **regras de negócio** de **renderização** quando o comportamento precisar ser testado, reusado ou alterado.
- Evitar “import tudo de tudo”; usar barreiras de importação ou convenções when modules start to blur.
- Documentar limites: se algo precisa ser compartilhado, explicar por quê.

Exemplo de separação útil:

- `notes` contém toda a lógica e UI específica de anotações
- `dashboards` contém a lógica de agregação/pertinência a dashboards
- `members` contém lógica de equipe e permissões
- `shared` contém apenas o que de fato se repete em vários domínios

## Testes de qualidade

Testes devem cobrir não só “o código executa”, mas “o sistema se comporta como esperado”.

### Tipos de teste recomendados

- **Unitário:** funções puras, validações, transformações, regras de negócio
- **Integração:** fluxos entre camadas (ex: input → regra → persistência/backend → retorno)
- **E2E/funcional:** fluxos críticos do usuário (ex: criar anotação, adicionar ao dashboard, mudar status)
- **De contrato/interface:** validar que componentes/atômicos e APIs críticas mantêm comportamento esperado

### O que testar primeiro

- Criação e edição de anotações
- Status, prazos, tags
- Dashboards, convite/remoção de membros, permissões
- Drag-and-drop e reordenação
- Estados de erro e recuperação

### Qualidade do teste

- Testar comportamento, não implementação interna desnecessária
- Evitar testes frágeis que quebram com qualquer refatoração estética
- Manter os testes legíveis; eles também são documentação
- Priorizar cobertura em áreas de maior risco, não cobertura por cobertura

### Checklist rápido de qualidade

- Os dados mais importantes são persistidos corretamente?
- Permissões são respeitadas em todos os níveis relevantes?
- Invalid input é rejeitado com clareza?
- O app comporta falhas parciais sem travamento total?
- Os estados de loading, empty e error são intencionais e consistentes?

## Testes de usabilidade

Usabilidade deve ser tratada como requisito, não como polimento final opcional.

### Aspectos a observar

- **Descobribilidade:** o usuário encontra como criar nota, dashboard, convidar pessoa?
- **Eficiência:** quantos passos para criar/relacionar/atribuir?
- ** Clareza:** o status, prazo e responsável estão legíveis rapidamente?
- **Controle:** o usuário entende o que pode mover, editar ou excluir?
- **Feedback:** mudanças são reconhecidas visual e/ou textualmente?
- **Erros:** quando algo dá errado, o usuário sabe o que aconteceu e o que fazer?

### Métodos práticos

- Tarefas estruturadas com usuários reais (ex: “crie uma anotação e coloque num dashboard”, “mova uma nota de status e atribua para outra pessoa”)
- Observar onde o uso é hesitante, onde o usuário volta atrás, onde хочет mudança
- Coletar feedback qualitativo sobre nomes, fluxos, densidade de informação e hierarquia visual
- Validar com usuários que não conhecem o sistema antes de acreditar que a interface é “óbvia”

### Sinais de problemas de usabilidade

- Usuários hesitam antes de clicar
- Eles usam a ferramenta “do jeito errado” porque a intenção não estava clara
- Explicam o que viram em termos dos internals do sistema (“não sei se foi salvo”, “não sei quem pode ver”)
- Eles reclamam de algo que é tecnicamente correto, mas confuso humanamente

## Definindo “concluído”

Uma história/sprint fica mais confiável quando inclui:

- Critérios de aceitação explícitos
- Pelo menos um caso de uso principal testado
- Feedback de usabilidade coletado quando for funcionalidade visível
- Decisões relevantes registradas brevemente

Isso reduz retrabalho e evita “terminamos, mas não sabemos se está bom”.

## Próximos passos sugeridos

- Confirmar escopo inicial para a primeira release
- Especificar as histórias do Sprint 1 com critérios de aceitação
- Ajustar estruturas de módulos conforme o domínio for sendo descoberto
- Estabelecer sessões breves de teste de usabilidade ao final de cada sprint que inclua UI nova
