import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { UserGate } from "./components/users/UserGate";
import { ThemeProvider } from "./context/ThemeProvider";
import { Expenses } from "./pages/Expenses";
import { Settings } from "./pages/Settings";
import { LanguageSync } from "./components/common/LanguageSync";
import { NativeControls } from "./components/common/NativeControls";
import { useLanguage } from "./i18n";
import { CurrencySync } from "./components/common/CurrencySync";
import { useCurrency } from "./utils/currency";
import { SuccessProvider } from "./context/SuccessProvider";
import { AuthenticationProvider } from "./context/AuthenticationProvider";
import { DemoProvider } from "./context/DemoProvider";
import { AdminPortal } from "./pages/admin/AdminPortal";

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
const Simulator = lazy(() =>
  import("./pages/Simulator").then((module) => ({ default: module.Simulator })),
);
const Profile = lazy(() =>
  import("./pages/Profile").then((module) => ({ default: module.Profile })),
);

export function AppRoutes({demo = false}: {demo?:boolean} = {}) {
  useLanguage();
  useCurrency();
  return (
    <>
      <LanguageSync />
      <CurrencySync />
      <NativeControls />
      <SuccessProvider>
        <Routes>
          <Route path="/admin" element={demo ? <Navigate to="/dashboard" replace /> : <AdminPortal />} />
          <Route
            element={
              <UserGate>
                <AppLayout />
              </UserGate>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
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
            <Route path="simulator" element={<Simulator />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </SuccessProvider>
    </>
  );
}
export default function App({demo=false}: {demo?:boolean}) {
  return (
    <ThemeProvider>
        {demo ? <DemoProvider><AppRoutes demo /></DemoProvider> : <AuthenticationProvider><AppRoutes /></AuthenticationProvider>}
    </ThemeProvider>
  );
}
