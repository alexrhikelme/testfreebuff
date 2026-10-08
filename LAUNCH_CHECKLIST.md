# ✅ Checklist de Lançamento — Plataforma de Notas e Dashboards

> Sprint 7 — Verificação final antes de entrega/lançamento.
> Marcar cada item após verificação. Referência: [[SPRINTS_PLANO.md]], [[CEREBRO_PROJETO.md]].

---

## 1. Funcionalidades críticas verificadas

### Autenticação e acesso (Sprint 1)
- [ ] Login com e-mail/senha funciona
- [ ] Cadastro cria sessão e redireciona para `/app`
- [ ] Rotas protegidas redirecionam para `/auth` quando deslogado
- [ ] Logout retorna à home pública
- [ ] Estados de loading e erro visíveis no formulário

### Anotações (Sprints 2, 3 e 5)
- [ ] Criar nota com título obrigatório validado
- [ ] Editar nota por todos os campos (conteúdo, status, tags, datas, responsável, dashboard)
- [ ] Excluir nota
- [ ] Validação: início não pode ser depois do prazo
- [ ] Mudança de status inline no card (2 cliques)
- [ ] Busca por título, conteúdo e tags
- [ ] Filtros: status, prazo (atrasadas/hoje/3 dias)
- [ ] Ordenação: recentes / prazo mais próximo
- [ ] Kanban: arrastar entre colunas muda o status
- [ ] Kanban: soltar sobre card insere antes dele
- [ ] Lista: tabela com todas as ações
- [ ] Filtros preservados ao trocar de view

### Dashboards e Equipe (Sprint 4)
- [ ] Criar, renomear e excluir dashboard
- [ ] Vincular/remover notas nos dashboards (2 caminhos)
- [ ] Convidar membro com e-mail validado
- [ ] Trocar papel (admin/editor/viewer)
- [ ] Remover membro
- [ ] Viewer não vê botões de edição/convidar
- [ ] Visão geral mostra contadores reais

### Colaboração (Sprint 6)
- [ ] "Editada por X · há Y min" no rodapé do card
- [ ] Feed de atividade registra criou/editou/status/moveu/excluiu
- [ ] Pulso laranja em notas alteradas há menos de 12s

## 2. Qualidade automatizada

- [x] **48 testes passando** (`bun run test`)
  - `deadline.test.ts` — 20 testes: estados de prazo, descrições, validação de período, badges
  - `helpers.test.ts` — 14 testes: tempo relativo, janela de recente, ordem do Kanban
  - `notesStore.test.tsx` — 8 testes: CRUD, moveNote, activity log
  - `components.test.tsx` — 6 testes: chips, status inline, permissões
- [x] TypeScript sem erros (`bun tsc -b --noEmit`)
- [ ] E2E dos fluxos críticos (planejado — requer Playwright/Cypress)

## 3. Usabilidade (testes com usuários)

### Sprint 10 — Heurísticas de Nielsen aplicadas
- [x] H1/H9: toasts de sucesso/erro (aria-live, role=alert para erros)
- [x] H3/H5: confirmação de exclusão (nota/dashboard/membro) + Desfazer
- [x] H1: estado de carregamento das anotações (modo Convex)
- [x] H6/H7: aria-labels/títulos em filtros, foco automático nos modais
- [ ] Testes de usabilidade com usuários reais (roteiro abaixo)

Roteiro sugerido (15 min por usuário):
1. "Crie uma anotação com prazo para amanhã" — observar descoberta do botão e do campo
2. "Mude o status dela para concluída" — espera-se uso do chip inline
3. "Encontre a nota que está atrasada" — espera-se uso do filtro de prazos
4. "Organize as notas do Experimento A num dashboard" — observa compreensão do conceito
5. "Convide um colega como editor" — observa fluxo de permissões

Sinais de alerta: hesitação longa, uso "errado" por intenção pouco clara, perguntas "salvou?".

- [ ] 3+ usuários testaram o roteiro
- [ ] Problemas críticos de usabilidade corrigidos

## 4. Acessibilidade

- [x] Modais com `role="dialog"`, `aria-modal`, fecham com ESC e clique fora
- [x] Selects de status com `aria-label` e `title`
- [x] Alternador de views com `role="tablist"` e `aria-selected`
- [x] Contraste da paleta (branco suave sobre azul noturno — WCAG AAA nos títulos)
- [ ] Auditoria completa de navegação por teclado (planejado)

## 5. Performance e robustez

- [x] Sem dependências pesadas (drag-and-drop nativo, zero libs novas de runtime)
- [x] Persistência real — Sprint 8 (Convex; modo local de protótipo preservado para testes)
- [x] Validações no backend — Sprint 8 (período, status, e-mail, duplicatas; *autorização por papel ainda na UI — parte de D2 pendente do auth real*)
- [x] Auth real — Sprint 9 (Convex Auth, e-mail + senha; papel derivado dos membros por e-mail)

## 6. Documentação

- [x] `SPRINTS_PLANO.md` — plano e notas de implementação por sprint
- [x] `CEREBRO_PROJETO.md` — hub com wikilinks
- [x] `DESIGN.md` e `PALETA_COMBOGO.md` — identidade visual
- [x] `LAUNCH_CHECKLIST.md` — este documento
- [ ] README de execução para novos devs (install/run/test)

## 7. Decisão de lançamento

| Critério | Situação |
|---|---|
| Caminhos críticos testados | ✅ automatizado (48 testes) |
| Funcionalidades das Sprints 0–6 | ✅ implementadas |
| Persistência real | ✅ Convex (Sprint 8) — dados compartilhados no deployment |
| Auth real | ✅ Convex Auth (Sprint 9) — recuperação de senha como refinamento futuro |
| Testes de usabilidade | 🔲 pendente com usuários reais |

**Recomendação:** a aplicação está pronta para **demonstração e validação com
stakeholders**. Para **lançamento com usuários reais**, concluir primeiro as
dívidas D1 (persistência) e D2 (permissões no backend).
