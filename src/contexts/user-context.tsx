"use client";

import { createContext, useContext } from "react";
import type { User, UserRoleEntry } from "@/shared/types/entities";

interface UserContextValue {
  user: User | null;
  roles: UserRoleEntry[];
  setUser: (u: User | null) => void;
  setRoles: (r: UserRoleEntry[]) => void;
}

export const UserContext = createContext<UserContextValue>({
  user: null,
  roles: [],
  setUser: () => {},
  setRoles: () => {},
});

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
