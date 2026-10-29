/**
 * Sprint 11 — Janela "Templates".
 * Catálogo de modelos padronizados (dados puros, sem React).
 * Pente fino: descrições e corpos resumidos para leitura rápida.
 */

export type TemplateTab =
  | "gestao"
  | "documentos"
  | "design"
  | "jogos";

export const TAB_LABEL: Record<TemplateTab, string> = {
  gestao: "Gestão & Scrum",
  documentos: "Documentos & PRD",
  design: "Design & UX",
  jogos: "Jogos & VR",
};

export type Template = {
  id: string;
  tab: TemplateTab;
  /** Rótulo da categoria exibido em caixa alta no card. */
  categoryLabel: string;
  title: string;
  description: string;
  author: string;
  icon: "board" | "file" | "palette" | "gamepad" | "users" | "check";
  /** Corpo padrão usado ao criar a anotação a partir do modelo. */
  body: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "tpl-sprint-board",
    tab: "gestao",
    categoryLabel: "Gestão Ágil",
    title: "Sprint Board Completo",
    description: "Backlog, execução, impedimentos e conclusão num quadro só.",
    author: "Polo de Inovação",
    icon: "board",
    body:
      "Colunas: Backlog • Execução • Impedimentos • Concluído.\nDoD: código revisado, testado e documentado.",
  },
  {
    id: "tpl-prd",
    tab: "documentos",
    categoryLabel: "Documentação",
    title: "PRD Técnico & Arquitetura",
    description: "Esqueleto de PRD: escopo, requisitos técnicos e aceite.",
    author: "Engenharia Core",
    icon: "file",
    body:
      "1. Visão & Escopo\n2. Requisitos Técnicos (API, dados)\n3. Critérios de Aceite",
  },
  {
    id: "tpl-tokens",
    tab: "design",
    categoryLabel: "Design System",
    title: "Guia de Tokens & Componentes",
    description: "Cores, tipografia e componentes do Combogó em um guia curto.",
    author: "Equipe UI/UX",
    icon: "palette",
    body:
      "1. Cores — paleta e contraste AA\n2. Tipografia — escala de títulos e textos\n3. Componentes — botões, inputs e cards",
  },
  {
    id: "tpl-gdd",
    tab: "jogos",
    categoryLabel: "Jogos & VR",
    title: "Game Design Document (GDD)",
    description: "Conceito, loop principal e produção do jogo.",
    author: "Polo Games",
    icon: "gamepad",
    body:
      "1. Conceito & Pilares\n2. Loop Principal\n3. Produção (marcos, arte e som)",
  },
  {
    id: "tpl-rice",
    tab: "design",
    categoryLabel: "Pesquisa UX",
    title: "Pesquisa & Priorização RICE",
    description: "Entrevistas, síntese e priorização por score RICE.",
    author: "Pesquisa & Métodos",
    icon: "users",
    body:
      "1. Roteiro de Entrevista\n2. Síntese (dores e oportunidades)\n3. RICE = (Alcance × Efeito × Confiança) / Esforço",
  },
  {
    id: "tpl-retro",
    tab: "gestao",
    categoryLabel: "Cerimônia",
    title: "Retrospectiva & Revisão",
    description: "O que funcionou, o que melhorar e ações com responsável.",
    author: "Gestão Ágil",
    icon: "check",
    body:
      "1. O que funcionou?\n2. O que melhorar?\n3. Ações — responsável e prazo",
  },
];
