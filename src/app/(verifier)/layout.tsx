import { ThemeProvider } from "next-themes";
import { VerifierLayoutClient } from "@/components/verifier/verifier-layout-client";

export default function VerifierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <VerifierLayoutClient>{children}</VerifierLayoutClient>
    </ThemeProvider>
  );
}
