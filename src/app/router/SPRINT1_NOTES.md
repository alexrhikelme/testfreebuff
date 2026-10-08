# Sprint 1 — Auth e onboarding

## O que foi feito

- roteamento com proteção básica
- tela de login e criação de conta
- app shell autenticado
- home pública com CTA

## Arquitetura usada

- `AuthShell` envolve o app e guarda estado de usuário e retorno
- `RequireAuth` protege rotas autenticadas
- `PublicOnly` protege rotas públicas quando o usuário já está logado
- `useAuth` dá acesso ao contexto de auth

## Estado atual

Auth é simulado localmente. Não há sessão real nem backend.

## Critérios de prontidade

- [ ] login simula acesso e redireciona para destino pretendido
- [ ] rotas protegidas redirecionam para auth
- [ ] loading e erro aparecem nas páginas de auth
- [ ] navegação do app shell funciona
- [ ] home pública convida para acesso

## Próximos passos

- persistir sessão de forma simples
- conectar auth a backend real quando disponível
- ajustar onboarding pós-login
- preparar base para Sprint 2
