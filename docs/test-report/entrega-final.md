# Entrega Final e Conclusão do projeto

**Projeto:** Lab Notes Dashboards — `combogo-unicap`
**Data do relatório:** 16/11/2026
**Versão:** pré-release (build `pre-release` + backend Firebase/Firestore)
**Escopo:** resumo do processo, mudanças realizadas durante o desenvolvimento e status atual com os testes de loading, stress e security.

---

## 1. Resumo do processo

O app começou com um backend Convex e passou por um ciclo de migração e reversão até chegar ao backend Firebase/Firestore do projeto `combogo-unicap`. A linha do tempo abaixo resume o percurso:

| Etapa | O que aconteceu | Resultado |
|---|---|---|
| 1 | Migração do backend de Convex para Firebase/Firestore | Camada de dados reescrita sobre o Firestore |
| 2 | Conexão com o Firebase real do app (`combogo-unicap`) | Configuração centralizada em `src/shared/firebase.ts` |
| 3 | Firebase Auth integrada de forma parcial | Sessão real de e-mail/senha no cliente |
| 4 | Firebase reincorporado como backend do app (Firestore no lugar do Convex) | Firestore passou a ser a fonte de dados |
| 5 | Descartar o Firebase quando o backend não estivesse acessível | Tentativa de fallback silencioso — revertida |
| 6 | **Reversão do descarte** | O sistema passou a rodar obrigatoriamente no Firebase |
| 7 | Sprints do quadro movidos para o backend | Colunas compartilhadas entre usuários |
| 8 | Regras do Firestore publicadas | Fim do bloqueio `permission-denied` |
| 9 | Correção da primeira entrada no site | Dados aparecem na primeira sessão, sem refresh |

A decisão central da entrega foi: **o sistema roda no backend fornecido pelo Firebase**, com Convex mantido apenas como modo opcional (`VITE_BACKEND_MODE=convex`) e um modo `local` reservado para protótipo e testes.

---

## 2. Mudanças feitas durante o desenvolvimento

### 2.1 Backend e camada de dados

| Arquivo | Mudança |
|---|---|
| `src/shared/backend/hooks.ts` | Camada de dados reescrita sobre o Firestore: `onSnapshot` para notas, atividade, ordem do Kanban, dashboards, membros e sprints; mutations com `setDoc`/`updateDoc`/`deleteDoc`; seed idempotente do workspace; normalização de campos limpáveis (`undefined` → `null`); mensagem acionável para `permission-denied`. |
| `src/shared/firebase.ts` | Inicialização lazy de App/Firestore/Auth/Analytics, com suporte a emuladores locais e `isFirebaseReady()`. |
| `src/shared/backend/config.ts` | `firebase` como backend padrão; override por `VITE_BACKEND_MODE`; constantes de domínio (`CURRENT_USER`, `nowIso`, `makeId`). |
| `src/shared/backend/AppBackendProvider.tsx` | Inicializa o Firestore no boot; `ConvexAuthProvider` só no modo convex; hooks sempre no topo (sem `useEffect` condicional). |
| `firestore.rules` | Conjunto de regras pronto para o projeto: leitura para autenticados, escrita de conteúdo para editor/admin, exclusão de dashboard e gestão de membros só para admin, atividade imutável, coleções desconhecidas negadas, papel opcional em `users/{uid}`. |

### 2.2 Autenticação

| Arquivo | Mudança |
|---|---|
| `src/app/router/AppRouter.tsx` | `FirebaseAuthShell` com login, cadastro, logout, restauração de sessão e tradução dos erros do Firebase Auth; `RequireAuth` preserva o caminho em `/auth?returnTo=...`. |

### 2.3 Estado do app

| Arquivo | Mudança |
|---|---|
| `src/features/notes/store.tsx` | Stores passaram a tratar `firebase` e `convex` como remotos (`isRemote`); sprints e vínculo nota → sprint vindos do backend no modo remoto. |
| `src/features/dashboards/store.tsx` | Mesmo ajuste para dashboards e membros. |
| `src/features/notes/types.ts` | `Note.sprintId` e documentação do modelo de sprints. |
| `src/app/App.tsx` | Seed só depois da autenticação, com launcher separado por backend. |

### 2.4 Correções encontradas durante a entrega

1. **Modo Firebase caía no estado em memória** — as flags `isConvex` dos stores ignoravam o modo `firebase`, fazendo o app operar com dados vazios. Corrigido com `isRemote`.
2. **Primeira entrada no site sem dados** — os `onSnapshot` subiam antes do login, eram recusados pelas regras e morriam; nada reassinava depois da autenticação, então os projetos só apareciam após refresh. Corrigido com `useFirebaseUid()`, que só abre os listeners quando há sessão e reassina na troca de usuário.
3. **Edições de data/vinculadas a projeto não persistiam** — `updateNote` gravava `startDate`, `dueDate` e `dashboardId` em camelCase, enquanto o documento usa `start_date`, `due_date` e `dashboard_id`. Corrigido com mapa de campos em `normalizeNotePatch`.
4. **Nota criada dentro de um sprint** — havia uma escrita em corrida (`updateDoc` antes do `setDoc`). O sprint passou a ser gravado junto com a nota (`sprint_id`).
5. **Seed sem sessão** — rodava antes do login e falhava; agora espera o usuário autenticado.
6. **`useEffect` condicional** no provider, que violava as regras de hooks. Removido.
7. **Stub morto `src/convex/firestore.ts`** removido.

### 2.5 Sprints do quadro no backend

- Colunas na coleção `sprints` (`{ id, title, created_at }`), lidas por `onSnapshot` ordenado por criação.
- Vínculo nota → sprint no campo `sprint_id` da nota, o que faz mover um card reagir para todos os usuários.
- Excluir um sprint apenas desvincula as notas (`sprint_id: null`); nenhuma nota é apagada.
- Interface inalterada: a API do store (`sprints`, `sprintOf`, `addSprint`, `renameSprint`, `removeSprint`) é a mesma de antes.

### 2.6 Testes

- `src/tests/backendHooks.test.ts` reescrito: 20 testes com SDK do Firestore mockado (queries, mutations, sprints, seed, sessão/login e modo local).
- Cobertura específica para o bug de primeira entrada: nenhum listener é aberto sem sessão e as coleções são reassinadas após o login e na troca de usuário.

---

## 3. Status atual do projeto

### 3.1 Funcional

O app roda no Firebase/Firestore com autenticação real, e as regras de segurança **já estão publicadas** no projeto `combogo-unicap` — o bloqueio `permission-denied` registrado em 12/11/2026 não existe mais.

Estado observado no banco em 16/11/2026 (leitura autenticada):

| Coleção | Documentos |
|---|---|
| `dashboards` (projetos) | 4 |
| `notes` (anotações) | 6 |
| `members` (equipe) | 3 |
| `activity` (histórico) | 4 |
| `sprints` (colunas do quadro) | 0 |

### 3.2 Verificação automatizada

| Check | Comando | Resultado |
|---|---|---|
| Typecheck | `npx tsc -b --noEmit` | sem erros (exit 0) |
| Testes | `npx vitest run --no-coverage` | **26 arquivos, 264 testes passando**, ~60 s |
| Preview | `freebuff-preview restart` | ready em 367 ms, sem erros de transform/resolve |
| Rotas | `/`, `/auth`, `/app` | HTTP 200 |

---

## 4. Testes de Security

| Item | Resultado em 16/11/2026 |
|---|---|
| Acesso anônimo ao Firestore | **403** — `GET dashboards` sem token é negado |
| Acesso autenticado (leitura) | **200** em `dashboards`, `notes`, `sprints`, `members`, `activity` |
| Acesso autenticado (escrita) | **200** no `PATCH` de um documento temporário de `sprints`, seguido de `DELETE` **200** |
| Autenticação | Firebase Auth e-mail/senha ativo; sessão real e ID token autorizando o Firestore |
| Configuração do cliente | `apiKey`/`projectId` embutidos no bundle — chaves de cliente são públicas por design e exigem regras corretas, que agora existem |
| Papel por usuário | **Limitação conhecida:** todo usuário autenticado entra como `admin` do workspace; as regras já aceitam um documento `users/{uid}` com `role` para restringir |
| Auditoria de dependências | `npm audit --omit=dev`: **4 vulnerabilidades de alta severidade**, todas na cadeia `firebase` → `@firebase/firestore` → `@grpc/grpc-js` |

Sobre o `npm audit`: o caminho de correção automática (`npm audit fix --force`) rebaixaria o Firebase para `9.14.0`, uma mudança incompatível com o código atual. A recomendação é planejar o upgrade do SDK com validação dos hooks antes de aplicar, e não rodar `--force` em produção.

---

## 5. Testes de Load

Medição feita contra o Firestore real do projeto, com usuário autenticado, medindo a latência da API que o `onSnapshot` usa por baixo (20 leituras sequenciais de `dashboards`, `pageSize=50`):

| Métrica | Valor |
|---|---|
| Requisições bem-sucedidas | 20/20 |
| Latência média | 183 ms |
| p50 | 136 ms |
| p95 | 770 ms |
| Máxima | 770 ms (primeira requisição, conexão fria) |

Interpretação: depois do aquecimento, as leituras ficam na casa de 136 ms — o p95 é dominado pela primeira chamada. Para o uso do app (assinaturas `onSnapshot` com cache local), esse patamar é adequado a um workspace de equipe pequena.

**Ressalvas:** a medição é de rede/API, não do navegador; a amostra é pequena (20 requisições); foi medida uma única coleção com poucos documentos. Não há instrumentação de Bundle, CPU, memória ou tempo de render.

---

## 6. Testes de Stress

| Cenário | Resultado |
|---|---|
| 25 leituras concorrentes de `notes` | **25/25 HTTP 200** em 1005 ms (~24,9 req/s) |
| Backend indisponível / sem sessão | App não assina coleções sem credenciais, evita `permission-denied` e mantém o estado "carregando" até o login |
| Estado vazio do Firestore | Listas vazias renderizadas sem erro; seed roda quando o workspace está vazio |
| Erros de query | Callback de erro registra mensagem acionável e zera o estado da coleção, sem quebrar o app |
| Sessão longa / reconexão | **Não testado** |

**Ressalvas:** o teste de concorrência foi de leitura, com 25 requisições simultâneas, feitas via API REST fora do app; não houve medição de escritas concorrentes, reconexão de `onSnapshot`, uso de memória em sessões longas, nem ferramentas dedicadas (k6, artillery, Playwright).

---

## 7. Pendências e limitações conhecidas

1. **Papel por usuário**: todo autenticado entra como `admin`. As regras já suportam `users/{uid}.role`; falta o app derivar o papel do banco.
2. **Autor da atividade** gravado como `Ana Costa` fixo (`CURRENT_USER`), em vez do nome do usuário autenticado.
3. **Vulnerabilidades do `npm audit`** na cadeia gRPC do Firebase, sem correção compatível disponível no momento.
4. **Load/stress sem ferramenta dedicada**: números medidos apenas em leitura, amostra pequena, sem cenários de escrita concorrente ou reconexão.
5. **Convex permanece no repositório** como modo opcional (`convex/`, `@convex-dev/auth`), sem uso no fluxo padrão.
6. **Conta de sondagem** `codebuff-smoke@example.com` existe no projeto para validação das regras e pode ser removida em Authentication → Users.

---

## 8. Conclusão

O projeto está **funcional de ponta a ponta no backend Firebase**: autenticação real, leitura e escrita liberadas por regras que exigem sessão, dados do workspace persistidos e sincronizados em tempo real entre usuários — inclusive os sprints do quadro e o vínculo das notas a eles.

Os três eixos avaliados:

- **Security**: sólido no essencial (anônimo negado, autenticado liberado, atividade imutável), com duas ressalvas que não bloqueiam a pré-release — papel único de `admin` e dependências vulneráveis via gRPC.
- **Load**: latência média de 183 ms e p50 de 136 ms em leitura real; adequado ao porte do produto, sem medição de render/bundle.
- **Stress**: 25 leituras concorrentes sem falha e degradação graciosa em estados de erro; sem teste de reconexão ou de escritas concorrentes.

**Decisão:** apto para pré-release e uso em equipe pequena. Antes de produção, tratar os itens 1 a 4 da seção 7.

---

_Nota: relatório baseado em medições feitas no ambiente de desenvolvimento em 16/11/2026. Não substitui teste de carga dedicado nem avaliação de segurança externa._
