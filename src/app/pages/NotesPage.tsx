import { useParams } from "react-router-dom";
import { NotesPageView } from "@/features/notes";

export default function NotesPage() {
  const { projectId } = useParams();
  return <NotesPageView projectId={projectId} />;
}
