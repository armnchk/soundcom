import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NicknameModal } from "@/components/modals/nickname-modal";
import { useNicknameModal } from "@/hooks/useNicknameModal";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Release from "@/pages/release";
import Artist from "@/pages/artist";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import Search from "@/pages/search";

function Router() {

  return (
    <Switch>
      {/* Public routes - accessible to everyone */}
      <Route path="/release/:id" component={Release} />
      <Route path="/artist/:id" component={Artist} />
      <Route path="/search" component={Search} />
      
        <Route path="/" component={Home} />
        <Route path="/profile/:id?" component={Profile} />
        <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { showNicknameModal, closeModal, isRequired } = useNicknameModal();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background dark">
        <Toaster />
        <Router />
        <NicknameModal 
          open={showNicknameModal} 
          onClose={closeModal}
          isRequired={isRequired}
        />
      </div>
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
