import { Link } from "react-router-dom";
import appIcon from "../../assets/savingsOS.svg";

export function Brand({ className = "", onClick }: { className?: string; onClick?: () => void }) {
  return <Link to="/dashboard" className={"brand " + className} aria-label="savingsOS overview" title="savingsOS overview" onClick={onClick}>
    <span className="brand-icon"><img src={appIcon} alt="" width={44} height={44} /></span>
    <span className="brand-wordmark">savings<span className="brand-light">OS</span></span>
  </Link>;
}
