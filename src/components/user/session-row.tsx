import { cn } from "@/lib/utils";

interface SessionRowProps {
  spaceName: string;
  date: string;
  duration: string;
  cost: string;
  plate: string;
  status: "COMPLETED" | "ACTIVE";
  onClick?: () => void;
}

export function SessionRow({
  spaceName,
  date,
  duration,
  cost,
  plate,
  status,
  onClick,
}: SessionRowProps) {
  const baseClass =
    "w-full flex items-center justify-between py-3 px-1 rounded-lg text-left";

  const content = (
    <>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">
          {spaceName}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            {plate}
          </span>
          <span className="text-[11px] text-muted-foreground">{date}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0 pl-3">
        <span className="font-heading font-bold text-sm text-foreground">
          {cost}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">{duration}</span>
          {status === "ACTIVE" && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
          )}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          baseClass,
          "hover:bg-muted/50 transition-colors cursor-pointer",
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
