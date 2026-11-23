import { useParams } from "react-router-dom";
import { DocumentsPageView } from "@/features/documents";

export default function DocumentsPage() {
  const { projectId } = useParams();
  return <DocumentsPageView projectId={projectId} />;
}
