# [[Paleta Oficial Combogó Unicap]]

> Sistema de cores oficial do projeto, definido pela identidade da marca [[Combogó Unicap]] — Agência de Soluções Interativas. Dark-first por design: o azul noturno é a base, o laranja é a voz da marca.

## Tabela oficial

| Cor | Hex principal | Hex secundário | Papel no produto |
|---|---|---|---|
| **Laranja Combogó** | `#E85D04` | `#F97316` | Cor primária da marca, botões de ação principal (CTA), ícones de destaque e estados ativos |
| **Azul Noturno Profundo** | `#0B132B` | `#0F172A` | Fundo principal da aplicação e superfícies escuras (contraste imersivo e elegante) |
| **Azul Ardósia / Contêiner** | `#1E293B` | `#233148` | Superfície dos cards centrais, modais e caixas de formulário |
| **Branco Suave** | `#F8FAFC` | `#FFFFFF` | Tipografia de títulos e textos de alta prioridade (máxima legibilidade, WCAG AAA) |
| **Cinza Secundário** | `#94A3B8` | `#64748B` | Textos auxiliares, placeholders de inputs, divisores e bordas sutis |
| **Verde Esmeralda / Ciano Acento** | `#10B981` | `#0284C7` | Indicadores de status ativo ("Ambiente Seguro"), tarefas concluídas |

## Mapeamento para tokens (`src/styles/global.css`)

A paleta vive nos tokens `@theme` do Tailwind 4. Nunca use hex direto nos componentes; use as classes utilitárias derivadas dos tokens.

| Token | Valor | Uso típico |
|---|---|---|
| `--color-background` | `#0B132B` | fundo global (`bg-background`) |
| `--color-surface` | `#0F172A` | painéis secundários, sidebar |
| `--color-surface-container-lowest` | `#1E293B` | cards, modais, inputs |
| `--color-surface-container-low` | `#233148` | variação de container |
| `--color-on-surface` | `#F8FAFC` | títulos e texto principal |
| `--color-on-surface-variant` | `#94A3B8` | texto auxiliar, placeholders |
| `--color-outline` / `--color-outline-variant` | `#64748B` / `#2C3A53` | bordas e divisores |
| `--color-brand` | `#E85D04` | CTAs, logo, estados ativos |
| `--color-brand-glow` | `#F97316` | hover/realce do laranja |
| `--color-brand-strong` | `#C2410C` | variação mais escura (foco) |
| `--color-brand-soft` | `#2E1A0D` | fundo sutil com tom da marca (badges) |
| `--color-tertiary` | `#10B981` | sucesso / concluído |
| `--color-primary` | `#0284C7` | informação / em andamento |
| `--color-error` | `#EF4444` | erros e bloqueios |

## Regras de uso

1. **Laranja é voz, não tapete.** Use em CTAs, ícones de destaque e estados ativos. Não pinte grandes áreas com ele.
2. **Fundo é sempre azul noturno.** Grandes áreas usam `bg-background`/`bg-surface`; cards usam `surface-container-*`.
3. **Contraste primeiro.** Texto principal é Branco Suave; auxiliar é Cinza Secundário. Laranja sobre azul noturno passa WCAG AA para texto grande e elementos gráficos.
4. **Verde/Ciano significam status**, não decoração: concluído (verde), em andamento (ciano), bloqueado (vermelho do sistema de erro).
5. **Sombra da marca:** use `shadow-brand/25…30` em CTAs para o glow laranja sutil.

## Logo

- Arquivo único: `src/shared/components/Logo.tsx`
- `MandalaMark` — recriação vetorial fiel da logo oficial em SVG (viewBox 100×100):
  - 8 pétalas radiais brancas girando em torno do centro
  - anel central branco (stroke) sobre o laranja
  - 4 diamantes intermediários entre as pétalas
  - 8 arcos de borda + 4 quarter-discs nos cantos do quadrado
  - fundo quadrado `#E85D04` com leve arredondamento (`rx=6`)
- `Logo` — mandala + wordmark **COMBOGÓ** (Branco Suave) + **UNICAP** (Cinza Secundário, tracking largo) + tagline opcional "Agência de Soluções Interativas"
- Tamanhos: `sm | md | lg | xl`; tagline visível a partir de `lg`
- Favicon: SVG inline da mandala (data URI) em `index.html`

Ver também: [[Decisões Técnicas]], [[DESIGN.md]], [[Sprint 2 — CRUD de anotações]].
