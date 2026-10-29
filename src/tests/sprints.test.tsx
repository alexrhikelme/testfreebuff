import { describe, it, expect, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../shared/components/Toast";
import { NotesProvider, useNotes, NotesBoardView } from "../features/notes";

/**
 * Montagem de sprints no quadro Kanban: o board não para nas 4 colunas
 * base — o usuário cria, renomeia e exclui sprints, e cada nota sabe em
 * qual sprint está (vínculo persistido no navegador).
 */

function wrap(ui: ReactNode) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <NotesProvider>{ui}</NotesProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

/** Cria um sprint com uma nota dentro e renderiza o quadro. */
function SprintHarness() {
  const { notes, addSprint, createNote } = useNotes();
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const column = addSprint();
          createNote({ title: "Nota no sprint novo", sprintId: column.id });
        }}
      >
        criar sprint com nota
      </button>
      <NotesBoardView notes={notes} onEdit={() => {}} onDelete={() => {}} />
    </div>
  );
}

describe("Kanban — montagem de sprints", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("começa com as 4 colunas base e cria um sprint além delas", async () => {
    const user = userEvent.setup();
    wrap(<NotesBoardView notes={[]} onEdit={() => {}} onDelete={() => {}} />);

    for (const title of ["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4"]) {
      expect(
        screen.getByRole("region", { name: `Coluna ${title}` })
      ).toBeInTheDocument();
    }
    expect(
      screen.queryByRole("region", { name: "Coluna Sprint 5" })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Nova sprint/ }));

    // A nova coluna nasce em edição de título, pronta para ser renomeada.
    const input = screen.getByLabelText("Renomear coluna Sprint 5");
    await user.clear(input);
    await user.type(input, "Sprint 5 — Entrega{Enter}");

    expect(
      screen.getByRole("region", { name: "Coluna Sprint 5 — Entrega" })
    ).toBeInTheDocument();
    const saved = JSON.parse(
      window.localStorage.getItem("kanban-sprints") ?? "{}"
    );
    expect(saved.columns).toHaveLength(1);
    expect(saved.columns[0].title).toBe("Sprint 5 — Entrega");
  });

  it("coloca a nota criada dentro do sprint escolhido e guarda o vínculo", async () => {
    const user = userEvent.setup();
    wrap(<SprintHarness />);

    expect(
      screen.getByRole("region", { name: "Coluna Sprint 1" })
    ).not.toHaveTextContent("Nota no sprint novo");

    await user.click(screen.getByRole("button", { name: "criar sprint com nota" }));

    const sprintRegion = await screen.findByRole("region", {
      name: "Coluna Sprint 5",
    });
    expect(sprintRegion).toHaveTextContent("Nota no sprint novo");
    expect(
      screen.getByRole("region", { name: "Coluna Sprint 1" })
    ).not.toHaveTextContent("Nota no sprint novo");

    const saved = JSON.parse(
      window.localStorage.getItem("kanban-sprints") ?? "{}"
    );
    expect(saved.columns).toHaveLength(1);
    expect(Object.values(saved.membership)).toEqual([saved.columns[0].id]);
  });

  it("excluir o sprint devolve as anotações para a coluna de status", async () => {
    const user = userEvent.setup();
    wrap(<SprintHarness />);

    await user.click(screen.getByRole("button", { name: "criar sprint com nota" }));
    await screen.findByRole("region", { name: "Coluna Sprint 5" });

    await user.click(
      screen.getByRole("button", { name: "Excluir sprint Sprint 5" })
    );
    const dialog = screen.getByRole("dialog", { name: "Excluir sprint?" });
    expect(dialog).toHaveTextContent("nenhuma é apagada");
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      screen.queryByRole("region", { name: "Coluna Sprint 5" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Coluna Sprint 1" })
    ).toHaveTextContent("Nota no sprint novo");

    const saved = JSON.parse(
      window.localStorage.getItem("kanban-sprints") ?? "{}"
    );
    expect(saved.columns).toHaveLength(0);
    expect(saved.membership).toEqual({});
  });

  it("renomear um sprint salva o novo título", async () => {
    const user = userEvent.setup();
    wrap(<SprintHarness />);
    await user.click(screen.getByRole("button", { name: "criar sprint com nota" }));
    await screen.findByRole("region", { name: "Coluna Sprint 5" });

    await user.click(screen.getByRole("button", { name: /^Sprint 5$/ }));
    const input = screen.getByLabelText("Renomear coluna Sprint 5");
    await user.clear(input);
    await user.type(input, "Revisão de qualidade{Enter}");

    expect(
      screen.getByRole("region", { name: "Coluna Revisão de qualidade" })
    ).toBeInTheDocument();
    const saved = JSON.parse(
      window.localStorage.getItem("kanban-sprints") ?? "{}"
    );
    expect(saved.columns[0].title).toBe("Revisão de qualidade");
  });
});
