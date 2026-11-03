import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { UserGate } from "./components/users/UserGate";
import { ThemeProvider } from "./context/ThemeProvider";
import { UsersProvider } from "./context/UsersProvider";
import { Expenses } from "./pages/Expenses";
import { Settings } from "./pages/Settings";

const Overview = lazy(() =>
  import("./pages/Overview").then((module) => ({ default: module.Overview })),
);
const Accounts = lazy(() =>
  import("./pages/Accounts").then((module) => ({ default: module.Accounts })),
);
const Income = lazy(() =>
  import("./pages/Income").then((module) => ({ default: module.IncomePage })),
);
const Insights = lazy(() =>
  import("./pages/Insights").then((module) => ({ default: module.Insights })),
);
const Transfers = lazy(() =>
  import("./pages/Transfers").then((module) => ({ default: module.Transfers })),
);
const AdminPortal = lazy(() =>
  import("./pages/admin/AdminPortal").then((module) => ({
    default: module.AdminPortal,
  })),
);

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="loading-state">
          <p>Opening your space...</p>
        </div>
      }
    >
      <Routes>
        <Route path="/admin" element={<AdminPortal />} />
        <Route
          element={
            <UserGate>
              <AppLayout />
            </UserGate>
          }
        >
          <Route index element={<Navigate to="/expenses" replace />} />
          <Route path="dashboard" element={<Overview />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="income" element={<Income />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="transfers" element={<Transfers />} />
          <Route path="savings" element={<Accounts savings />} />
          <Route
            path="investments"
            element={<Navigate to="/savings" replace />}
          />
          <Route path="insights" element={<Insights />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/expenses" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
export default function App() {
  return (
    <ThemeProvider>
      <UsersProvider>
        <AppRoutes />
      </UsersProvider>
    </ThemeProvider>
  );
}
