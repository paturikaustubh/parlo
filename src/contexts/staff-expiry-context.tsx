"use client";

import { createContext, useContext } from "react";

interface StaffExpiryContextValue {
  isExpired: boolean;
}

const StaffExpiryContext = createContext<StaffExpiryContextValue>({
  isExpired: false,
});

export function useStaffExpiry() {
  return useContext(StaffExpiryContext);
}

export { StaffExpiryContext };
