import { Card, CardContent } from "@/components/ui/card";
import { IconTrendingUp } from "@tabler/icons-react";

export default function VerifierAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your review performance and activity stats.
        </p>
      </div>
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-16 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <IconTrendingUp size={26} className="text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-heading font-bold text-lg text-foreground">
              Coming soon
            </p>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Review analytics — total processed, approval rate, average review
              time — will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
