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

Critérios de prontidade:

- Caminhos principais testados manualmente e/ou automaticamente
- Problemas de usabilidade críticos corrigidos
- Decisões técnicas e comportamentais documentadas

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
