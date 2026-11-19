import { createContext, useContext } from "react";

export const SuccessContext = createContext<(message: string) => void>(() => {});
export const useSuccess = () => useContext(SuccessContext);
