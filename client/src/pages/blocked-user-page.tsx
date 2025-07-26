import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, LogOut, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function BlockedUserPage() {
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Força o redirecionamento mesmo se houver erro
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-600 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="text-white text-2xl" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Acesso Bloqueado</h2>
          <p className="text-gray-600">Sua conta foi temporariamente suspensa</p>
        </div>
        
        <Card className="bg-white shadow-xl border border-gray-100">
          <CardContent className="py-8 px-6">
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2 text-red-700 mb-3">
                    <Shield className="h-5 w-5" />
                    <h3 className="font-semibold">Conta Bloqueada</h3>
                  </div>
                  <p className="text-sm text-red-600 text-center">
                    Seu usuário está bloqueado e não pode acessar o sistema no momento.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">O que fazer agora?</h4>
                  <p className="text-sm text-blue-700">
                    Entre em contato com o administrador do sistema para resolver esta situação e reativar sua conta.
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={handleLogout}
                className="w-full py-3 px-4 text-sm font-medium rounded-xl text-white bg-gray-600 hover:bg-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                data-testid="button-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Fazer Logout
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Se você acredita que isso é um erro, entre em contato com o suporte técnico.
          </p>
        </div>
      </div>
    </div>
  );
}