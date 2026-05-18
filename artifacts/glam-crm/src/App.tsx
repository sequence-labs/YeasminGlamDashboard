import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import NewClient from "@/pages/new-client";
import ClientDetail from "@/pages/client-detail";
import Bookings from "@/pages/bookings";
import NewBooking from "@/pages/new-booking";
import BookingDetail from "@/pages/booking-detail";
import ContractView from "@/pages/contract-view";
import Services from "@/pages/services";
import Artist from "@/pages/artist";
import ContractTemplates from "@/pages/contract-templates";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      
      <Route path="/clients" component={Clients} />
      <Route path="/clients/new" component={NewClient} />
      <Route path="/clients/:id" component={ClientDetail} />
      
      <Route path="/bookings" component={Bookings} />
      <Route path="/bookings/new" component={NewBooking} />
      <Route path="/bookings/:id" component={BookingDetail} />
      <Route path="/bookings/:id/contract" component={ContractView} />

      <Route path="/services" component={Services} />
      <Route path="/artist" component={Artist} />
      <Route path="/contract-templates" component={ContractTemplates} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
