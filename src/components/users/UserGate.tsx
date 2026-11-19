import { useLanguage } from "../../i18n";
import { Navigate } from "react-router-dom";
import { useFinance } from "../../hooks/useFinance";
import { useUsers } from "../../hooks/useUsers";
import { UserChooser } from "../../pages/UserChooser";

export function UserGate({ children }: { children: React.ReactNode }) {
  useLanguage();
  const { currentUser, error } = useUsers();
  const { ready } = useFinance();
  if (ready && (error || !currentUser)) return <UserChooser />;
  if (ready && currentUser?.role === "admin") return <Navigate to="/admin" replace />;
  // The shell owns the single page loader, including the initial record load.
  return children;
}
