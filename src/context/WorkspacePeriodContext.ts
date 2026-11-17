import { createContext } from "react";

// Pages keep owning their selected month; the shell supplies its visual position.
export const WorkspacePeriodContext = createContext<HTMLElement | null>(null);
