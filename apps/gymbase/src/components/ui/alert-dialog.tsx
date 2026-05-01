// alert-dialog.tsx — Dialog de confirmación destructiva construido sobre base-ui/dialog

"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@core/components/ui/dialog";
import { Button } from "@core/components/ui/button";
import { cn } from "@core/lib/utils";

// Re-exporta con nombres AlertDialog para compatibilidad con el patrón shadcn
const AlertDialog = Dialog;
const AlertDialogTrigger = DialogTrigger;
const AlertDialogPortal = React.Fragment;

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      showCloseButton={false}
      className={cn("max-w-[90vw] sm:max-w-md", className)}
      {...props}
    />
  );
}

const AlertDialogHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <DialogHeader className={className} {...props} />
);

const AlertDialogFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex gap-2 justify-end mt-2", className)} {...props} />
);

const AlertDialogTitle = DialogTitle;
const AlertDialogDescription = DialogDescription;

function AlertDialogCancel({ children = "Cancelar", className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <DialogClose render={
      <Button variant="outline" className={className} {...props}>
        {children}
      </Button>
    } />
  );
}

function AlertDialogAction({ children, className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <DialogClose
      render={
        <Button
          className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90", className)}
          onClick={onClick}
          {...props}
        >
          {children}
        </Button>
      }
    />
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
};
