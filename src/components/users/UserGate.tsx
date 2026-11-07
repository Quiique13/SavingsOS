import { translate, useLanguage } from "../../i18n";
import { Navigate } from "react-router-dom";
import appIcon from "../../assets/savingsOS.svg";
import { useFinance } from "../../hooks/useFinance";
import { useUsers } from "../../hooks/useUsers";
import { UserChooser } from "../../pages/UserChooser";

export function UserGate({ children }: { children: React.ReactNode }) {
  useLanguage();
  const { currentUser, error } = useUsers();
  const { ready } = useFinance();
  if (!ready)
    return (
      <div className="loading-state">
        <img src={appIcon} alt="" width={42} height={42} />
        <p>{translate("Opening your personal finance space…")}</p>
      </div>
    );
  if (error || !currentUser) return <UserChooser />;
  if (currentUser.role === "admin") return <Navigate to="/admin" replace />;
  return <div key={currentUser.id}>{children}</div>;
}
