import { OwnerLayoutClient } from "@/components/owner/owner-layout-client";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OwnerLayoutClient>{children}</OwnerLayoutClient>;
}
