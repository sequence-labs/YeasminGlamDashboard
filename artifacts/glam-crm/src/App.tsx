import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthGate } from "@/components/AuthGate";

import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import NewClient from "@/pages/new-client";
import ClientDetail from "@/pages/client-detail";
import Bookings from "@/pages/bookings";
import NewBooking from "@/pages/new-booking";
import BookingDetail from "@/pages/booking-detail";
import ContractRoute from "@/pages/contract-route";
import Services from "@/pages/services";
import Artist from "@/pages/artist";
import ContractTemplates from "@/pages/contract-templates";
import CalendarPage from "@/pages/calendar";
import ExpensesPage from "@/pages/expenses";
import PortalPage from "@/pages/portal";

const queryClient = new QueryClient();

function PublicSwitch() {
  return (
    <Switch>
      <Route path="/p/:token" component={PortalPage} />
    </Switch>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />

      <Route path="/clients" component={Clients} />
      <Route path="/clients/new" component={NewClient} />
      <Route path="/clients/:id" component={ClientDetail} />

      <Route path="/bookings" component={Bookings} />
      <Route path="/bookings/new" component={NewBooking} />
      <Route path="/bookings/:id" component={BookingDetail} />
      <Route path="/bookings/:id/contract" component={ContractRoute} />

      <Route path="/services" component={Services} />
      <Route path="/artist" component={Artist} />
      <Route path="/contracts" component={ContractTemplates} />
      <Route path="/contract-templates" component={ContractTemplates} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/expenses" component={ExpensesPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function PublicGate({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") return <>{children}</>;
  const path = window.location.pathname.replace(import.meta.env.BASE_URL.replace(/\/$/, ""), "");
  if (path.startsWith("/p/")) {
    return (
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <PublicSwitch />
      </WouterRouter>
    );
  }
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PublicGate>
        <AuthGate>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRoutes />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthGate>
      </PublicGate>
    </QueryClientProvider>
  );
}

export default App;
