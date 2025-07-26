import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Search, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

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
  const [searchType, setSearchType] = useState<"cep" | "endereco">("cep");
  const [cepData, setCepData] = useState<ViaCepResponse | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

  const form = useForm<SearchData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      address: "",
      segment: "",
    },
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
      const formattedAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf} - Brasil`;
      form.setValue("address", formattedAddress);
      
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
  const toggleSearchType = () => {
    const newType = searchType === "cep" ? "endereco" : "cep";
    setSearchType(newType);
    form.setValue("address", "");
    setCepData(null);
  };

  // Perform main search
  const onSubmit = async (data: SearchData) => {
    setIsSearching(true);
    try {
      const payload = {
        endereco: data.address,
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
      setSearchResult(result);
      
      toast({
        title: "Busca realizada com sucesso",
        description: "Os dados foram encontrados!",
      });
    } catch (error) {
      toast({
        title: "Erro na busca",
        description: "Não foi possível realizar a busca. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Sistema de Busca
          </h1>
          <p className="text-gray-600">
            Busque informações por CEP ou endereço e segmento
          </p>
        </div>

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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleSearchType}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {searchType === "cep" ? (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-1" />
                            Usar Endereço
                          </>
                        ) : (
                          <>
                            <ToggleRight className="h-4 w-4 mr-1" />
                            Usar CEP
                          </>
                        )}
                      </Button>
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
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Realizando busca...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Realizar Busca
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
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

            {/* Search Results */}
            {searchResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado da Busca</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto">
                    {JSON.stringify(searchResult, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}