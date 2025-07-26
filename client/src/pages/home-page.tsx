import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Search, Loader2, History, LogOut, Coins, Download, Clock, RefreshCw, Menu, Settings, BarChart3 } from "lucide-react";
import UserSettings from "@/components/user-settings";
import type { Search as SearchType } from "@shared/schema";
import { API_CONFIG } from "@shared/config";

// Schema for form validation
const searchSchema = z.object({
  address: z.string().min(1, "Campo obrigatório"),
  segment: z.string().max(75, "Máximo 75 caracteres").min(1, "Campo obrigatório"),
});

type SearchData = z.infer<typeof searchSchema>;

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado: string;
  regiao: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export default function HomePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchType, setSearchType] = useState<"cep" | "endereco">("cep");
  const [cepData, setCepData] = useState<ViaCepResponse | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<number>(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("b2b");

  const form = useForm<SearchData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      address: "",
      segment: "",
    },
  });

  // Fetch user searches (removed automatic polling)
  const { data: searches = [], isLoading: searchesLoading, refetch: refetchSearches } = useQuery<SearchType[]>({
    queryKey: ["/api/searches"],
    enabled: !!user,
    retry: false,
  });

  // Fetch search cost setting
  const { data: searchCost = 10, isLoading: searchCostLoading } = useQuery<number>({
    queryKey: ["/api/settings/search-cost"],
    enabled: !!user,
    retry: false,
  });

  // Format CEP mask
  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  // Search CEP via ViaCEP API
  const searchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado e tente novamente.",
          variant: "destructive",
        });
        setCepData(null);
        return;
      }

      setCepData(data);
      
      toast({
        title: "CEP encontrado",
        description: "Endereço carregado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar o CEP. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Handle address input change
  const handleAddressChange = (value: string) => {
    if (searchType === "cep") {
      const formatted = formatCep(value);
      form.setValue("address", formatted);
      
      // Auto-search when CEP is complete
      const numbers = value.replace(/\D/g, "");
      if (numbers.length === 8) {
        searchCep(formatted);
      }
    } else {
      form.setValue("address", value);
    }
  };

  // Toggle between CEP and address
  const toggleSearchType = (type: "cep" | "endereco") => {
    setSearchType(type);
    form.setValue("address", "");
    setCepData(null);
  };

  // Update status function for unfinished searches
  const updateSearchStatuses = async () => {
    const now = Date.now();
    
    // Check if 30 seconds have passed since last update
    if (now - lastStatusUpdate < 30000) {
      const remainingSeconds = Math.ceil((30000 - (now - lastStatusUpdate)) / 1000);
      toast({
        title: "Aguarde",
        description: `Você pode atualizar novamente em ${remainingSeconds} segundos.`,
        variant: "destructive",
      });
      return;
    }

    // Get unfinished search IDs
    const unfinishedSearches = searches.filter(search => {
      if (search.finalizado) return false;
      
      const searchDate = new Date(search.createdAt || new Date());
      const hoursDiff = (now - searchDate.getTime()) / (1000 * 60 * 60);
      
      // Don't check searches older than 6 hours
      return hoursDiff <= 6;
    });

    if (unfinishedSearches.length === 0) {
      toast({
        title: "Nenhuma busca pendente",
        description: "Todas as buscas foram finalizadas ou expiraram.",
      });
      return;
    }

    setIsUpdatingStatus(true);
    setLastStatusUpdate(now);

    try {
      const searchIds = unfinishedSearches.map(search => search.searchId).join(',');
      
      const response = await fetch(
        `${API_CONFIG.STATUS_UPDATE_URL}?id=${searchIds}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${API_CONFIG.BEARER_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Falha ao atualizar status");
      }

      // Refresh searches data
      queryClient.invalidateQueries({ queryKey: ["/api/searches"] });
      
      toast({
        title: "Status atualizado",
        description: "Status das buscas foi atualizado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar o status. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Download function for completed searches
  const downloadSearchResults = async (search: SearchType) => {
    setIsDownloading(search.id);
    try {
      const response = await fetch(
        `${API_CONFIG.DOWNLOAD_URL}?id=${search.searchId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${API_CONFIG.BEARER_TOKEN}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error("Falha ao baixar o arquivo");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Format filename: [SEGMENTO] - Endereço Completo - DD-MM-YYYY
      const date = new Date(search.createdAt || new Date());
      const formattedDate = date.toLocaleDateString("pt-BR").replace(/\//g, "-");
      link.download = `${search.segment} - ${search.address} - ${formattedDate}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download realizado",
        description: "Arquivo baixado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (data: SearchData) => {
      // Check if user has enough credits (except for admin)
      if (!user || (user.role !== "admin" && user.credits < searchCost)) {
        throw new Error("Créditos insuficientes para realizar a busca");
      }

      // Determine the address to send
      let addressToSend = data.address;
      if (searchType === "cep" && cepData) {
        addressToSend = `${cepData.logradouro}, ${cepData.bairro}, ${cepData.localidade}, ${cepData.uf} - Brasil`;
      }

      const payload = {
        endereco: addressToSend,
        query: data.segment,
        cep: searchType === "cep" ? data.address.replace(/\D/g, "") : "",
      };

      const response = await fetch(
        API_CONFIG.SEARCH_URL,
        {
          method: "POST",
          headers: API_CONFIG.HEADERS,
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Falha na busca");
      }

      const result = await response.json();
      
      if (result.success) {
        // Record search in database
        await apiRequest("POST", "/api/searches", {
          searchId: result.id,
          address: addressToSend,
          segment: data.segment,
          creditsUsed: user.role === "admin" ? 0 : searchCost,
        });
      }

      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        // Reset form inputs
        form.reset({
          address: "",
          segment: "",
        });
        setCepData(null);
        
        queryClient.invalidateQueries({ queryKey: ["/api/searches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        toast({
          title: "Busca iniciada com sucesso",
          description: `Busca iniciada! ${searchCost} créditos foram utilizados. Acompanhe o progresso no histórico.`,
        });
      } else {
        toast({
          title: "Erro na busca",
          description: "A busca não foi bem-sucedida.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro na busca",
        description: error.message || "Não foi possível realizar a busca.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SearchData) => {
    searchMutation.mutate(data);
  };

  // Helper function to get user initials
  const getInitials = (user: any) => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/auth";
    }
  };

  // Render B2B Content (main functionality)
  const renderB2BContent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">B2B - Extrair Dados</h2>
        <p className="text-gray-600">Busque e extraia dados de estabelecimentos por localização</p>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">Realizar Busca</TabsTrigger>
          <TabsTrigger value="history">Histórico de Buscas</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          {user && user.role !== "admin" && user.credits < searchCost && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-red-700">
                  <Coins className="h-5 w-5" />
                  <p className="font-medium">
                    Créditos insuficientes! Você precisa de pelo menos {searchCost} créditos para realizar uma busca.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Search Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar Estabelecimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Search Type Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo de busca</label>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={searchType === "cep" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSearchType("cep");
                            form.setValue("address", "");
                            setCepData(null);
                          }}
                          data-testid="button-searchType-cep"
                        >
                          Buscar por CEP
                        </Button>
                        <Button
                          type="button"
                          variant={searchType === "endereco" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSearchType("endereco");
                            form.setValue("address", "");
                            setCepData(null);
                          }}
                          data-testid="button-searchType-endereco"
                        >
                          Buscar por Endereço
                        </Button>
                      </div>
                    </div>

                    {/* Address Input */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {searchType === "cep" ? "CEP" : "Endereço completo"}
                          </FormLabel>
                          <FormControl>
                            <div className="flex space-x-2">
                              <Input
                                placeholder={
                                  searchType === "cep"
                                    ? "Ex: 01310-100"
                                    : "Ex: Av. Paulista, 1000, São Paulo, SP"
                                }
                                {...field}
                                value={searchType === "cep" ? formatCep(field.value) : field.value}
                                onChange={(e) => {
                                  const value = searchType === "cep" ? formatCep(e.target.value) : e.target.value;
                                  field.onChange(value);
                                }}
                                data-testid="input-address"
                              />
                              {searchType === "cep" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => searchCep(field.value)}
                                  disabled={isSearchingCep || field.value.replace(/\D/g, "").length !== 8}
                                  data-testid="button-searchCep"
                                >
                                  {isSearchingCep ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MapPin className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Segment Input */}
                    <FormField
                      control={form.control}
                      name="segment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segmento / Tipo de Negócio</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: restaurantes, farmácias, academias..."
                              {...field}
                              data-testid="input-segment"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {user && user.role !== "admin" && (
                          <p>Custo: {searchCost} créditos por busca</p>
                        )}
                      </div>
                      <Button 
                        type="submit" 
                        disabled={searchMutation.isPending || (user && user.role !== "admin" && user.credits < searchCost)}
                        data-testid="button-submit"
                      >
                        {searchMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Iniciar Busca
                          </>
                        )}
                      </Button>
                    </div>

                    {user && user.role !== "admin" && user.credits < searchCost && (
                      <p className="text-sm text-red-600 mt-2">
                        Créditos insuficientes. Você possui {user.credits} créditos.
                      </p>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* CEP Data */}
            {cepData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Dados do CEP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        CEP: {cepData.cep}
                      </Badge>
                      <p className="text-sm font-medium">
                        {cepData.logradouro}, {cepData.bairro}, {cepData.localidade}, {cepData.uf} - Brasil
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium">Estado:</span> {cepData.estado}
                      </div>
                      <div>
                        <span className="font-medium">Região:</span> {cepData.regiao}
                      </div>
                      <div>
                        <span className="font-medium">DDD:</span> {cepData.ddd}
                      </div>
                      <div>
                        <span className="font-medium">IBGE:</span> {cepData.ibge}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Buscas
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={updateSearchStatuses}
                  disabled={isUpdatingStatus}
                  className="flex items-center gap-2"
                  data-testid="button-updateStatus"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Atualizar Status
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Carregando histórico...</span>
                </div>
              ) : searches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma busca realizada ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searches.map((search: SearchType) => {
                    const searchDate = new Date(search.createdAt || new Date());
                    const now = new Date();
                    const hoursDiff = (now.getTime() - searchDate.getTime()) / (1000 * 60 * 60);
                    const isOldSearch = hoursDiff > 6;
                    
                    return (
                      <div key={search.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{search.address}</p>
                            <p className="text-sm text-gray-600">Segmento: {search.segment}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <Badge variant="outline">
                              -{search.creditsUsed} créditos
                            </Badge>
                            
                            {/* Status Badge */}
                            <div className="flex items-center gap-2">
                              {search.finalizado ? (
                                <>
                                  <Badge variant="default" className="bg-green-500">
                                    Finalizada
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadSearchResults(search)}
                                    disabled={isDownloading === search.id}
                                    className="p-1 h-8 w-8"
                                    data-testid={`button-download-${search.id}`}
                                  >
                                    {isDownloading === search.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                </>
                              ) : isOldSearch ? (
                                <Badge variant="destructive">
                                  Expirada
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Processando
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {search.createdAt ? new Date(search.createdAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (!user) {
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
            <BarChart3 className="text-white text-xl" />
            <span className="text-white text-lg font-semibold">Sistema B2B</span>
          </div>
        </div>
        
        <nav className="mt-8">
          <div className="px-4 space-y-2">
            <button 
              onClick={() => setActiveSection("b2b")}
              className={`w-full group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeSection === "b2b" 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              data-testid="button-nav-b2b"
            >
              <Search className={`mr-3 h-5 w-5 ${
                activeSection === "b2b" ? "text-blue-500" : "text-gray-400"
              }`} />
              B2B - Extrair Dados
            </button>
            <button 
              onClick={() => setActiveSection("settings")}
              className={`w-full group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeSection === "settings" 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-700 hover:bg-gray-50"
              }`}
              data-testid="button-nav-settings"
            >
              <Settings className={`mr-3 h-5 w-5 ${
                activeSection === "settings" ? "text-blue-500" : "text-gray-400"
              }`} />
              Configurações
            </button>
            {user.role === "admin" && (
              <button 
                onClick={() => window.location.href = "/admin"}
                className="w-full group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                data-testid="button-nav-admin"
              >
                <BarChart3 className="mr-3 h-5 w-5 text-gray-400" />
                Admin Dashboard
              </button>
            )}
          </div>
          
          <div className="mt-auto absolute bottom-4 left-4 right-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  {user.role !== "admin" && (
                    <div className="flex items-center text-green-600 text-xs font-medium mt-1">
                      <Coins className="h-3 w-3 mr-1" />
                      {user.credits} créditos
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="mt-3 w-full text-left text-sm text-gray-500 hover:text-gray-700 transition-colors"
                data-testid="button-logout"
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
                  data-testid="button-menu-toggle"
                >
                  <Menu className="h-6 w-6" />
                </Button>
                <h1 className="ml-4 lg:ml-0 text-2xl font-semibold text-gray-900">
                  {activeSection === "b2b" && "B2B - Extrair Dados"}
                  {activeSection === "settings" && "Configurações"}
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {user.role !== "admin" && (
                  <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-medium">
                    <Coins className="inline mr-2 h-4 w-4" />
                    {user.credits} créditos
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {activeSection === "b2b" && renderB2BContent()}
            {activeSection === "settings" && <UserSettings />}
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
    </div>
  );
}
