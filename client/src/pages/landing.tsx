import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Shield, Coins, BarChart } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <Users className="text-white text-2xl" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Gerenciamento</h2>
          <p className="text-gray-600">Faça login para acessar o painel administrativo</p>
        </div>
        
        <Card className="bg-white shadow-xl border border-gray-100">
          <CardContent className="py-8 px-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900">Gerenciar Usuários</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Coins className="mx-auto h-8 w-8 text-green-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900">Controle de Créditos</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Shield className="mx-auto h-8 w-8 text-purple-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900">Segurança</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <BarChart className="mx-auto h-8 w-8 text-orange-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900">Relatórios</p>
                </div>
              </div>
              
              <Button 
                onClick={handleLogin}
                className="w-full py-3 px-4 text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Shield className="mr-2 h-4 w-4" />
                Entrar com Replit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
