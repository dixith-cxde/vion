"use client";

import * as React from "react";
import * as AlertDialogPrimitives from "@radix-ui/react-alert-dialog";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AlertDialog = AlertDialogPrimitives.Root;

const AlertDialogTrigger = AlertDialogPrimitives.Trigger;

const AlertDialogPortal = AlertDialogPrimitives.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitives.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitives.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitives.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitives.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitives.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitives.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitives.Content
      ref={ref}
      className={cn(
        "fixed top-[50%] left-[50%] z-50 grid w-[min(92vw,28rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-none duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitives.Content.displayName;

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

const AlertDialogTitle = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitives.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitives.Title
    ref={ref}
    className={cn("text-base font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitives.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitives.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitives.Description
    ref={ref}
    className={cn("text-sm leading-6 text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName =
  AlertDialogPrimitives.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitives.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitives.Action
    ref={ref}
    className={cn(buttonVariants(), "rounded-lg", className)}
    {...props}
  />
));
AlertDialogAction.displayName = AlertDialogPrimitives.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitives.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitives.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitives.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "rounded-lg",
      className,
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitives.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
