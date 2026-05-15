import IdeasPage from "../../features/community/IdeasPage";
import { useAuth } from "../../contexts/AuthContext";

export default function Ideas() {
  const { user } = useAuth();
  return <IdeasPage userId={user?.id ?? null} />;
}
