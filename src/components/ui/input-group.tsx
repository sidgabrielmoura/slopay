import type { ComponentProps } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function InputGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="input-group" className={cn(
      "flex h-11 w-full min-w-0 items-center rounded-md border border-input bg-card/60 ring-offset-background",
      "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring has-[input:focus-visible]:ring-offset-2",
      className,
    )} {...props} />
  );
}

export function InputGroupInput({ className, ...props }: InputProps) {
  return (
    <Input data-slot="input-group-control" className={cn(
      "h-full min-w-0 flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0", className,
    )} {...props} />
  );
}

export function InputGroupAddon({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="input-group-addon" className={cn("flex shrink-0 items-center gap-1 pe-1", className)} {...props} />;
}
