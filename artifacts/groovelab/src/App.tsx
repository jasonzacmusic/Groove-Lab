import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import { AudioEngineProvider } from "@/context/AudioEngineContext";
import { ThemeProvider } from "next-themes";

import Home from "@/pages/Home";
import Sequencer from "@/pages/Sequencer";
import Explore from "@/pages/Explore";
import Midi from "@/pages/Midi";
import Chords from "@/pages/Chords";
import Standards from "@/pages/Standards";
import Live from "@/pages/Live";
import Practice from "@/pages/Practice";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/explore" component={Explore} />
        <Route path="/sequencer" component={Sequencer} />
        <Route path="/midi" component={Midi} />
        <Route path="/chords" component={Chords} />
        <Route path="/standards" component={Standards} />
        <Route path="/live" component={Live} />
        <Route path="/practice" component={Practice} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AudioEngineProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AudioEngineProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
