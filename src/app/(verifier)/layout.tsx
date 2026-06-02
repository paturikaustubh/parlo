import { VerifierLayoutClient } from "@/components/verifier/verifier-layout-client";

export default function VerifierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VerifierLayoutClient>{children}</VerifierLayoutClient>;
}
