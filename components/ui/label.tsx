"use client";

// biome-ignore lint/performance/noNamespaceImport: Required for typeof type inference with Radix UI
import * as LabelPrimitive from "@radix-ui/react-label";
import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
} from "react";

import { cn } from "@/lib/utils";

const Label = forwardRef<
  ElementRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    className={cn(
      "font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    data-slot="label"
    ref={ref}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
