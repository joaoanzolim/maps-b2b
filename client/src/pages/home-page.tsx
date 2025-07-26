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
import { MapPin, Search, Loader2, History, LogOut, Coins, Download, Clock } from "lucide-react";
import type { Search as SearchType } from "@shared/schema";

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

  const form = useForm<SearchData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      address: "",
      segment: "",
    },
  });

  // Fetch user searches with polling for unfinished searches
  const { data: searches = [], isLoading: searchesLoading } = useQuery<SearchType[]>({
    queryKey: ["/api/searches"],
    enabled: !!user,
    retry: false,
    refetchInterval: (data) => {
      if (!data || !Array.isArray(data)) return false;
      
      const now = new Date();
      const hasUnfinishedSearches = data.some(search => {
        if (search.finalizado) return false;
        
        const searchDate = new Date(search.createdAt);
        const hoursDiff = (now.getTime() - searchDate.getTime()) / (1000 * 60 * 60);
        
        // Don't poll if search is older than 6 hours
        if (hoursDiff > 6) return false;
        
        return true;
      });
      
      return hasUnfinishedSearches ? 30000 : false; // Poll every 30 seconds if there are unfinished searches
    },
  });

  // Fetch search cost setting
  const { data: searchCost = 10 } = useQuery<number>({
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

  // Download function for completed searches
  const downloadSearchResults = async (search: SearchType) => {
    try {
      const response = await fetch(
        `https://autowebhook.hooks.digital/webhook/3a9d397e-ae0c-4dd8-812e-812e1b8382af?id=${search.id}`
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
      link.download = `[${search.segment}] - ${search.address} - ${formattedDate}.xlsx`;
      
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
    }
  };

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (data: SearchData) => {
      // Check if user has enough credits
      if (!user || user.credits < searchCost) {
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
        "https://autowebhook.hooks.digital/webhook/68770ab5-cdde-45f5-8bee-a419c2926423",
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer kvsx8XlCnJuFWGfyD7IGPdLG9yh8OjGi",
            "Content-Type": "application/json",
          },
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
          creditsUsed: searchCost,
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

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao fazer logout.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Sistema de Busca
              </h1>
              <p className="text-gray-600">
                Busque informações por CEP ou endereço e segmento
              </p>
            </div>
            
            {user && (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Bem-vindo, {user.firstName}!</p>
                  <div className="flex items-center text-blue-600 font-medium">
                    <Coins className="h-4 w-4 mr-1" />
                    {user.credits} créditos
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sair
                </Button>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Realizar Busca</TabsTrigger>
            <TabsTrigger value="history">Histórico de Buscas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Search Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Realizar Busca
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Address/CEP Field */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <FormLabel>
                            {searchType === "cep" ? "CEP" : "Endereço"}
                          </FormLabel>
                          <Tabs value={searchType} onValueChange={(value) => toggleSearchType(value as "cep" | "endereco")} className="w-auto">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="cep" className="text-xs">CEP</TabsTrigger>
                              <TabsTrigger value="endereco" className="text-xs">Endereço</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder={
                                      searchType === "cep" 
                                        ? "00000-000" 
                                        : "Digite o endereço completo"
                                    }
                                    {...field}
                                    onChange={(e) => handleAddressChange(e.target.value)}
                                    maxLength={searchType === "cep" ? 9 : undefined}
                                  />
                                  {isSearchingCep && (
                                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Segment Field */}
                      <FormField
                        control={form.control}
                        name="segment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Segmento</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Digite o segmento (máx. 75 caracteres)"
                                {...field}
                                maxLength={75}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500">
                              {field.value?.length || 0}/75 caracteres
                            </p>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={searchMutation.isPending || (user && user.credits < searchCost)}
                      >
                        {searchMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Realizando busca...
                          </>
                        ) : (
                          <>
                            <Search className="mr-2 h-4 w-4" />
                            Realizar Busca ({searchCost} créditos)
                          </>
                        )}
                      </Button>
                      
                      {user && user.credits < searchCost && (
                        <p className="text-sm text-red-600 text-center">
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
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Buscas
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
                                      className="p-1 h-8 w-8"
                                    >
                                      <Download className="h-4 w-4" />
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
    </div>
  );
}