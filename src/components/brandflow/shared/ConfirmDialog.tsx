"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const { appTheme } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(
        isGold && "bg-[#15151e] border-white/[0.08]"
      )}>
        <AlertDialogHeader>
          <AlertDialogTitle className={cn(
            isDark && "text-white"
          )}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className={cn(
            isDark && "text-slate-400"
          )}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={cn(
            isGold && "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
          )}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              isGold
                ? variant === "destructive"
                  ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white"
                  : "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black hover:shadow-[0_4px_20px_rgba(212,160,23,0.3)]"
                : variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-amber-600 hover:bg-amber-700"
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
