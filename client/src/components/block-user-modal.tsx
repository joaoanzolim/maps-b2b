import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Ban } from "lucide-react";
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
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-lg font-medium text-gray-900">
              Confirmar Bloqueio
            </DialogTitle>
          </div>
        </DialogHeader>

        {user && (
          <div className="space-y-4">
            <div className="text-center px-4 py-3">
              <p className="text-sm text-gray-500">
                Tem certeza que deseja bloquear o usuário{" "}
                <strong className="text-gray-900">
                  {user.firstName} {user.lastName}
                </strong>
                ? Esta ação impedirá o acesso do usuário ao sistema.
              </p>
            </div>

            <div className="flex justify-center space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onConfirm}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Ban className="mr-2 h-4 w-4" />
                )}
                Bloquear Usuário
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
