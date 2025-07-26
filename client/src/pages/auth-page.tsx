import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loginSchema, createUserSchema, type LoginData, type CreateUserData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, LogIn, UserPlus, Shield, Lock } from "lucide-react";

export default function AuthPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("login");

  // Login form
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Create user form
  const createUserForm = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "regular",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${user.firstName}!`,
      });
      window.location.reload();
    },
    onError: (error: any) => {
      let errorMessage = "Credenciais inválidas";
      if (error.message?.includes("401")) {
        errorMessage = "Email ou senha incorretos";
      } else if (error.message?.includes("400")) {
        errorMessage = "Dados inválidos. Verifique os campos";
      } else if (error.message?.includes("500")) {
        errorMessage = "Erro interno do servidor. Tente novamente";
      }
      
      toast({
        title: "Erro no login",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await apiRequest("POST", "/api/register", data);
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Conta criada com sucesso!",
        description: `Bem-vindo, ${user.firstName}! Sua conta foi criada e você já está logado.`,
      });
      window.location.reload();
      createUserForm.reset();
    },
    onError: (error: any) => {
      let errorMessage = "Erro ao criar conta. Tente novamente.";
      
      if (error.message?.includes("Este email já está cadastrado")) {
        errorMessage = "Este email já está cadastrado. Tente fazer login ou use outro email.";
      } else if (error.message?.includes("Dados inválidos")) {
        errorMessage = "Verifique se todos os campos foram preenchidos corretamente.";
      } else if (error.message?.includes("400")) {
        errorMessage = "Dados inválidos. Verifique os campos obrigatórios.";
      } else if (error.message?.includes("500")) {
        errorMessage = "Erro interno do servidor. Tente novamente em alguns minutos.";
      }
      
      toast({
        title: "Erro ao criar conta",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onCreateUser = (data: CreateUserData) => {
    createUserMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <Users className="text-white text-2xl" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Gerenciamento</h2>
          <p className="text-gray-600">Faça login ou crie uma nova conta</p>
        </div>
        
        <Card className="bg-white shadow-xl border border-gray-100">
          <CardContent className="py-8 px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center space-x-2">
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </TabsTrigger>
                <TabsTrigger value="create" className="flex items-center space-x-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Criar Usuário</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      {...loginForm.register("email")}
                      className="mt-1"
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      {...loginForm.register("password")}
                      className="mt-1"
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-600 mt-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit"
                    className="w-full py-3 px-4 text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <LogIn className="mr-2 h-4 w-4" />
                    )}
                    Entrar
                  </Button>
                </form>
                

              </TabsContent>
              
              <TabsContent value="create" className="space-y-4 mt-6">
                <form onSubmit={createUserForm.handleSubmit(onCreateUser)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nome</Label>
                      <Input
                        id="firstName"
                        {...createUserForm.register("firstName")}
                        className="mt-1"
                      />
                      {createUserForm.formState.errors.firstName && (
                        <p className="text-sm text-red-600 mt-1">
                          {createUserForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="lastName">Sobrenome</Label>
                      <Input
                        id="lastName"
                        {...createUserForm.register("lastName")}
                        className="mt-1"
                      />
                      {createUserForm.formState.errors.lastName && (
                        <p className="text-sm text-red-600 mt-1">
                          {createUserForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="create-email">Email</Label>
                    <Input
                      id="create-email"
                      type="email"
                      {...createUserForm.register("email")}
                      className="mt-1"
                    />
                    {createUserForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {createUserForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="create-password">Senha</Label>
                    <Input
                      id="create-password"
                      type="password"
                      {...createUserForm.register("password")}
                      className="mt-1"
                    />
                    {createUserForm.formState.errors.password && (
                      <p className="text-sm text-red-600 mt-1">
                        {createUserForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  
                  {/* Role is always 'regular' for public registration */}
                  
                  <Button 
                    type="submit"
                    className="w-full py-3 px-4 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Criar Usuário
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}