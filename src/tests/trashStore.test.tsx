import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  TrashProvider,
  useTrash,
  describeDeletedAt,
} from "../features/trash/store";

/**
 * Sprint 11/13 — store da Lixeira: restaurar, excluir em definitivo,
 * esvaziar, restaurar tudo e envio de itens; mais o rótulo "há X dias".
 */

function wrapper({ children }: { children: ReactNode }) {
  return <TrashProvider>{children}</TrashProvider>;
}

describe("TrashProvider (store da lixeira)", () => {
  it("começa com os 6 itens semente (3 projetos e 3 documentos)", () => {
    const { result } = renderHook(() => useTrash(), { wrapper });

    expect(result.current.items).toHaveLength(6);
    expect(
      result.current.items.filter((i) => i.kind === "projeto")
    ).toHaveLength(3);
    expect(
      result.current.items.filter((i) => i.kind === "documento")
    ).toHaveLength(3);
  });

  it("restore remove o item da lixeira", () => {
    const { result } = renderHook(() => useTrash(), { wrapper });

    act(() => {
      result.current.restore("trash-1");
    });

    expect(result.current.items).toHaveLength(5);
    expect(result.current.items.some((i) => i.id === "trash-1")).toBe(false);
  });

  it("remove (exclusão definitiva) some com o item", () => {
    const { result } = renderHook(() => useTrash(), { wrapper });

    act(() => {
      result.current.remove("trash-4");
    });

    expect(result.current.items).toHaveLength(5);
    expect(result.current.items.some((i) => i.id === "trash-4")).toBe(false);
  });

  it("empty esvazia a lixeira inteira", () => {
    const { result } = renderHook(() => useTrash(), { wrapper });

    act(() => {
      result.current.empty();
    });

    expect(result.current.items).toHaveLength(0);
  });

  it("restoreAll também esvazia (restaura todos de uma vez)", () => {
    const { result } = renderHook(() => useTrash(), { wrapper });

    act(() => {
      result.current.restoreAll();
    });

    expect(result.current.items).toHaveLength(0);
  });

  it("addItem envia um item novo para o topo com data atual", () => {
    const { result } = renderHook(() => useTrash(), { wrapper });

    let added!: ReturnType<typeof result.current.addItem>;
    act(() => {
      added = result.current.addItem({
        title: "Relatório de Coleta",
        kind: "documento",
      });
    });

    expect(result.current.items).toHaveLength(7);
    expect(result.current.items[0]).toEqual(added);
    expect(added.id.startsWith("trash-")).toBe(true);
    expect(added.kind).toBe("documento");
    expect(Number.isNaN(Date.parse(added.deletedAt))).toBe(false);
  });

  it("useTrash fora do provider lança erro claro", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTrash())).toThrow(
      "useTrash must be used within TrashProvider"
    );
    spy.mockRestore();
  });
});

describe("describeDeletedAt (rótulo de exclusão)", () => {
  // Data fixa em horário local para o rótulo ser determinístico.
  const NOW = new Date(2026, 9, 26, 12, 0, 0); // 26 Out 2026

  const daysBefore = (days: number) =>
    new Date(NOW.getTime() - days * 86_400_000).toISOString();

  it("descreve exclusão de hoje", () => {
    expect(describeDeletedAt(NOW.toISOString(), NOW)).toBe("Excluído hoje");
  });

  it("descreve 1 dia no singular", () => {
    expect(describeDeletedAt(daysBefore(1), NOW)).toBe("Excluído há 1 dia");
  });

  it("descreve N dias até 30", () => {
    expect(describeDeletedAt(daysBefore(6), NOW)).toBe("Excluído há 6 dias");
    expect(describeDeletedAt(daysBefore(30), NOW)).toBe("Excluído há 30 dias");
  });

  it("depois de 30 dias usa o formato 'em D de Mês'", () => {
    // 40 dias antes de 26/Out = 16/Set.
    expect(describeDeletedAt(daysBefore(40), NOW)).toBe(
      "Excluído em 16 de Set"
    );
  });

  it("datas futuras contam como hoje (sem números negativos)", () => {
    const future = new Date(NOW.getTime() + 86_400_000).toISOString();
    expect(describeDeletedAt(future, NOW)).toBe("Excluído hoje");
  });
});
