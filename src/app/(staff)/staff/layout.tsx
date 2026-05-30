import { StaffLayoutClient } from "@/components/staff/staff-layout-client";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaffLayoutClient>{children}</StaffLayoutClient>;
}
