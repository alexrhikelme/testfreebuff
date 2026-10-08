/**
 * Sprint 11 — Janela "Templates".
 * Catálogo de modelos padronizados (dados puros, sem React).
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
    description:
      "Quadro ágil padrão para squads com colunas de backlog, execução, impedimentos e acompanhamento de entregas semanais.",
    author: "Polo de Inovação",
    icon: "board",
    body:
      "Colunas: Backlog • Execução • Impedimentos • Concluído.\n\nDefinição de pronto (DoD):\n- Código revisado e testado\n- Documentação atualizada\n- Aprovação do líder da equipe",
  },
  {
    id: "tpl-prd",
    tab: "documentos",
    categoryLabel: "Documentação",
    title: "PRD Técnico & Arquitetura",
    description:
      "Estrutura direta para especificação de requisitos de software, escopo técnico, endpoints de API e critérios de aceite.",
    author: "Engenharia Core",
    icon: "file",
    body:
      "1. Visão Geral & Escopo\nContexto, problema e objetivos do produto.\n\n2. Requisitos Técnicos\nEndpoints de API, modelos de dados e integrações.\n\n3. Critérios de Aceite\nLista verificável de condições de aceitação.",
  },
  {
    id: "tpl-tokens",
    tab: "design",
    categoryLabel: "Design System",
    title: "Guia de Tokens & Componentes",
    description:
      "Padrões visuais do Combogó com paleta oficial, escalas tipográficas e estrutura de componentes para novas interfaces.",
    author: "Equipe UI/UX",
    icon: "palette",
    body:
      "1. Cores\nPaleta oficial, estados e contraste AA.\n\n2. Tipografia\nEscala de títulos e textos.\n\n3. Componentes\nBotões, inputs, cards e padrões de interação.",
  },
  {
    id: "tpl-gdd",
    tab: "jogos",
    categoryLabel: "Jogos & VR",
    title: "Game Design Document (GDD)",
    description:
      "Guia organizado para definição do loop principal de gameplay, mecânicas interativas e roteiro de produção transmídia.",
    author: "Polo Games",
    icon: "gamepad",
    body:
      "1. Conceito & Pilares\nFantasia central e pilares de design.\n\n2. Loop Principal\nAções do jogador, recompensas e progressão.\n\n3. Produção\nMilestones, arte e som.",
  },
  {
    id: "tpl-rice",
    tab: "design",
    categoryLabel: "Pesquisa UX",
    title: "Pesquisa & Priorização RICE",
    description:
      "Roteiros de entrevista, mapas de síntese e planilha para cálculo objetivo de prioridades e esforço de implementação.",
    author: "Pesquisa & Métodos",
    icon: "users",
    body:
      "1. Roteiro de Entrevista\nPerguntas abertas e hipóteses.\n\n2. Síntese\nMapa de dores e oportunidades.\n\n3. RICE\nScore = (Alcance × Efeito × Confiança) / Esforço.",
  },
  {
    id: "tpl-retro",
    tab: "gestao",
    categoryLabel: "Cerimônia",
    title: "Retrospectiva & Revisão",
    description:
      "Quadro para reuniões de fechamento de ciclo com pontos positivos, melhorias necessárias e definição de ações do squad.",
    author: "Gestão Ágil",
    icon: "check",
    body:
      "1. O que funcionou?\nPontos positivos do ciclo.\n\n2. O que melhorar?\nPontos de atrito e melhorias.\n\n3. Ações\nResponsável e prazo para cada ação.",
  },
];
