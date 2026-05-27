import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex">
        <Sidebar />

        <main className="min-h-screen flex-1">
          <Header />

          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
