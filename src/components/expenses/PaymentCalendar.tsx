import {
  CalendarDays
} from "lucide-react";
import { useState } from "react";
import { type Row } from "../../types/finance";
import { dateLabel, money, monthLabel, today } from "../../utils/finance";

export function Calendar({
  month,
  rows,
  compact = false,
  onSelect,
}: {
  month: string;
  rows: Row[];
  compact?: boolean;
  onSelect: (r: Row) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const first = new Date(month + "-01T12:00:00");
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const selectedRows = rows.filter((r) => r.date === selected);
  return (
    <section
      className={
        "panel calendar-panel " +
        (compact ? "compact-calendar" : "full-calendar")
      }
    >
      <div className="aside-title">
        <h3>{compact ? "Payment calendar" : monthLabel(month)}</h3>
        <CalendarDays size={15} />
      </div>
      {compact && <p className="calendar-month">{monthLabel(month)}</p>}
      <div className="calendar-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span className="weekday" key={i}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = month + "-" + String(i + 1).padStart(2, "0");
          const bills = rows.filter((r) => r.date === date);
          return (
            <button
              aria-label={dateLabel(date) + " · " + bills.length + " expenses"}
              key={date}
              className={
                (date === today() ? "today " : "") +
                (selected === date ? "selected-day " : "") +
                (bills.length ? "has-bills" : "")
              }
              onClick={() => setSelected(selected === date ? null : date)}
            >
              <span>{i + 1}</span>
              {bills.length > 0 && (
                <i
                  style={{
                    background: bills.every((r) => r.paidDate)
                      ? "#458269"
                      : bills.some((r) => r.status === "Overdue")
                        ? "#c67563"
                        : "#caa66e",
                  }}
                />
              )}
              {!compact &&
                bills.map((r) => <small key={r.key}>{r.name}</small>)}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i style={{ background: "#458269" }} />
          Paid
        </span>
        <span>
          <i style={{ background: "#caa66e" }} />
          Upcoming
        </span>
        <span>
          <i style={{ background: "#c67563" }} />
          Overdue
        </span>
      </div>
      {selected && (
        <div className="calendar-selection">
          <strong>{dateLabel(selected)}</strong>
          {selectedRows.length ? (
            selectedRows.map((r) => (
              <button key={r.key} onClick={() => onSelect(r)}>
                {r.name}
                <b>{money(r.amount)}</b>
              </button>
            ))
          ) : (
            <p>No expenses due on this day.</p>
          )}
        </div>
      )}
    </section>
  );
}
