import React, { createContext, useContext, useState, ReactNode } from "react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface ParkingSession {
  id: string;
  spaceId: string;
  startTime: string;
  status: "active" | "completed" | "cancelled";
}

interface UserSessionContextType {
  userProfile: UserProfile | null;
  activeSession: ParkingSession | null;
  setUserProfile: (profile: UserProfile | null) => void;
  setActiveSession: (session: ParkingSession | null) => void;
}

const UserSessionContext = createContext<UserSessionContextType | undefined>(
  undefined,
);

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeSession, setActiveSession] = useState<ParkingSession | null>(
    null,
  );

  return (
    <UserSessionContext.Provider
      value={{ userProfile, activeSession, setUserProfile, setActiveSession }}
    >
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  const context = useContext(UserSessionContext);
  if (context === undefined) {
    throw new Error("useUserSession must be used within a UserSessionProvider");
  }
  return context;
}
