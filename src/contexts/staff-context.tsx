"use client";

import { createContext, useContext } from "react";
import type React from "react";
import type { StaffMember } from "@/shared/types/entities";

interface StaffContextValue {
  staffMember: StaffMember | null;
  setStaffMember: React.Dispatch<React.SetStateAction<StaffMember | null>>;
}

const StaffContext = createContext<StaffContextValue>({
  staffMember: null,
  setStaffMember: () => {},
});

export function useStaff() {
  return useContext(StaffContext);
}

export { StaffContext };
