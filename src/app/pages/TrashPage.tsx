import { useParams } from "react-router-dom";
import { TrashPageView } from "@/features/trash";

export default function TrashPage() {
  const { projectId } = useParams();
  return <TrashPageView projectId={projectId} />;
}
