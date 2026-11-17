import { translate, useLanguage } from "../../i18n";
import { Link } from "react-router-dom";
import darkLogo from "../../assets/savingsOS-dark.svg";
import lightLogo from "../../assets/savingsOS-light.svg";
import { useTheme } from "../../hooks/useTheme";

export function Brand({
  className = "",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  useLanguage();
  const { theme } = useTheme();
  return (
    <Link
      to="/dashboard"
      className={"brand " + className}
      aria-label={translate("savingsOS overview")}
      title={translate("savingsOS overview")}
      onClick={onClick}
    >
      <span className="brand-icon">
        <img src={theme === "dark" ? darkLogo : lightLogo} alt="" width={44} height={44} />
      </span>
      <span className="brand-wordmark" translate="no">savings<span className="brand-light">OS</span>
      </span>
    </Link>
  );
}
