import { translate, useLanguage } from "../../i18n";
import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { WorkspacePeriodContext } from "../../context/WorkspacePeriodContext";
import { Popover } from "radix-ui";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { dateLabel, monthLabel, shiftMonth, today } from "../../utils/finance";

export function MonthPicker({
  month,
  setMonth,
  inline = false,
}: {
  month: string;
  setMonth: (m: string) => void;
  inline?: boolean;
}) {
  useLanguage();
  const headerSlot = useContext(WorkspacePeriodContext);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  const currentMonth = today().slice(0, 7);
  const years = Array.from({ length: Math.min(9999, year + 20) - Math.max(1, year - 20) + 1 }, (_, index) => Math.max(1, year - 20) + index);
  function choose(value: string) {
    setMonth(value);
    setOpen(false);
  }
  const picker = (
    <div className="month-picker">
      <button
        type="button"
        aria-label={translate("Previous month")}
        onClick={() => setMonth(shiftMonth(month, -1))}
      >
        <ChevronLeft size={16} />
      </button>
      <Popover.Root open={open} onOpenChange={next => { if (next) setYear(Number(month.slice(0, 4))); setOpen(next); }}>
        <Popover.Trigger asChild>
          <button type="button" className="month-picker-trigger" aria-label={translate("Select month")} data-month={month}>
            <CalendarDays size={15} />
            <span>{monthLabel(month)}</span>
            <ChevronDown size={13} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="month-menu" aria-label={translate("Select month")} align="end" sideOffset={8} collisionPadding={12}>
            <div className="month-menu-year">
              <button type="button" className="icon-button" aria-label={translate("Previous year")} disabled={year <= 1} onClick={() => setYear(year - 1)}><ChevronLeft size={17} /></button>
              <select aria-label={translate("Select year")} value={year} onChange={event => setYear(Number(event.target.value))}>
                {years.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
              <button type="button" className="icon-button" aria-label={translate("Next year")} disabled={year >= 9999} onClick={() => setYear(year + 1)}><ChevronRight size={17} /></button>
            </div>
            <div className="month-menu-grid" role="group" aria-label={translate("Month")}>
              {Array.from({ length: 12 }, (_, index) => {
                const number = String(index + 1).padStart(2, "0");
                const value = String(year).padStart(4, "0") + "-" + number;
                return <button key={number} type="button" data-month={value} aria-pressed={month === value} onClick={() => choose(value)}>{dateLabel("2026-" + number + "-01", { month: "short" })}</button>;
              })}
            </div>
            <button type="button" className="month-menu-today" onClick={() => choose(currentMonth)}>{translate("This month")}</button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <button
        type="button"
        aria-label={translate("Next month")}
        onClick={() => setMonth(shiftMonth(month, 1))}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
  return headerSlot && !inline ? createPortal(picker, headerSlot) : picker;
}
