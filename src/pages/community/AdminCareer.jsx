import AdminCareerPage from "../../features/community/AdminCareerPage";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminCareer() {
  const { user } = useAuth();
  return <AdminCareerPage userId={user?.id ?? null} />;
}
