import type { PropsWithChildren, ReactNode } from "react";

import { AppLogo } from "@/components/common/app-logo";
import { cn } from "@/lib/utils";

type PageHeaderProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  showLogo?: boolean;
}>;

export function PageHeader({ title, subtitle, actions, className, titleClassName, showLogo = true, children }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-sm", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {showLogo ? (
            <AppLogo
              imageClassName="size-10"
              titleClassName="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70"
              subtitleClassName="hidden"
            />
          ) : null}
          <div className="space-y-1">
            <h1 className={cn("text-3xl font-semibold tracking-tight text-foreground md:text-4xl", titleClassName)}>{title}</h1>
            {subtitle ? <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
