import { ThemeProvider } from "next-themes";
import { OwnerLayoutClient } from "@/components/owner/owner-layout-client";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <OwnerLayoutClient>{children}</OwnerLayoutClient>
      </TooltipProvider>
    </ThemeProvider>
  );
}
