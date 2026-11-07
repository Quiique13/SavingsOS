import { useContext } from "react";
import { FinanceContext, type FinanceState } from "../context/FinanceContext";

export function useFinance(): FinanceState {
  const state = useContext(FinanceContext);
  if (!state)
    throw new Error("Finance pages must be wrapped in FinanceProvider.");
  return state;
}
