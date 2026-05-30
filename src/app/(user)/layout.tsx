import { UserLayoutClient } from "@/components/user/user-layout-client";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserLayoutClient>{children}</UserLayoutClient>;
}
