import { translate, useLanguage } from "../i18n";
import {
  ArrowUpRight,
  Check,
  ReceiptText,
  TrendingUp
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { PageHeading } from "../components/common/PageHeading";
import { CategoryIcon } from "../components/expenses/CategoryIcon";
import { useFinance } from "../hooks/useFinance";
import { compactMoney, dateLabel, getRows, money, today } from "../utils/finance";

export function Insights() {
  useLanguage();
  const { data } = useFinance();
  const [year, setYear] = useState(today().slice(0, 4));
  const points = Array.from({ length: 12 }, (_, i) => {
    const month = year + "-" + String(i + 1).padStart(2, "0");
    const r = getRows(data, month);
    return {
      month: dateLabel(month + "-01", { month: "short" }),
      planned: r.reduce((s, r) => s + r.amount, 0),
      paid: r.filter((r) => r.paidDate).reduce((s, r) => s + r.amount, 0),
    };
  });
  const total = points.reduce((s, p) => s + p.planned, 0);
  const paid = points.reduce((s, p) => s + p.paid, 0);
  const annual = data.expenses.filter(
    (e) => e.frequency === "yearly" && e.due.slice(0, 4) <= year,
  );
  const recurring = data.expenses
    .filter((e) => e.frequency !== "once" && e.due.slice(0, 4) <= year)
    .reduce(
      (s, e) => s + (e.frequency === "monthly" ? e.amount : e.amount / 12),
      0,
    );
  return (
    <section className="insights-page min-w-0">
      <PageHeading
        title={translate("Insights")}
        description={translate("Review spending trends and plan for annual bills.")}
      >
        <label className="year-select">{translate("Year")}<select
            aria-label={translate("Select year")}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {Array.from(
              new Set([
                Number(today().slice(0, 4)) - 1,
                Number(today().slice(0, 4)),
                Number(today().slice(0, 4)) + 1,
                ...data.expenses.map((e) => Number(e.due.slice(0, 4))),
              ]),
            )
              .sort()
              .map((y) => (
                <option key={y}>{y}</option>
              ))}
          </select>
        </label>
      </PageHeading>
      <div className="stats-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="stat-card min-w-0 first:col-span-2 sm:first:col-span-1">
          <div className="stat-label">{translate("Yearly planned expenses")}<ReceiptText size={17} />
          </div>
          <div className="stat-value">{money(total)}</div>
          <p>{translate("All scheduled expenses in") + " "}{year}</p>
        </div>
        <div className="stat-card min-w-0 first:col-span-2 sm:first:col-span-1">
          <div className="stat-label">{translate("Paid so far")}<Check size={17} />
          </div>
          <div className="stat-value">{money(paid)}</div>
          <p>{translate("Recorded payments for") + " "}{year}{" " + translate("bills")}</p>
        </div>
        <div className="stat-card soft-green">
          <div className="stat-label">{translate("Recurring monthly equivalent")}<TrendingUp size={17} />
          </div>
          <div className="stat-value">{money(recurring)}</div>
          <p>{translate("Current recurring bills · annual costs ÷ 12")}</p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{translate("The year in review")}</h2>
            <p>{translate("Your scheduled expenses and recorded payments, month by month")}</p>
          </div>
          <div className="chart-legend">
            <span>
              <i />{translate("Planned")}</span>
            <span>
              <i />{translate("Paid")}</span>
          </div>
        </div>
        <div className="annual-chart">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={points} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                tickFormatter={(v) => compactMoney(Number(v))}
              />
              <Tooltip
                formatter={(v) => money(Number(v))}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                }}
              />
              <Bar
                dataKey="planned"
                name={translate("Planned")}
                fill="var(--color-chart-planned)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="paid"
                name={translate("Paid")}
                fill="var(--color-chart-paid)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel annual-bills">
        <div className="panel-heading">
          <div>
            <h2>{translate("Annual bills")}</h2>
            <p>{translate("Annual bills, with a monthly amount you can set aside")}</p>
          </div>
        </div>
        {annual.map((e) => (
          <div className="income-row" key={e.id}>
            <CategoryIcon category={e.category} />
            <div>
              <strong>{e.name}</strong>
              <small>{translate("Due") + " "}{dateLabel(e.due)}{" " + translate("each year")}</small>
            </div>
            <div className="annual-amount">
              <strong>{money(e.amount)}{" " + translate("/ year")}</strong>
              <small>{translate("Set aside") + " "}{money(e.amount / 12)}{" " + translate("/ month")}</small>
            </div>
          </div>
        ))}
        {!annual.length && (
          <div className="empty-state">
            <p>{translate("No annual expenses yet. Add a yearly bill on the Expenses page.")}</p>
            <Link to="/expenses" className="button secondary small">{translate("Manage expenses")}<ArrowUpRight size={14} />
            </Link>
          </div>
        )}
      </section>
    </section>
  );
}
