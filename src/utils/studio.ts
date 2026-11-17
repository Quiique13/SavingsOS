import { getLocale } from "../i18n";
import { getCurrency } from "./currency";

/** Keep cents when present; whole balances follow the supplied preview typography. */
export function studioMoney(value: number): string {
  return new Intl.NumberFormat(getLocale().currencyLocale, {
    style: "currency", currency: getCurrency(),
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
