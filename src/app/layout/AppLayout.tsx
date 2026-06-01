import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex">
        <Sidebar />

        <main className="min-h-screen flex-1 pb-20 md:pb-0">
          <Header />

          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
