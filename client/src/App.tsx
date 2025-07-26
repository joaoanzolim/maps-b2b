import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import HomePage from "@/pages/home-page";
import BlockedUserPage from "@/pages/blocked-user-page";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Durante o carregamento inicial, mostrar uma div vazia para manter a estrutura
  if (isLoading) {
    return <div className="min-h-screen bg-gray-50"></div>;
  }

  // Se usuário não está autenticado, sempre mostrar AuthPage
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Se usuário está bloqueado, sempre mostrar BlockedUserPage
  if (user?.status === "blocked") {
    return <BlockedUserPage />;
  }

  // Para usuários autenticados e ativos, mostrar roteamento normal
  return (
    <Switch>
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/" component={HomePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen transition-all duration-0">
          <Router />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
