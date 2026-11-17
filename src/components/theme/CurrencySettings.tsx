import { translate, useLanguage, getLocale } from "../../i18n";
import { currencies, isCurrency, useCurrency } from "../../utils/currency";

export function CurrencySettings() {
  useLanguage();
  const { currency, setCurrency } = useCurrency();
  const names = new Intl.DisplayNames([getLocale().locale], {type:"currency"});
  return <section className="panel settings-section currency-settings">
    <div>
      <h2>{translate("Currency")}</h2>
      <p>{translate("Choose the currency shown throughout the app. This changes formatting only; amounts are not converted.")}</p>
      <label className="language-picker"><span>{translate("Display currency")}</span>
        <select aria-label={translate("Display currency")} value={currency} onChange={event => { if (isCurrency(event.target.value)) setCurrency(event.target.value); }}>
          {currencies.map(code => <option key={code} value={code}>{code} — {names.of(code)}</option>)}
        </select>
      </label>
      <p>{translate("Saved for this browser or app installation.")}</p>
    </div>
  </section>;
}
