import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

const SECTION_LABELS: Record<string, string> = {
  sessions: "Sessions",
  queue: "Requests",
  reports: "Reports",
  analytics: "Analytics",
  activity: "Activity",
  audit: "Activity",
  subscription: "Subscription",
  settings: "Settings",
  staff: "Staff",
  business: "Business",
  operate: "Operate",
};

interface Props {
  params: Promise<{ slug: string[] }>;
}

export default async function OwnerComingSoonPage({ params }: Props) {
  const { slug } = await params;
  const section = SECTION_LABELS[slug[0]] ?? slug.join("/");

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/owner">
          <IconArrowLeft size={16} /> Dashboard
        </Link>
      </Button>
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-16 text-center space-y-2">
          <p className="font-heading font-bold text-lg text-foreground">
            {section}
          </p>
          <p className="text-sm text-muted-foreground">
            This section is being built. Check back shortly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
