import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./app/layout/AppLayout";
import { DashboardPage } from "./pages/Dashboard/DashboardPage";
import { AccountsPage } from "./pages/Accounts/AccountsPage";
import { ExpensesPage } from "./pages/Expenses/ExpensesPage";
import { IncomePage } from "./pages/Income/IncomePage";
import { SettingsPage } from "./pages/Settings/SettingsPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
