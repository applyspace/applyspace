"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"

import { cn } from "@/lib/utils"

function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn(
        "inline-flex w-fit items-center rounded-full bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-all outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
