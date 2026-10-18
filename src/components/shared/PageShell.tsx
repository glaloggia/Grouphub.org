import { cn } from "@/lib/utils";

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageShell({
  children,
  title,
  description,
  actions,
  className,
  ...props
}: PageShellProps) {
  return (
    <div className={cn("flex flex-col gap-8 p-4 md:p-6 lg:p-8", className)} {...props}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 space-y-1">
            {title && <h1 className="font-headline text-3xl font-bold tracking-tight">{title}</h1>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
