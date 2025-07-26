import { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { User } from "@shared/schema";

const editUserSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  password: z.string().optional(),
  role: z.enum(["admin", "regular"], {
    required_error: "Tipo de usuário é obrigatório",
  }),
});

type EditUserData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export default function EditUserModal({ open, onClose, user }: EditUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      password: "",
      role: user?.role || "regular",
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        password: "",
        role: user.role || "regular",
      });
    }
  }, [user, form]);

  const editUserMutation = useMutation({
    mutationFn: async (data: EditUserData) => {
      const updateData = { ...data };
      if (!updateData.password) {
        delete (updateData as any).password;
      }
      const response = await apiRequest("PUT", `/api/users/${user?.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      toast({
        title: "Usuário Atualizado",
        description: "Os dados do usuário foram atualizados com sucesso.",
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
        description: error.message || "Falha ao atualizar usuário.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditUserData) => {
    editUserMutation.mutate(data);
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
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sobrenome</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o sobrenome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>Email</FormLabel>
              <Input value={user.email} disabled className="bg-gray-100" />
              <p className="text-xs text-gray-500">O email não pode ser alterado</p>
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha (deixe em branco para manter a atual)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Digite a nova senha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Usuário</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="regular">Usuário Regular</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editUserMutation.isPending}>
                {editUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}