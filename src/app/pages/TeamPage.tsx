import { useParams } from "react-router-dom";
import { TeamPageView } from "@/features/dashboards";

export default function TeamPage() {
  const { projectId } = useParams();
  return <TeamPageView projectId={projectId} />;
}
