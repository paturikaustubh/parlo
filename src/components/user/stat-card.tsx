import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}

export function StatCard({ label, value, sub, className }: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
          {label}
        </p>
        <p className="font-heading font-bold text-2xl text-foreground leading-none">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
