import { useParams } from "react-router-dom";
import { DashboardsPageView } from "@/features/dashboards";

export default function DashboardsPage() {
  const { projectId } = useParams();
  return <DashboardsPageView projectId={projectId} />;
}
