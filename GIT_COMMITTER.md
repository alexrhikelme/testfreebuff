# Guia de commit e organização do repositório

Esse arquivo ajuda o time a manter o histórico legível, o código organizado e o projeto fácil de rastrear.

Ele não é uma regra externa rígida. Ele é uma prática que ajuda o projeto a escalar sem virar caos.

## O que o Git nos ajuda a fazer

- separar mudanças importantes
- entender o que mudou, quando e por quê
- facilitar revisões
- voltar atrás com mais segurança quando algo sai do esperado
- manter o desenvolvimento sincronizado entre quem trabalha no projeto

Por isso, commits e mensagens importam.

## Formato de mensagem de commit

Prefira mensagens curtas e claras, focadas na razão da mudança, não só no “o que foi tocado”.

Padrão sugerido:

- primeira linha: o que foi feito ou corrigido
- segunda parte: contexto quando necessário
- evitar mensagens genéricas como “update”, “fix”, “alteração”

Exemplos úteis:

- `Configura Tailwind v4 com PostCSS`
- `Adiciona estrutura inicial do módulo de notas`
- `Corrige caminho de import do CSS global`
- `Prepara base de sprint para auth e onboarding`

Ideal: uma pessoa que só ler a mensagem deve entender, em linha geral, o que aconteceu.

## O que evitar

- commits gigantesque com toda a história do projeto
- mensagens sem sentido
- commits que misturam refatoração, feature e ajuste de estilo sem motivo aparente
- commits que escondem erros por “daqui a pouco eu arrumo”

Se uma mudança faz sentido separada, separe.

## Branchs e fluxo sugerido

Não é necessário complicar. Uma estrutura simples já ajuda:

- `main` como linha de integridade do projeto
- branchs por funcionalidade ou correção quando necessário
- nome claro no branch quando for usar

Exemplos:

- `feat/auth-and-onboarding`
- `feat/notes-crud`
- `fix/status-pipeline`
- `chore/config-tailwind`

O importante não é a quantidade de branchs, mas a clareza de para que cada um existe.

## O que entra no commit

Além do código, devem entrar de forma controlada:

- arquivos de configuração quando for relevante
- documentação vinculada à mudança
- ajustes de estrutura quando ajudam a entender a evolução

Evitar deixar arquivos de rascunho, logs locais ou arquivos temporários circulando pelo repositório.

## Mensagens do tipo “por quê” e não só “o quê”

Uma boa mensagem costuma dizer:

- o que foi feito
- por que foi feito
- em que contexto importa

Isso ajuda quem lê depois a não precisar adivinhar.

## Revisão e entrega

Quando possível:

- revisar mudanças antes de finalizar
- evitar entregar muita coisa não relacionada na mesma entrega
- deixar claro, pelo histórico, o andamento natural do projeto

A revisão não existe só para validar, mas para deixar o projeto mais consistente.

## Documentação que deve acompanhar o código

Nem toda mudança precisa de documento separado, mas mudanças que afetam:

- organização de módulos
- decisões técnicas
- comportamento importante
- fluxos principais

...devem deixar rastro claro.

No projeto, a ideia é usar o [[CEREBRO_PROJETO.md]] como hub e separar páginas quando o tópico ganhar vida própria.

## Checklist rápido antes de entregar

- a mudança está relacionada ao objetivo do commit?
- a mensagem é clara?
- arquivos úteis estão incluídos?
- arquivos temporários foram removidos?
- código novo segue a convenção do projeto?
- evidência básica de funcionamento existe quando aplicável?

## Para lembrar

Um bom histórico não é feito para o Git. É feito para as pessoas que vão manter, ler e evoluir o projeto depois.

Git é memória do time. Que a memória seja útil.

## Links internos

- [[ESPIRITO_E_STRUTURA_SPAF.md]]
- [[CEREBRO_PROJETO.md]]

