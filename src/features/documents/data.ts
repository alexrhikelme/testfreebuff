/**
 * Sprint 11 — Janela "Minhas Anotações".
 * Documentos recentes do workspace com leitor/editor (dados puros).
 */

export type DocSection = {
  heading?: string;
  text: string;
};

export type DocCheckItem = {
  label: string;
  checked: boolean;
};

export type WorkspaceDoc = {
  id: string;
  /** Tipo exibido no ícone da lista (PRD, ata, diretriz, checklist...). */
  kind: "prd" | "ata" | "diretriz" | "checklist" | "nota";
  title: string;
  /** Rótulo curto de data ao lado do item na lista. */
  dateLabel: string;
  author: string;
  editedLabel: string;
  sections: DocSection[];
  checklist?: DocCheckItem[];
};

export const SEED_DOCS: WorkspaceDoc[] = [
  {
    id: "doc-prd-unicap",
    kind: "prd",
    title: "PRD - Integração do Sistema Acadêmico UNICAP",
    dateLabel: "Ontem",
    author: "Rodrigo Silva",
    editedLabel: "Editado ontem às 16:45",
    sections: [
      {
        text: "Permitir que alunos, pesquisadores e parceiros da agência Combogó sincronizem suas credenciais institucionais e projetos de extensão diretamente no portal, reduzindo o tempo de validação acadêmica de 5 dias para menos de 3 minutos via OAuth2 e Single Sign-On (SSO).",
      },
      {
        heading: "1. Visão Geral & Escopo",
        text: "Atualmente, a gestão de membros nos laboratórios do Hub de Inovação UNICAP requer aprovações manuais via secretaria acadêmica. O projeto de integração irá unificar a base de alunos matriculados nos cursos de Ciência da Computação, Design, Jogos Digitais e Engenharia diretamente aos workspaces do Combogó.",
      },
      {
        heading: "2. Próximos Passos (Sprint 42)",
        text: "Itens de acompanhamento para a próxima semana:",
      },
    ],
    checklist: [
      { label: "Homologação da conexão com LDAP Católica", checked: true },
      { label: "Criação de tokens de curta duração (TTL 15 min)", checked: true },
      { label: "Implementar rate limiting de 100 req/min por estudante", checked: false },
      { label: "Auditoria de conformidade com LGPD para dados de matrícula", checked: false },
    ],
  },
  {
    id: "doc-ata-42",
    kind: "ata",
    title: "Ata Sprint Planning 42",
    dateLabel: "14 Out",
    author: "Juliana Freire",
    editedLabel: "Editado em 14 de Out às 10:20",
    sections: [
      {
        text: "Presenças: Beatriz, Carlos, Rafael, Juliana e Larissa. Objetivo: alinhar o escopo do Sprint 42 e distribuir responsabilidades entre as equipes do ecossistema Combogó.",
      },
      {
        heading: "1. Decisões",
        text: "O Sprint 42 terá duração de duas semanas, com revisão intermediária na quinta-feira. O PRD de integração SSO será a prioridade máxima do time de Desenvolvimento Web.",
      },
      {
        heading: "2. Ações",
        text: "Beatriz conduz a revisão do design system; Rafael valida o plano de testes do Polo Games; Larissa atualiza o board diariamente.",
      },
    ],
  },
  {
    id: "doc-marca",
    kind: "diretriz",
    title: "Diretrizes de Marca Combogó",
    dateLabel: "12 Out",
    author: "Beatriz Albuquerque",
    editedLabel: "Editado em 12 de Out às 09:10",
    sections: [
      {
        text: "Manual resumido de identidade visual para peças digitais e impressas do ecossistema Combogó Unicap.",
      },
      {
        heading: "1. Cores & Tipografia",
        text: "Laranja institucional como cor primária, acompanhado de superfícies escuras em azul-marinho. Títulos em peso semibold e textos em peso regular, com contraste mínimo AA em todas as telas.",
      },
      {
        heading: "2. Aplicações",
        text: "Logo vetorial sempre com área de respiro equivalente à altura do símbolo. Nunca aplicar sobre fundos de baixo contraste ou distorcer as proporções.",
      },
    ],
  },
  {
    id: "doc-checklist",
    kind: "checklist",
    title: "Checklist de Relatório Final",
    dateLabel: "08 Out",
    author: "Carlos Eduardo Silveira",
    editedLabel: "Editado em 08 de Out às 18:30",
    sections: [
      {
        text: "Itens obrigatórios antes da entrega do relatório de extensão ao coordenador do curso.",
      },
      {
        heading: "1. Documentação",
        text: "Marque os itens conforme forem concluídos:",
      },
    ],
    checklist: [
      { label: "Resumo executivo revisado", checked: true },
      { label: "Anexos de dados consolidados", checked: false },
      { label: "Declaração de contribuição dos parceiros", checked: false },
      { label: "Aprovação final da equipe editorial", checked: false },
    ],
  },
];
