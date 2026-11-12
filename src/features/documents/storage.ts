import { SEED_DOCS, type WorkspaceDoc } from "./data";

/**
 * Persistência de "Minhas Anotações" fora do componente, para que a Lixeira
 * consiga devolver uma anotação excluída mesmo com a janela desmontada.
 */
export const DOCS_STORAGE_KEY = "labnotes-docs-v1";

export type DocsState = {
  docs: WorkspaceDoc[];
  checked: Record<string, boolean>;
  selectedId: string;
};

function fallbackState(): DocsState {
  return { docs: SEED_DOCS, checked: {}, selectedId: SEED_DOCS[0].id };
}

/**
 * Documentos, checklists e seleção sobrevivem à troca de janela/rota e ao
 * recarregamento. Sem storage, cai nos dados de exemplo.
 */
export function readDocsState(): DocsState {
  try {
    const raw = window.localStorage.getItem(DOCS_STORAGE_KEY);
    if (!raw) return fallbackState();
    const parsed = JSON.parse(raw) as Partial<DocsState>;
    const docs = Array.isArray(parsed.docs) ? parsed.docs : SEED_DOCS;
    // Lista vazia é um estado válido: todas as anotações foram excluídas.
    const selectedId =
      typeof parsed.selectedId === "string" &&
      docs.some((d) => d.id === parsed.selectedId)
        ? parsed.selectedId
        : (docs[0]?.id ?? "");
    return {
      docs,
      checked:
        parsed.checked && typeof parsed.checked === "object"
          ? parsed.checked
          : {},
      selectedId,
    };
  } catch {
    return fallbackState();
  }
}

export function writeDocsState(state: DocsState): void {
  try {
    window.localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage indisponível: a janela continua funcionando em memória.
  }
}

/**
 * Devolve uma anotação da Lixeira para "Minhas Anotações" na posição em que
 * estava e deixa ela selecionada na próxima montagem da janela.
 */
export function restoreDocToStorage(doc: WorkspaceDoc, index: number): void {
  const state = readDocsState();
  if (state.docs.some((d) => d.id === doc.id)) return;
  const docs = [...state.docs];
  const position = Math.min(Math.max(0, index), docs.length);
  docs.splice(position, 0, doc);
  writeDocsState({ ...state, docs, selectedId: doc.id });
}
