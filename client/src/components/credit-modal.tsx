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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins } from "lucide-react";
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

  // Update credits mutation
  const updateCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      const response = await apiRequest("POST", `/api/users/${userId}/credits`, {
        amount,
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
          title: "Não Autorizado",
          description: "Você foi desconectado. Redirecionando...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
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

  const handleClose = () => {
    setCreditAmount("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!creditAmount || creditAmount === "0") {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor para os créditos.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(creditAmount);
    if (isNaN(amount)) {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor válido para os créditos.",
        variant: "destructive",
      });
      return;
    }

    updateCreditsMutation.mutate({ userId: user.id, amount });
  };

  const getInitials = (user: User) => {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Coins className="h-5 w-5" />
            <span>Gerenciar Créditos</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-sm font-medium text-blue-600">
                Créditos atuais: {user.credits}
              </p>
            </div>
          </div>

          {/* Credit Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="creditAmount">
                Alterar Créditos (use números positivos para adicionar, negativos para remover)
              </Label>
              <Input
                id="creditAmount"
                type="number"
                placeholder="Ex: +50 ou -20"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateCreditsMutation.isPending}
                className="flex items-center space-x-2"
              >
                <Coins className="h-4 w-4" />
                <span>
                  {updateCreditsMutation.isPending ? "Atualizando..." : "Atualizar Créditos"}
                </span>
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}