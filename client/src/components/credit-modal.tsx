import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { User } from "@shared/schema";

const creditSchema = z.object({
  amount: z.number().refine((val) => val !== 0, "Quantidade deve ser diferente de 0"),
  note: z.string().optional(),
});

type CreditData = z.infer<typeof creditSchema>;

interface CreditModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export default function CreditModal({ open, onClose, user }: CreditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreditData>({
    resolver: zodResolver(creditSchema),
    defaultValues: {
      amount: 0,
      note: "",
    },
  });

  const creditMutation = useMutation({
    mutationFn: async (data: CreditData) => {
      const response = await apiRequest("POST", `/api/users/${user?.id}/credits`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      toast({
        title: "Créditos Atualizados",
        description: "Os créditos do usuário foram atualizados com sucesso.",
      });
      form.reset();
      onClose();
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
        description: error.message || "Falha ao atualizar créditos.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreditData) => {
    creditMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Créditos</DialogTitle>
          <p className="text-sm text-gray-600">
            Usuário: {user.firstName} {user.lastName} | Créditos atuais: {user.credits}
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade (use valores negativos para remover)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ex: 100 ou -50"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Motivo da alteração..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creditMutation.isPending}>
                {creditMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Atualizar Créditos
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}