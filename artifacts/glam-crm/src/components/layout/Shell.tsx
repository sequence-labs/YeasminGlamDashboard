import { Sidebar } from "./Sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-shell flex min-h-dvh flex-col overflow-x-hidden md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="crm-mobile-main mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 md:px-8 md:py-8 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
