import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../shared/components/Toast";
import { NotesProvider, useNotes } from "../features/notes";
import { LabProvider } from "../features/dashboards";
import {
  NoteContent,
  RichContentView,
  RichTextEditor,
  sanitizeRichHtml,
} from "../features/notes/RichText";

/** Liga a descrição da primeira nota semeada ao store real. */
function FirstNoteContent() {
  const { notes } = useNotes();
  const note = notes[0];
  if (!note) return null;
  return <NoteContent note={note} />;
}

function wrap(ui: ReactNode) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <NotesProvider>
          <LabProvider>{ui}</LabProvider>
        </NotesProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe("sanitizeRichHtml", () => {
  it("mantém a formatação segura e neutraliza scripts e javascript:", () => {
    const html = sanitizeRichHtml(
      '<b>forte</b><script>alert(1)</script><a href="javascript:alert(1)">ruim</a> <a href="https://unicap.br">bom</a>'
    );
    expect(html).toContain("<b>forte</b>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("alert(1)");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="https://unicap.br"');
    expect(html).toContain('target="_blank"');
  });
});

describe("RichContentView", () => {
  it("renderiza a descrição formatada com link clicável", () => {
    render(
      <RichContentView
        html={'olá <b>time</b>, vejam <a href="https://unicap.br">o site</a>'}
      />
    );
    expect(screen.getByText("time").tagName).toBe("B");
    const link = screen.getByRole("link", { name: "o site" });
    expect(link).toHaveAttribute("href", "https://unicap.br");
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("RichTextEditor", () => {
  it("expõe os comandos de formatação sem quebrar sem execCommand", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} ariaLabel="Descrição" />);

    for (const name of [
      "Negrito",
      "Itálico",
      "Sublinhado",
      "Riscado",
      "Lista com marcadores",
      "Inserir link",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(
      screen.getByRole("textbox", { name: "Descrição" })
    ).toBeInTheDocument();

    // jsdom não implementa execCommand: o clique não pode quebrar a página.
    await user.click(screen.getByRole("button", { name: "Negrito" }));
    expect(onChange).toHaveBeenCalled();
  });
});

describe("NoteContent (edição inline no card)", () => {
  it("clique na descrição abre o editor e 'Concluir' salva formatado", async () => {
    const user = userEvent.setup();
    wrap(<FirstNoteContent />);

    // Visão: a descrição semeada aparece como texto.
    const view = screen.getByTitle("Clique para editar a descrição");
    expect(view.textContent).toContain("Preparar tubos");

    // Abre a edição inline (toolbar + área editável + ações).
    await user.click(view);
    const box = screen.getByRole("textbox");
    expect(
      screen.getByRole("button", { name: "Concluir" })
    ).toBeInTheDocument();

    // jsdom não implementa contentEditable: simulamos a digitação rica.
    box.innerHTML = "<b>texto reformulado</b>";
    fireEvent.input(box);
    await user.click(screen.getByRole("button", { name: "Concluir" }));

    // Volta à visão com o conteúdo salvo e formatado.
    expect(screen.getByText("texto reformulado").tagName).toBe("B");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("nota sem descrição oferece 'Escrever descrição…'", async () => {
    const user = userEvent.setup();

    function Harness() {
      const { createNote, notes } = useNotes();
      const empty = notes.find((n) => n.title === "Vazia pente fino");
      return (
        <>
          <button
            type="button"
            onClick={() =>
              createNote({ title: "Vazia pente fino", status: "not_started" })
            }
          >
            criar
          </button>
          {empty && <NoteContent note={empty} />}
        </>
      );
    }

    wrap(<Harness />);
    await user.click(screen.getByRole("button", { name: "criar" }));
    await user.click(
      await screen.findByRole("button", { name: "Escrever descrição…" })
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Concluir" })
    ).toBeInTheDocument();
  });
});
