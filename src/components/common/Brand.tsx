import { translate, useLanguage } from "../../i18n";
import { Link } from "react-router-dom";
import appIcon from "../../assets/savingsOS-v2.svg";

export function Brand({
  className = "",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  useLanguage();
  return (
    <Link
      to="/dashboard"
      className={"brand " + className}
      aria-label={translate("savingsOS overview")}
      title={translate("savingsOS overview")}
      onClick={onClick}
    >
      <span className="brand-icon">
        <img src={appIcon} alt="" width={44} height={44} />
      </span>
      <span className="brand-wordmark" translate="no">savings<span className="brand-light">OS</span>
      </span>
    </Link>
  );
}
