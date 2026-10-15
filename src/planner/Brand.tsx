import { Link } from "react-router-dom";

export function Brand({ className = "", onClick }: { className?: string; onClick?: () => void }) {
  return <Link to="/dashboard" className={"brand " + className} aria-label="SavingsOS overview" onClick={onClick}>
    <span className="brand-icon"><img src="/SOSLogo.svg" alt="" width={44} height={44}/></span>
    <span className="brand-wordmark">savings<span className="brand-light">os</span></span>
  </Link>;
}
