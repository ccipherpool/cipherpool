import BugBountyPage from "../../features/community/BugBountyPage";
import { useAuth } from "../../contexts/AuthContext";

export default function BugBounty() {
  const { user } = useAuth();
  return <BugBountyPage userId={user?.id ?? null} />;
}
