import { useParams } from "react-router-dom";
import { TemplatesPageView } from "@/features/templates";

export default function TemplatesPage() {
  const { projectId } = useParams();
  return <TemplatesPageView projectId={projectId} />;
}
