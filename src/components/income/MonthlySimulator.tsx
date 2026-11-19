import { NumberPop } from "../common/NumberPop";
import { currencyLabel } from "../../utils/currency";
import { studioMoney } from "../../utils/studio";
import { useTheme } from "../../hooks/useTheme";
import { isDesignTheme } from "../../utils/appearance";
import { Calculator, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { translate, useLanguage } from "../../i18n";
import { useFinance } from "../../hooks/useFinance";
import { getMonthlyBudget, simulateMonth } from "../../utils/budget";
import { money, monthLabel } from "../../utils/finance";

export function MonthlySimulator({ month }: { month: string }) {
  useLanguage();
  const { uiTheme } = useTheme();
  const formatMoney = isDesignTheme(uiTheme) ? studioMoney : money;
  const { data } = useFinance();
  const budget = getMonthlyBudget(data, month);
  const id = useId();
  const [draft, setDraft] = useState<{
    income: string | null;
    extraIncome: string;
    extraSpending: string;
    carryover: string;
  }>({ income: null, extraIncome: "0", extraSpending: "0", carryover: "0" });
  const fields = [
    {
      name: "income",
      label: "Hypothetical income (€)",
      value: draft.income ?? String(budget.income),
    },
    {
      name: "extraIncome",
      label: "Extra income (€)",
      value: draft.extraIncome,
    },
    {
      name: "extraSpending",
      label: "Extra spending (€)",
      value: draft.extraSpending,
    },
    {
      name: "carryover",
      label: "Carryover before income (€)",
      value: draft.carryover,
    },
  ] as const;
  const numbers = fields.map((field) =>
    field.value.trim() ? Number(field.value) : NaN,
  );
  const result = simulateMonth(budget.planned, {
    income: numbers[0],
    extraIncome: numbers[1],
    extraSpending: numbers[2],
    carryover: numbers[3],
  });
  return (
    <section
      className="panel monthly-simulator"
      aria-labelledby={id + "-title"}
    >
      <div className="panel-heading">
        <div>
          <h2 id={id + "-title"}>
            <Calculator size={18} />
            {translate("Monthly simulator")}
          </h2>
          <p>
            {translate(
              "Try a different income for {{month}} and see what could be left.",
              { month: monthLabel(month) },
            )}
          </p>
        </div>
        <span className="simulation-badge">{translate("What if?")}</span>
      </div>
      <div className="simulator-body">
        <div className="simulator-inputs">
          <div className="simulator-fields">
            {fields.map((field) => (
              <label key={field.name} htmlFor={id + "-" + field.name}>
                <span>{currencyLabel(translate(field.label))}</span>
                <input
                  id={id + "-" + field.name}
                  name={field.name}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={field.name === "carryover" ? undefined : "0"}
                  value={field.value}
                  aria-describedby={
                    id + "-note" + (!result ? " " + id + "-error" : "")
                  }
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      [field.name]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <p className="simulator-note" id={id + "-note"}>
            {translate(
              "Carryover is money left before this month's income. Scenarios stay on this page and never change your records.",
            )}
          </p>
          {!result && (
            <p className="user-error" id={id + "-error"} role="alert">
              {translate(
                "Enter valid amounts with up to two decimals. Only carryover can be negative.",
              )}
            </p>
          )}
          <button
            className="button secondary small"
            type="button"
            onClick={() =>
              setDraft({
                income: null,
                extraIncome: "0",
                extraSpending: "0",
                carryover: "0",
              })
            }
          >
            <RotateCcw size={14} />
            {translate("Reset to saved income")}
          </button>
        </div>
        <div className="simulator-result" aria-live="polite" aria-atomic="true">
          <dl>
            <div>
              <dt>{translate("Available in scenario")}</dt>
              <dd>{result ? formatMoney(result.available) : "—"}</dd>
            </div>
            <div>
              <dt>{translate("Planned expenses")}</dt>
              <dd>{formatMoney(budget.planned)}</dd>
            </div>
            <div>
              <dt>{translate("Extra spending")}</dt>
              <dd>{result ? formatMoney(numbers[2]) : "—"}</dd>
            </div>
          </dl>
          <span className="simulator-result-label">
            {translate("Estimated month-end money")}
          </span>
          <strong
            className={
              "simulator-total" +
              (result && result.left < 0 ? " is-negative" : "")
            }
          >
            <NumberPop value={result ? formatMoney(result.left) : "—"} />
          </strong>
          <span className="simulator-outcome">
            {result
              ? translate(
                  result.left < 0
                    ? "Shortfall after planned spending"
                    : "Left after planned spending",
                )
              : translate("Complete the scenario to see your estimate")}
          </span>
          <p>
            {translate(
              "Includes every planned bill once, including bills already marked paid.",
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
