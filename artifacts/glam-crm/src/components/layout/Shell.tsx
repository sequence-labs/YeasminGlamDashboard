import { Sidebar } from "./Sidebar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-shell relative flex min-h-dvh flex-col overflow-x-hidden md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="crm-mobile-main mx-auto w-full max-w-[1400px] px-5 py-6 sm:px-8 md:px-10 md:py-10 lg:px-14">
          <div className="crm-fade-up">{children}</div>
        </div>
      </main>
    </div>
  );
}
