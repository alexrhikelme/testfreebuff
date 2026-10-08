import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { NotesProvider, useNotes } from "../features/notes/store";

vi.mock("../features/dashboards/store", () => ({}));

function wrapper({ children }: { children: ReactNode }) {
  return <NotesProvider>{children}</NotesProvider>;
}

describe("NotesProvider (store de notas)", () => {
  it("cria nota com valores padrão e registra atividade", () => {
    const { result } = renderHook(() => useNotes(), { wrapper });
    const before = result.current.notes.length;

    act(() => {
      result.current.createNote({ title: "Nova nota" });
    });

    expect(result.current.notes.length).toBe(before + 1);
    const created = result.current.notes[0];
    expect(created.title).toBe("Nova nota");
    expect(created.status).toBe("not_started");
    expect(created.updatedBy).toBe("Ana Costa");

    expect(result.current.activity).toHaveLength(1);
    expect(result.current.activity[0].action).toBe("created");
  });

  it("atualiza nota e registra who/when", async () => {
    const { result } = renderHook(() => useNotes(), { wrapper });
    const id = result.current.notes[0].id;

    await act(async () => {
      result.current.updateNote(id, { title: "Título novo" });
    });

    const updated = result.current.notes.find((n) => n.id === id)!;
    expect(updated.title).toBe("Título novo");
    expect(updated.updatedBy).toBe("Ana Costa");
    expect(result.current.activity[0].action).toBe("updated");
  });

  it("registra status_changed quando o status muda", async () => {
    const { result } = renderHook(() => useNotes(), { wrapper });
    const id = result.current.notes[0].id;

    await act(async () => {
      result.current.updateNote(id, { status: "completed" });
    });

    expect(result.current.activity[0].action).toBe("status_changed");
  });

  it("não registra status_changed se o status é o mesmo", async () => {
    const { result } = renderHook(() => useNotes(), { wrapper });
    const id = result.current.notes[0].id;
    const sameStatus = result.current.notes[0].status;

    await act(async () => {
      result.current.updateNote(id, { status: sameStatus });
    });

    expect(result.current.activity[0].action).toBe("updated");
  });

  it("exclui nota e registra atividade com o título", async () => {
    const { result } = renderHook(() => useNotes(), { wrapper });
    const target = result.current.notes[0];

    await act(async () => {
      result.current.deleteNote(target.id);
    });

    expect(result.current.notes.find((n) => n.id === target.id)).toBeUndefined();
    const entry = result.current.activity[0];
    expect(entry.action).toBe("deleted");
    expect(entry.noteTitle).toBe(target.title);
  });

  it("moveNote muda o status e define ordem na coluna", async () => {
    const { result } = renderHook(() => useNotes(), { wrapper });
    const note = result.current.notes[0];

    await act(async () => {
      result.current.moveNote(note.id, "completed");
    });

    const moved = result.current.notes.find((n) => n.id === note.id)!;
    expect(moved.status).toBe("completed");
    expect(result.current.activity[0].action).toBe("moved");
    expect(result.current.order[note.id]).toBeDefined();
  });

  it("moveNote insere antes de outra nota da mesma coluna", async () => {
    const { result } = renderHook(() => useNotes(), { wrapper });
    const a = result.current.notes[0];
    const b = result.current.notes[1];

    await act(async () => {
      result.current.moveNote(a.id, "completed");
    });
    await act(async () => {
      result.current.moveNote(b.id, "completed", a.id);
    });

    // b deve ficar antes de a na ordem
    expect(result.current.order[b.id]).toBeLessThan(result.current.order[a.id]);
  });

  it("validação de título acontece na view, store aceita payload do modal", () => {
    const { result } = renderHook(() => useNotes(), { wrapper });
    act(() => {
      result.current.createNote({ title: "  Com espaços  " });
    });
    // O store recebe o título já tratado pela view (trim), mas não rejeita.
    expect(result.current.notes[0].title.length).toBeGreaterThan(0);
  });
});
