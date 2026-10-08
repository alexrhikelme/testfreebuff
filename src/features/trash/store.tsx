import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { makeId, nowIso } from "@/shared/backend/config";

/**
 * Sprint 11 — Janela "Lixeira".
 *
 * Itens excluídos recentemente (projetos/documentos) com restauração,
 * exclusão definitiva e "Esvaziar Lixeira". Estado em memória no provider
 * (protótipo), com a mesma API pronta para uma ponte Convex futura.
 */
export type TrashKind = "projeto" | "documento";

export type TrashItem = {
  id: string;
  title: string;
  kind: TrashKind;
  /** Momento da exclusão (ISO) — usado no rótulo "há X dias"/"em D de Mês". */
  deletedAt: string;
};

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const seedItems: TrashItem[] = [
  { id: "trash-1", title: "App Realidade Aumentada Museu UNICAP", kind: "projeto", deletedAt: daysAgo(6) },
  { id: "trash-2", title: "Portal de Inscrições Hackathon 2024", kind: "projeto", deletedAt: daysAgo(18) },
  { id: "trash-3", title: "Pesquisa Gamificação Acadêmica", kind: "projeto", deletedAt: daysAgo(27) },
  { id: "trash-4", title: "Briefing Técnico - Integração SSO Unicap", kind: "documento", deletedAt: daysAgo(38) },
  { id: "trash-5", title: "Matriz de Priorização RICE", kind: "documento", deletedAt: daysAgo(45) },
  { id: "trash-6", title: "Wireframes de Baixa Fidelidade - Totem", kind: "documento", deletedAt: daysAgo(52) },
];

type TrashContextValue = {
  items: TrashItem[];
  /** Restaura o item (remove da lixeira). */
  restore: (id: string) => void;
  /** Exclusão definitiva de um item. */
  remove: (id: string) => void;
  /** Esvazia a lixeira inteira. */
  empty: () => void;
  /** Envia um item para a lixeira (integração futura com exclusões reais). */
  addItem: (input: { title: string; kind: TrashKind }) => TrashItem;
};

const TrashContext = createContext<TrashContextValue | null>(null);

export function TrashProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TrashItem[]>(seedItems);

  const restore = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const empty = useCallback(() => setItems([]), []);

  const addItem = useCallback((input: { title: string; kind: TrashKind }) => {
    const item: TrashItem = {
      id: makeId("trash"),
      title: input.title,
      kind: input.kind,
      deletedAt: nowIso(),
    };
    setItems((prev) => [item, ...prev]);
    return item;
  }, []);

  return (
    <TrashContext.Provider value={{ items, restore, remove, empty, addItem }}>
      {children}
    </TrashContext.Provider>
  );
}

export function useTrash(): TrashContextValue {
  const ctx = useContext(TrashContext);
  if (!ctx) {
    throw new Error("useTrash must be used within TrashProvider");
  }
  return ctx;
}

const MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/**
 * Rótulo de exclusão: "há X dias" até 30 dias; depois "em D de Mês".
 * Ex.: "Excluído há 6 dias" / "Excluído em 22 de Out".
 */
export function describeDeletedAt(deletedAt: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(deletedAt).getTime();
  const days = Math.max(0, Math.floor(diff / 86_400_000));
  if (days === 0) return "Excluído hoje";
  if (days === 1) return "Excluído há 1 dia";
  if (days <= 30) return `Excluído há ${days} dias`;
  const d = new Date(deletedAt);
  return `Excluído em ${d.getDate()} de ${MONTHS_SHORT[d.getMonth()]}`;
}
