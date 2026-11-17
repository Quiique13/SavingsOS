import { createContext, useContext } from "react";
export const DemoContext = createContext<{ reset: () => void } | null>(null);
export const useDemo = () => useContext(DemoContext);
