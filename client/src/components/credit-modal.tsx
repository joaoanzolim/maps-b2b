import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, Save } from "lucide-react";
import type { User } from "@shared/schema";

interface CreditModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export default function CreditModal({ open, onClose, user }: CreditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creditAmount, setCreditAmount] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [note, setNote] = useState("");

  // Update credits mutation
  const updateCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount, note }: { userId: string; amount: number; note?: string }) => {
      const response = await apiRequest("POST", `/api/users/${userId}/credits`, {
        amount,
        note,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      toast({
        title: "Créditos Atualizados",
        description: "Os créditos do usuário foram atualizados com sucesso.",
      });
      handleClose();
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
        description: "Falha ao atualizar créditos.",
        variant: "destructive",
      });
    },
  });

  // Update credit limit mutation
  const updateCreditLimitMutation = useMutation({
    mutationFn: async ({ userId, limit }: { userId: string; limit: number }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/credit-limit`, {
        limit,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      toast({
        title: "Limite Atualizado",
        description: "O limite de créditos foi atualizado com sucesso.",
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
        description: "Falha ao atualizar limite de créditos.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setCreditAmount("");
    setCreditLimit("");
    setNote("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    const promises = [];

    // Update credits if amount is provided
    if (creditAmount && creditAmount !== "0") {
      const amount = parseInt(creditAmount);
      if (isNaN(amount)) {
        toast({
          title: "Erro",
          description: "Por favor, insira um valor válido para os créditos.",
          variant: "destructive",
        });
        return;
      }
      promises.push(updateCreditsMutation.mutateAsync({ userId: user.id, amount, note: note || undefined }));
    }

    // Update credit limit if provided
    if (creditLimit) {
      const limit = parseInt(creditLimit);
      if (isNaN(limit) || limit < 0) {
        toast({
          title: "Erro",
          description: "Por favor, insira um valor válido para o limite de créditos.",
          variant: "destructive",
        });
        return;
      }
      promises.push(updateCreditLimitMutation.mutateAsync({ userId: user.id, limit }));
    }

    if (promises.length === 0) {
      toast({
        title: "Erro",
        description: "Por favor, preencha pelo menos um campo para atualizar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await Promise.all(promises);
    } catch (error) {
      // Errors are handled in individual mutations
    }
  };

  const getInitials = (user: User) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const isLoading = updateCreditsMutation.isPending || updateCreditLimitMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Coins className="h-5 w-5 text-blue-600" />
            <span>Gerenciar Créditos</span>
          </DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Current Credits */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Créditos Atuais
              </Label>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">{user.credits}</span>
                  <span className="text-sm text-gray-500">de {user.creditLimit} créditos</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Credit Amount */}
              <div>
                <Label htmlFor="creditAmount" className="text-sm font-medium text-gray-700 mb-2 block">
                  Adicionar/Remover Créditos
                </Label>
                <Input
                  id="creditAmount"
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Digite o valor (use - para remover)"
                  className="w-full"
                />
              </div>

              {/* Credit Limit */}
              <div>
                <Label htmlFor="creditLimit" className="text-sm font-medium text-gray-700 mb-2 block">
                  Limite de Créditos
                </Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder={`Atual: ${user.creditLimit}`}
                  min="0"
                  className="w-full"
                />
              </div>

              {/* Note */}
              <div>
                <Label htmlFor="note" className="text-sm font-medium text-gray-700 mb-2 block">
                  Observação (opcional)
                </Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Motivo da alteração..."
                  rows={3}
                  className="w-full"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
