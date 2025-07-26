import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { User } from "@shared/schema";

interface BlockUserModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function BlockUserModal({ 
  open, 
  onClose, 
  user, 
  onConfirm, 
  isLoading 
}: BlockUserModalProps) {
  if (!user) return null;

  const isBlocked = user.status === "blocked";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isBlocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
          </DialogTitle>
          <DialogDescription>
            {isBlocked 
              ? `Tem certeza que deseja desbloquear o usuário ${user.firstName} ${user.lastName}?`
              : `Tem certeza que deseja bloquear o usuário ${user.firstName} ${user.lastName}? Esta ação impedirá o usuário de acessar o sistema.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            variant={isBlocked ? "default" : "destructive"} 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isBlocked ? "Desbloquear" : "Bloquear"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}