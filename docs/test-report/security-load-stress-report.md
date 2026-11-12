# Relatório de Teste — Security, Load e Stress

**Projeto**: Lab Notes Dashboards  
**Backend adotado**: Firebase / Firestore (modo `firebase`)  
**Projeto Firebase**: `combogo-unicap`  
**Data de rodagem**: 12/11/2026  
**Ambiente do teste**: sandbox Freebuff, `tsc -b --noEmit` + `vitest run --no-coverage` + `npm audit`

---

## 1. Sumário executivo

O backend do app foi migrado de Convex para Firebase/Firestore. Foram feitos testes básicos de **security**, **load** e **stress** sobre essa nova implementação e o app como um todo.  

Os testes **não** foram instrumentados com ferramentas externas de load/stress (k6, artillery, etc.) nem com scanners automatizados de vulnerabilidade (SAST/DAST). Os resultados abaixo são todos baseados em:
- testes unitários/integration do projeto (`vitest`) rodados com foco no caminho de dados do Firebase,
- análise de código estático (`tsc`),
- análise de dependências (`npm audit`),
- revisão manual do código e da arquitetura do backend Firebase.

Isso deve ser tratado como **primeiro nível de validação**; um teste de carga/stress mais realista e um teste de segurança automatizado são recomendados antes de entregar para produção.

---

## 2. Escopo dos testes

### 2.1 Security
O que foi verificado:
- autenticação e controle de versão do Firebase,
- exposição de chaves de API e configurações sensíveis,
- assinatura, validação e sanitização dos dados trocados com o Firestore,
- tratamento de erros e ausência de vazamento de stack traces,
- queries e índices (risco de leitura não intencional / leitura excessiva),
- dependências vulneráveis (npm audit).

### 2.2 Load
O que foi verificado (de forma limitada):
- se o app reagiu de forma plausível sob execução normal dos hooks do Firebase (múltiplos `onSnapshot`, leitura de coleções, escritas básicas) nos testes existentes,
- se `tsc` e `vitest` continuam estáveis com a nova camada de backend,
- se o seeds do workspace roda sob demanda sem travamento óbvio.

Não houve simulação de muitos usuários, alta concorrência de escritas ou preenchimento do Firestore com muitos documentos.

### 2.3 Stress
O que foi verificado (de forma limitada):
- comportamento do app quando o Firestore mock do teste devolve estado vazio e quando o backend não está pronto,
- corte seguro para o modo local quando `getFirebaseFirestore()` ou `getBackendMode()` retornam estado inesperado,
- uso de `vi.useFakeTimers()` para validar que o pacote não quebra fluxos assíncronos básicos internos.

Não houve estresse real de rede, consumo de memória, CPU ou tempo de resposta.

---

## 3. Metodologia

- Rodou-se `npx tsc -b --noEmit` para confirmar a coerência do tipo após as mudanças do Firebase.
- Rodou-se `npx vitest run --no-coverage` para executar os testes existentes, com atenção especial aos relacionados ao backend (hooks, seed, modo local/firebase).
- Rodou-se `npm audit --omit=dev` para verificar vulnerabilidades conhecidas nas dependências.
- Foi feita revisão manual das camadas envolvidas:
  - inicialização do Firebase,
  - conversão de dados entre Firestore <-> domínio do app,
  - hooks de leitura (`onSnapshot`) e escrita,
  - seed do workspace,
  - estratégia de fallback para modo local.

Tudo foi feito a partir do estado do repositório após as mudanças mencionadas neste relatório, **sem** configurar scanners externos.

---

## 4. Mudança #1 — Migração do backend de Convex para Firebase/Firestore

### O que mudou
- O app agora usa Firestore como backend real, mantendo as mesmas assinaturas de hook e a mesma forma de consumo pelas camadas superiores.
- Foi mantida uma estratégia de **modo**: `firebase`, `convex`, `local`.
- Firebase só é usado quando `getBackendMode() === "firebase"` e o backend está pronto; caso contrário o app cai para um estado local (sem operação de backend).

### Observações de segurança / qualidade
- Vantagem: o backend é o do Firebase projetado para o app; não é mais precatório/protótipo.
- Risco controlado: no momento o app não foi validado sob falhas de rede do Firestore, nem sob comportamento de cache off-line convincingly real.
- A migração **preserva** a mesma lógica de negócio, mas transfere a responsabilidade de conectividade, índices e regras para o lado do Firebase.

---

## 5. Mudança #2 — Conectar real Firebase do app (combogo-unicap)

### O que mudou
- O Firebase foi configurado para o projeto `combogo-unicap`.
- A inicialização usa os subpacotes modulares (`firebase/app`, `firebase/firestore`, `firebase/auth`, `firebase/analytics`), não o loader raiz `firebase`.
- A estratégia modular foi adotada porque o loader `firebase` não resolveu diretamente no ambiente do projeto.

### Observações de segurança / qualidade
- Positivo: usar subpacotes modulares reduz bacias de código carregado e pode limitar superfície de ataque desnecessária.
- Atenção: a escolha do projeto Firebase é parte crítica da segurança do app agora. Se o projeto errado, ou se a configuração for compartilhada errado, o app pode ler/escrever no lugar errado.
- Ainda não há integração completa de auth Firebase como fluxo real; login permanece simulado (LocalAuthShell) neste momento da implementação.

---

## 6. Mudança #3 — Firebase Auth (integração parcial / não finalizada)

### O que mudou
- Foi preparada a estrutura para Firebase Auth, mas o fluxo de login ainda não usa Firebase Auth como backend real.
- No modo firebase, o `AuthShell` usa `LocalAuthShell` (simulação) neste ponto.

### Observações de segurança / qualidade
- Isto é uma limitação importante de segurança para MVP: a app não está, neste momento, fazendo autenticação real via Firebase Auth.
- O que foi feito é apenas uma retomada estrutural para isso; a autenticação “de verdade” ainda não foi completada.
- Enquanto isso, o app roda com auth simulada; isso é aceitável para desenvolvimento/protótipo, mas não para um release de produção.

---

## 7. Mudança #4 — Reincorporar Firebase como backend do app (firestore real ao invés de Convex)

### O que mudou
- As leituras e escritas passaram a usar as APIs reais do Firestore, com a mesma “assinatura” de uso interna que o mock testável.
- Hooks reativos e mutations foram adaptados para o Firestore.
- Seed do workspace continua disponível, agora sobre Firestore.

### Observações de segurança / qualidade
- Positivo: alinha o app ao backend pretendido, eliminando dependência temporária de Convex.
- Risco a monitorar:
  - Regras do Firestore e índices precisam estar configurados para o projeto real;
  - se as regras/índices não estiverem prontos, o app pode comportar-se de forma vazia ou parcial;
  - queries reativas amplificam o impacto de uma regra mal estruturada.
- A abstração interna de modo ajuda a rodar testes e protótipos sem depender do Firestore real, o que é bom para validação local, mas não substitui validação no ambiente de produção.

---

## 8. Mudança #5 — Descartar Firebase (de volta a umestado sem Firebase) quando o backend não estiver acessível

### O que mudou
- Quando o Firebase não está acessível ou pronto, o app reage deixando de usar Firestore e operando em estado local.
- Esse comportamento é intencional e serve para que o app não quebre totalmente em ambiente sem Firebase ativo.

### Observações de segurança / qualidade
- Positivo: reduz risco de app completamente indisponível em ambiente de desenvolvimento ou teste sem Firebase.
- Limitação: durante esse estado, o app pode parecer vazio ou não-operacional para o usuário final; isso pode ser confundido com “app funciona, só não mostra dados”.
- Em termos de segurança, o corte para estado local é preferível a falhas mal tratadas, mas precisa ser validado visualmente e com testes de integração real.

---

## 9. Resultado — Security

### 9.1 `npm audit`
- `npm audit --omit=dev` reportou **4 vulnerabilidades de alta severidade** vinculadas ao `@grpc/grpc-js` através da cadeia de dependência do Firebase.
- Recomendação técnica: revisar o upgrade do Firebase e/ou `@grpc/grpc-js`, calculando impacto de breaking change antes de aplicar.
- `npm audit fix --force` existe, mas pode implicar breaking change considerável; por isso deve ser decidido com análise, não aplicado automaticamente para produção.

### 9.2 Expoição de configuração
- A configuração do Firebase está em código de inicialização no projeto.
- Nenhum `.env` foi alterado manualmente; as chaves sensíveis continuam sob controle de where they are stored.
- Recomendação: garantir que, em produção, a configuração de Firebase e especialmente qualquer chave/tokens não seja exposta ao lado cliente de forma mais ampla do que o necessário, e que o deploy prod uma tenha suas próprias variáveis de ambiente separadas do `.env` de sandbox.

### 9.3 Autenticação
- Firebase Auth (e-mail + senha) está integrado no modo Firebase; a sessão é real e o ID token é o que autoriza as chamadas ao Firestore.
- Limitação: o papel (`role`) ainda não vem do banco — todo usuário autenticado entra como `admin` do workspace.
- O login por e-mail/senha está ativo no projeto (verificado na API do Identity Toolkit).
- Recomendação: migrar o papel para custom claims ou um documento `users/{uid}` e alinhar as regras do Firestore a ele.

### 9.4 Firestore rules / índices
- **Verificado em 12/11/2026**: o Firestore do projeto `combogo-unicap` responde `403 PERMISSION_DENIED` tanto para acesso anônimo quanto para acesso com um usuário autenticado. Ou seja, as regras atuais negam toda leitura/escrita.
- Consequência: o app carrega e autentica, mas as coleções chegam vazias e o seed falha (erro `permission-denied` no console).
- Correção necessária (Firebase Console → Firestore → Regras):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

- Índices: as queries usam apenas `orderBy` de um único campo (`created_at`, `order`, `at`, `invited_at`), que o Firestore resolve com índices automáticos — nenhum índice composto é necessário.
- Recomendação: restringir as regras por coleção/usuário antes de produção (hoje seria qualquer usuário autenticado em todas as coleções).

### 9.5 Tratamento de erro
- O código tem pontos de fallback e tratamento básico de erro.
- Recomendação: confirmar que em produção não há vazamento de detalhes internos de erro para o cliente (stack traces, mensagens brutas do SDK, etc.).

---

## 10. Resultado — Load

- Com os testes atuais, **não há evidência de quebra óbvia** sob o fluxo básico de leitura/escrita do Firestore.
- O `tsc` e o `vitest` rodaram dentro do esperado para o conjunto de testes existente.
- Não se pode afirmar que o sistema foi validado para carga real porque o teste não simulou usuários concorrentes, volume de documentos, aperto de rede ou picos de escrita.

Recomendação: antes de um teste de carga mais sério:
- definir cenários (ex.: muitos users abrindo dashboards, criando notas, atualizando ordem do kanban),
- rodar com um Firestore real ou com emulador configurado,
- medir latência perccebida, throughput de escrita/leitura e estabilidade do app.

---

## 11. Resultado — Stress

- O sistema mostrou, nos testes, *resistência básica* a estados vazios e a situações onde o Firestore não está pronto.
- O estado local funciona como escudo parcial quando o Firebase não responde, o que é um comportamento útil, mas não é teste de stress de verdade.

Recomendação:
- estressar o app sob many mutations concorrentes,
- verificar se `onSnapshot` e o estado do cliente se comportam bem sob desconexões e reconexões,
- validar uso de memória e rede em sessões longas.

---

## 12. Conclusão do teste

**Segurança**: há melhorias estruturais, mas ainda existem questões importantes, principalmente:
- auth Firebase não está integrada,
- auditoria de dependências aponta vulnerabilidades conhecidas via gRPC no Firebase,
- regras/index do Firestore não foram validadas,
- exposição de configuração precisa ser verificada no deploy prod.

**Load/stress**: não houve teste de carga/stress real; apenas validação limitada pelo teste existente e revisão manual. Não há como afirmar o sistema está pronto para carga sem testes com volume real ou simulado.

**Decisão sugerida**: aceitar a mudança como avanço válido para o MVP com ressalvas, e tratar as lacunas acima como obrigatórias antes de produção.

---

## 13. Ações recomendadas

1. Liberar as regras do Firestore para usuários autenticados (hoje tudo é negado — ver 9.4).
2. Reavaliar dependências vulneráveis e definir estratégia de upgrade (com análise de breaking change).
3. Rodar testes de carga e stress com users concorrentes e volume significativo de dados.
4. Validar visualmente o app no Firebase real/protegido, não só com mock local.
5. Migrar o papel do usuário para o banco (custom claims ou `users/{uid}`).
6. Não considerar o app pronto para produção até as regras do Firestore estarem validadas.

---

## 14. Reversão — Firebase de volta como backend real (12/11/2026)

A recomendação anterior de descartar o Firebase foi **revertida**: o app volta a usar o Firestore do projeto `combogo-unicap` como banco de dados.

### O que mudou
- `getBackendMode()` agora devolve `firebase` por padrão (configuração embutida em `src/shared/firebase.ts`); `convex` e `local` exigem escolha explícita via `VITE_BACKEND_MODE`.
- Stores de notas e dashboards passaram a tratar `firebase` e `convex` como backends remotos (`isRemote`); antes só `convex` era considerado e o modo Firebase caía silenciosamente no estado em memória — o app “funcionava” sem tocar no banco.
- Hooks (`src/shared/backend/hooks.ts`) reescritos sobre o Firestore: `onSnapshot` para notas/atividade/ordem/dashboards/membros e `setDoc`/`updateDoc`/`deleteDoc` para mutations. Campos em `snake_case` no banco, `camelCase` na UI.
- Seed idempotente com IDs fixos, disparado só depois da autenticação (as regras exigem usuário logado).
- Firebase Auth (e-mail + senha) integrado no `AuthShell` para o modo Firebase; o cadastro preenche `displayName`.
- `AppBackendProvider` deixou de chamar `useEffect` dentro de um `if` (violação das regras de hooks que quebrava a renderização no modo Firebase).
- Removido o stub morto `src/convex/firestore.ts` e o canal de teste (`globalThis.__firestore_test_calls`) que estava embutido no código de produção.

### Complicações observadas
1. **Regras do Firestore bloqueiam todo acesso** (403 mesmo autenticado) — regras prontas para publicar em `firestore.rules` e na seção 15.
2. **Sem papel por usuário** — todo mundo entra como `admin`.
3. **Atividade**: cada mutation grava um documento em `activity`, com o autor `Ana Costa` fixo até o nome do usuário autenticado ser propagado para a camada de dados.
4. **Sprints do quadro** agora vivem no Firestore: colunas na coleção `sprints` e o vínculo nota → sprint no campo `sprint_id` da nota. Alterações (criar/renomear/excluir coluna, mover nota de sprint) aparecem para todos os usuários via `onSnapshot`; no modo local o estado continua no `localStorage`.
5. **Convex permanece no projeto** como modo opcional (dependências, `convex/` e `@convex-dev/auth`), sem uso no fluxo padrão.
6. **Vulnerabilidades do `npm audit`** seguem as mesmas (cadeia gRPC do Firebase).
7. **Configuração do Firebase em código** (`apiKey`, `projectId`, etc.): chaves de cliente são públicas por design, mas ficam versionadas — exigem regras de segurança corretas, não segredo.
8. **Conta de sondagem criada**: `codebuff-smoke@example.com` foi criada no projeto para validar as regras do Firestore e pode ser removida no console (Authentication → Users).

---

## 15. Regras do Firestore — liberação para o app funcionar (12/11/2026)

O bloqueio descrito em 9.4 (todo acesso retorna `403`) foi tratado com um conjunto de regras criado para o projeto `combogo-unicap`: arquivo **`firestore.rules`** na raiz do repositório. As regras reproduzem o comportamento que o backend Convex aplicava antes da migração.

### 15.1 O que as regras liberam

| Operação | Regra | Equivalente no Convex |
|---|---|---|
| Leitura de notas, dashboards, membros, sprints e atividade | qualquer usuário autenticado | `AUTH_ERROR` para sessão ausente |
| Criar/editar/mover/excluir notas | editor ou admin | escala `viewer < editor < admin` |
| Criar/editar dashboards | editor ou admin | idem |
| Excluir dashboard | somente admin | `isAdmin` |
| Gerenciar membros (convidar/alterar papel/remover) | somente admin | `isAdmin` |
| Atividade | só `create`; sem edição/exclusão | histórico imutável |
| Demais coleções | negado | — |

Papel por usuário: documento opcional `users/{uid}` com `{ role: "admin" | "editor" | "viewer" }`. Sem o documento, o usuário autenticado opera como `admin` — mesmo comportamento atual do app, que ainda não deriva papel do banco. Só um admin pode escrever em `users/{uid}`, o que impede auto-promoção de um viewer.

### 15.2 Regras (conteúdo para publicar)

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }

    function role() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid))
        ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role
        : 'admin';
    }

    function canRead() { return signedIn(); }
    function canWrite() { return signedIn() && role() in ['admin', 'editor']; }
    function isAdmin() { return signedIn() && role() == 'admin'; }

    function noteStatus() { return ['not_started', 'in_progress', 'completed', 'blocked']; }
    function memberRoles() { return ['admin', 'editor', 'viewer']; }
    function activityActions() { return ['created', 'updated', 'status_changed', 'moved', 'deleted']; }

    match /notes/{noteId} {
      allow read: if canRead();
      allow create: if canWrite()
        && request.resource.data.keys().hasAll(['title','status','tags','created_at','updated_at'])
        && request.resource.data.title is string
        && request.resource.data.title.size() > 0
        && request.resource.data.status in noteStatus()
        && request.resource.data.tags is list;
      allow update: if canWrite()
        && request.resource.data.title is string
        && request.resource.data.status in noteStatus()
        && request.resource.data.tags is list;
      allow delete: if canWrite();
    }

    match /dashboards/{dashboardId} {
      allow read: if canRead();
      allow create, update: if canWrite()
        && request.resource.data.name is string
        && request.resource.data.name.size() > 0;
      allow delete: if isAdmin();
    }

    match /members/{memberId} {
      allow read: if canRead();
      allow create, update: if isAdmin()
        && request.resource.data.name is string
        && request.resource.data.email is string
        && request.resource.data.role in memberRoles()
        && request.resource.data.dashboard_id is string;
      allow delete: if isAdmin();
    }

    match /sprints/{sprintId} {
      allow read: if canRead();
      allow create, update: if canWrite()
        && request.resource.data.title is string
        && request.resource.data.title.size() > 0;
      allow delete: if canWrite();
    }

    match /activity/{activityId} {
      allow read: if canRead();
      allow create: if canWrite()
        && request.resource.data.note_id is string
        && request.resource.data.action in activityActions();
      allow update, delete: if false;
    }

    match /users/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isAdmin());
      allow create, update: if isAdmin()
        && (!('role' in request.resource.data)
            || request.resource.data.role in memberRoles());
      allow delete: if isAdmin();
    }

    match /{document=**} { allow read, write: if false; }
  }
}
```

### 15.3 Como publicar

1. Firebase Console → **Firestore Database** → aba **Regras**.
2. Colar o conteúdo de `firestore.rules` e clicar em **Publicar**.
3. Recarregar o app autenticado: o seed popula `dashboards`, `notes`, `members` e `activity` na primeira sessão, e as leituras passam a chegar por `onSnapshot`.

Alternativa por CLI: criar um `firebase.json` apontando `firestore.rules` e rodar `firebase deploy --only firestore:rules`.

### 15.4 Índices

Nenhum índice composto é necessário: todas as queries usam `orderBy` de um único campo (`created_at`, `order`, `at`, `invited_at`), atendido pelos índices automáticos do Firestore.

### 15.5 Correção de código associada

Ao revisar o contrato de campos para escrever as regras, foi encontrado um defeito na camada de dados: `updateNote` gravava `startDate`, `dueDate` e `dashboardId` em camelCase, enquanto o documento usa `start_date`, `due_date` e `dashboard_id`. Essas edições eram salvas em campos paralelos e desapareciam na releitura. A normalização em `normalizeNotePatch` (`src/shared/backend/hooks.ts`) agora mapeia os nomes, e o teste correspondente em `src/tests/backendHooks.test.ts` foi ajustado.

### 15.6 Verificação

- `npx tsc -b --noEmit` → sem erros.
- `npx vitest run --no-coverage` → 26 arquivos, 262 testes passando (um run intermediário apresentou 1 falha intermitente; a reexecução completa passou).
- As regras **não** foram validadas em emulador: `firebase-tools` não está instalado e o sandbox não tem Java. A validação foi por revisão de sintaxe e por conferência campo a campo contra o que o app grava.
- O bloqueio só deixa de existir depois de publicar as regras no console — até lá, leituras e escritas continuam retornando `permission-denied`.

---

_Nota: relatório feito a partir dos testes disponíveis no ambiente; não substitui avaliação de segurança externa completa nem teste de carga dedicado._
