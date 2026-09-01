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
import EditBooking from "@/pages/edit-booking";
import ContractRoute from "@/pages/contract-route";
import Services from "@/pages/services";
import Artist from "@/pages/artist";
import ContractTemplates from "@/pages/contract-templates";
import AssistantAgreements from "@/pages/assistant-agreements";
import AssistantAgreementLibrary from "@/pages/assistant-agreement-library";
import CalendarPage from "@/pages/calendar";
import ExpensesPage from "@/pages/expenses";
import PortalPage from "@/pages/portal";
import AddonApprovalPage from "@/pages/addon-approval";
import AddonMenuPage from "@/pages/addon-menu";
import UpgradeMenuView from "@/pages/upgrade-menu-view";
import ServiceMenusPage from "@/pages/service-menus";
import WebsiteStudioPage from "@/pages/website-studio";

const queryClient = new QueryClient();

const PUBLIC_PATH_PREFIXES = ["/p/", "/a/", "/a-menu/"];

function PublicSwitch() {
  return (
    <Switch>
      <Route path="/p/:token" component={PortalPage} />
      <Route path="/a/:token" component={AddonApprovalPage} />
      <Route path="/a-menu/:shareToken" component={AddonMenuPage} />
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
      <Route path="/bookings/:id/edit" component={EditBooking} />
      <Route path="/bookings/:id/contract" component={ContractRoute} />
      <Route path="/bookings/:id/upgrade-menu" component={UpgradeMenuView} />
      <Route path="/bookings/:id" component={BookingDetail} />

      <Route path="/services" component={Services} />
      <Route path="/service-menus" component={ServiceMenusPage} />
      <Route path="/website-studio" component={WebsiteStudioPage} />
      <Route path="/artist" component={Artist} />
      <Route path="/contracts" component={ContractTemplates} />
      <Route path="/contract-templates" component={ContractTemplates} />
      <Route path="/assistant-agreements/new" component={AssistantAgreements} />
      <Route path="/assistant-agreements/:id" component={AssistantAgreements} />
      <Route path="/assistant-agreements" component={AssistantAgreementLibrary} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/expenses" component={ExpensesPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function PublicGate({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") return <>{children}</>;
  const path = window.location.pathname.replace(import.meta.env.BASE_URL.replace(/\/$/, ""), "");
  if (PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
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
