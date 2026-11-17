import { useEffect } from "react";
import { CURRENCY_KEY, isCurrency, savedCurrency, setCurrency } from "../../utils/currency";

export function CurrencySync() {
  useEffect(() => {
    setCurrency(savedCurrency(), false);
    const sync = (event: StorageEvent) => {
      if (event.key === CURRENCY_KEY || event.key === null) setCurrency(isCurrency(event.newValue) ? event.newValue : "EUR", false);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return null;
}
