import { useDemo } from "../../context/DemoContext";
import { translate } from "../../i18n";
export function DemoBanner() {
  const demo=useDemo();
  if(!demo) return null;
  return <aside className="demo-banner" aria-label={translate("Demo mode")}><div><strong>{translate("Demo mode")}</strong><span>{translate("Fictional data. Changes reset on refresh.")}</span></div><div><button type="button" onClick={demo.reset}>{translate("Reset demo")}</button><a href={import.meta.env.BASE_URL}>{translate("Exit demo")}</a></div></aside>;
}
