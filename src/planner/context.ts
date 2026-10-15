import { createContext, useContext } from "react";
import type { Data } from "./model";

export type FinanceState = {
  data: Data;
  update: (fn: (data: Data) => Data) => void;
  ready: boolean;
  error: string;
  clearDemo: () => void;
};

export const FinanceContext = createContext<FinanceState | null>(null);

export function useFinance(): FinanceState {
  const state = useContext(FinanceContext);
  if (!state) throw new Error("Finance pages must be wrapped in FinanceProvider.");
  return state;
}
