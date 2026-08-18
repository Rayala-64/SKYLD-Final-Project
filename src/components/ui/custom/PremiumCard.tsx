"use client";

import * as React from "react"
import { cn } from "@/lib/utils"

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradientBorder?: boolean
  glass?: boolean
  hoverEffect?: boolean
}

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, gradientBorder, glass = true, hoverEffect = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-2xl overflow-hidden",
          glass && "bg-card/80 backdrop-blur-xl border border-white/5 shadow-xl",
          !glass && "bg-card border border-border shadow-sm",
          hoverEffect && "transition-transform hover:-translate-y-1 hover:shadow-2xl duration-300",
          className
        )}
        {...props}
      >
        {gradientBorder && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 opacity-50 p-[1px] rounded-2xl pointer-events-none">
            <div className="w-full h-full bg-card/90 rounded-2xl" />
          </div>
        )}
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </div>
    )
  }
)
PremiumCard.displayName = "PremiumCard"

export { PremiumCard }
