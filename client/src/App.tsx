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
import { useState, useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentComponent, setCurrentComponent] = useState<JSX.Element | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Se ainda está carregando e não foi inicializado, não muda nada
    if (isLoading && !isInitialized) {
      return;
    }

    // Marca como inicializado na primeira vez que não está carregando
    if (!isLoading && !isInitialized) {
      setIsInitialized(true);
    }

    // Determina qual componente renderizar
    let nextComponent: JSX.Element;

    if (!isAuthenticated) {
      nextComponent = <AuthPage />;
    } else if (user?.status === "blocked") {
      nextComponent = <BlockedUserPage />;
    } else {
      nextComponent = (
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/" component={HomePage} />
          <Route component={NotFound} />
        </Switch>
      );
    }

    setCurrentComponent(nextComponent);
  }, [isAuthenticated, user, isLoading, isInitialized]);

  // Se ainda não foi inicializado e está carregando, mostra a primeira tela sem flash
  if (!isInitialized && isLoading) {
    return <AuthPage />;
  }

  // Renderiza o componente atual ou AuthPage como fallback
  return currentComponent || <AuthPage />;
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
