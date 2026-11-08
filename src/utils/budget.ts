import type { Data } from "../types/finance";
import { getRows, shiftMonth } from "./finance";

const cents = (amount: number) => Math.round(amount * 100);

// Receipt dates remain factual; each receipt funds the following calendar month.
export const incomeBudgetMonth = (date: string) => shiftMonth(date.slice(0, 7), 1);

export function getMonthlyBudget(data: Data, month: string) {
  const incomeMonth = shiftMonth(month, -1);
  const incomeEntries = data.income.filter(entry => entry.date.startsWith(incomeMonth));
  const expenses = getRows(data, month);
  const income = incomeEntries.reduce((total, entry) => total + cents(entry.amount), 0);
  const planned = expenses.reduce((total, entry) => total + cents(entry.amount), 0);
  const paid = expenses.filter(entry => entry.paidDate).reduce((total, entry) => total + cents(entry.amount), 0);
  return {
    incomeMonth, incomeEntries, expenses,
    income: income / 100, planned: planned / 100, paid: paid / 100,
    unpaid: (planned - paid) / 100,
    leftAfterExpenses: (income - planned) / 100,
  };
}

export type MonthlyScenario = {
  income: number;
  extraIncome: number;
  extraSpending: number;
  carryover: number;
};

export function simulateMonth(plannedExpenses: number, scenario: MonthlyScenario) {
  const values = [plannedExpenses, scenario.income, scenario.extraIncome, scenario.extraSpending, scenario.carryover];
  if (values.some(value => !Number.isFinite(value) || !Number.isSafeInteger(cents(value)) || Math.abs(value * 100 - cents(value)) > 0.000001) ||
    [plannedExpenses, scenario.income, scenario.extraIncome, scenario.extraSpending].some(value => value < 0)) return null;
  const available = cents(scenario.income) + cents(scenario.extraIncome) + cents(scenario.carryover);
  const spending = cents(plannedExpenses) + cents(scenario.extraSpending);
  const left = available - spending;
  if (![available, spending, left].every(Number.isSafeInteger)) return null;
  return { available: available / 100, spending: spending / 100, left: left / 100 };
}
