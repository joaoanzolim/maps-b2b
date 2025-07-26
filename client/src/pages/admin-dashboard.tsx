import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import CreditModal from "@/components/credit-modal";
import BlockUserModal from "@/components/block-user-modal";
import {
  Users,
  UserCheck,
  UserX,
  Coins,
  Search,
  Plus,
  Edit,
  Ban,
  Unlock,
  BarChart3,
  Menu,
  LogOut,
} from "lucide-react";
import type { User } from "@shared/schema";

export default function AdminDashboard() {
  const { user: currentUser, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && currentUser && currentUser.role !== "admin") {
      toast({
        title: "Acesso Negado",
        description: "Você precisa ser um administrador para acessar esta página.",
        variant: "destructive",
      });
      window.location.href = "/";
    }
  }, [currentUser, isLoading, toast]);

  // Fetch users data
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!currentUser && currentUser.role === "admin",
    retry: false,
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ["/api/users/stats"],
    enabled: !!currentUser && currentUser.role === "admin",
    retry: false,
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/users/${userId}/block`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      setBlockModalOpen(false);
      toast({
        title: "Usuário Bloqueado",
        description: "O usuário foi bloqueado com sucesso.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao bloquear usuário.",
        variant: "destructive",
      });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/users/${userId}/unblock`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      toast({
        title: "Usuário Desbloqueado",
        description: "O usuário foi desbloqueado com sucesso.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao desbloquear usuário.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((user: User) =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (user: User) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const handleBlockUser = (user: User) => {
    setSelectedUser(user);
    setBlockModalOpen(true);
  };

  const handleEditCredits = (user: User) => {
    setSelectedUser(user);
    setCreditModalOpen(true);
  };

  const confirmBlockUser = () => {
    if (selectedUser) {
      blockUserMutation.mutate(selectedUser.id);
    }
  };

  const handleUnblockUser = (user: User) => {
    unblockUserMutation.mutate(user.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex items-center justify-center h-16 bg-blue-600">
          <div className="flex items-center space-x-2">
            <Users className="text-white text-xl" />
            <span className="text-white text-lg font-semibold">Admin Panel</span>
          </div>
        </div>
        
        <nav className="mt-8">
          <div className="px-4 space-y-2">
            <a href="#" className="bg-blue-50 text-blue-700 group flex items-center px-4 py-3 text-sm font-medium rounded-lg">
              <BarChart3 className="mr-3 h-5 w-5 text-blue-500" />
              Dashboard
            </a>
            <a href="#" className="text-gray-700 hover:bg-gray-50 group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors">
              <Users className="mr-3 h-5 w-5 text-gray-400" />
              Gerenciar Usuários
            </a>
            <a href="#" className="text-gray-700 hover:bg-gray-50 group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors">
              <Coins className="mr-3 h-5 w-5 text-gray-400" />
              Créditos
            </a>
            <a href="#" className="text-gray-700 hover:bg-gray-50 group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors">
              <BarChart3 className="mr-3 h-5 w-5 text-gray-400" />
              Relatórios
            </a>
          </div>
          
          <div className="mt-auto absolute bottom-4 left-4 right-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={currentUser.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    {getInitials(currentUser)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentUser.firstName} {currentUser.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="mt-3 w-full text-left text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <LogOut className="inline mr-2 h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 lg:mx-auto bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden -ml-0.5 -mt-0.5"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-6 w-6" />
                </Button>
                <h1 className="ml-4 lg:ml-0 text-2xl font-semibold text-gray-900">Gerenciamento de Usuários</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">
                  <Users className="inline mr-2 h-4 w-4" />
                  {stats?.totalUsers || 0} usuários
                </div>
                <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-medium">
                  <Coins className="inline mr-2 h-4 w-4" />
                  {stats?.totalCredits || 0} créditos
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total de Usuários</dt>
                        <dd className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserCheck className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Usuários Ativos</dt>
                        <dd className="text-2xl font-bold text-gray-900">{stats?.activeUsers || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserX className="h-8 w-8 text-red-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Usuários Bloqueados</dt>
                        <dd className="text-2xl font-bold text-gray-900">{stats?.blockedUsers || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Coins className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total de Créditos</dt>
                        <dd className="text-2xl font-bold text-gray-900">{stats?.totalCredits || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Usuários do Sistema</h3>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Buscar usuários..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Créditos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data de Cadastro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user: User) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <Avatar>
                                <AvatarImage src={user.profileImageUrl || undefined} />
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-sm">
                                  {getInitials(user)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={user.status === "active" ? "default" : "destructive"}
                            className={user.status === "active" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                          >
                            {user.status === "active" ? "Ativo" : "Bloqueado"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Coins className="text-yellow-500 mr-2 h-4 w-4" />
                            <span className="text-sm font-medium text-gray-900">{user.credits}</span>
                            <span className="text-xs text-gray-500 ml-1">/ {user.creditLimit}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCredits(user)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Coins className="mr-1 h-4 w-4" />
                            Créditos
                          </Button>
                          {user.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBlockUser(user)}
                              className="text-red-600 hover:text-red-900"
                              disabled={blockUserMutation.isPending}
                            >
                              <Ban className="mr-1 h-4 w-4" />
                              Bloquear
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnblockUser(user)}
                              className="text-green-600 hover:text-green-900"
                              disabled={unblockUserMutation.isPending}
                            >
                              <Unlock className="mr-1 h-4 w-4" />
                              Desbloquear
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredUsers.length === 0 && !usersLoading && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery ? "Tente ajustar sua busca." : "Ainda não há usuários cadastrados."}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modals */}
      <CreditModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        user={selectedUser}
      />
      
      <BlockUserModal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        user={selectedUser}
        onConfirm={confirmBlockUser}
        isLoading={blockUserMutation.isPending}
      />
    </div>
  );
}
