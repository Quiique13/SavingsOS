import { translate, useLanguage, getLocale } from "../../i18n";
import { currencies, isCurrency, useCurrency } from "../../utils/currency";
import { useSettingsDraft } from "../../context/SettingsDraftContext";

export function CurrencySettings() {
  useLanguage();
  const current = useCurrency();
  const settings = useSettingsDraft();
  const currency = settings?.draft.currency ?? current.currency;
  const setCurrency = (value: typeof currency) => settings ? settings.change("currency", value) : current.setCurrency(value);
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
      <p>{translate(settings ? "Save changes to apply your display currency." : "Saved for this browser or app installation.")}</p>
    </div>
  </section>;
}
