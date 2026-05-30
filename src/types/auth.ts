export interface AuthPayload {
  userId: number; // users.id (Prisma Int PK)
  sessionId: number; // auth_sessions.id
  roles: string[]; // role codes, e.g. ['USER']
}
