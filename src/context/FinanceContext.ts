import { createContext } from "react";
import { type Data } from "../types/finance";
export type FinanceState = {
  data: Data;
  update: (fn: (data: Data) => Data) => void;
  save: (fn: (data: Data) => Data) => Promise<void>;
  ready: boolean;
  error: string;
  clearDemo: () => void;
};
export const FinanceContext = createContext<FinanceState | null>(null);
