import { translate, useLanguage } from "../../i18n";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { monthLabel, shiftMonth } from "../../utils/finance";

export function MonthPicker({
  month,
  setMonth,
}: {
  month: string;
  setMonth: (m: string) => void;
}) {
  useLanguage();
  return (
    <div className="month-picker">
      <button
        aria-label={translate("Previous month")}
        onClick={() => setMonth(shiftMonth(month, -1))}
      >
        <ChevronLeft size={16} />
      </button>
      <label>
        <CalendarDays size={15} />
        <span>{monthLabel(month)}</span>
        <input
          aria-label={translate("Select month")}
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
        <ChevronDown size={13} />
      </label>
      <button
        aria-label={translate("Next month")}
        onClick={() => setMonth(shiftMonth(month, 1))}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
