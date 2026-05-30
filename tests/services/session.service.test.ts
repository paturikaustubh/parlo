import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkIn } from '@/services/session.service'
import { prisma } from '@/lib/db'
import { consumeActionSession } from '@/services/qr.service'

vi.mock('@/lib/db', () => ({
  prisma: {
    space: {
      findUnique: vi.fn(),
    },
    vehicle: {
      findUnique: vi.fn(),
    },
    parkingSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    auditEntry: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/services/qr.service', () => ({
  consumeActionSession: vi.fn(),
}))

vi.mock('@/repositories/session.repository', () => ({
  createSession: vi.fn(),
  findSessionById: vi.fn(),
  formatSession: vi.fn((s) => s),
}))

describe('session.service.checkIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  })

  it('should check in an authenticated user successfully', async () => {
    const mockData = {
      actionSessionId: 'action-123',
      vehicleId: 'vehicle-uuid',
      userId: 1,
    };

    (consumeActionSession as any).mockResolvedValue({ spaceDbId: 101 });
    (prisma.space.findUnique as any).mockResolvedValue({ currentPricingVersionId: 'pv-1', businessId: 501 });
    (prisma.vehicle.findUnique as any).mockResolvedValue({ id: 201, vehicleNumber: 'ABC-123', vehicleType: 'FOUR_WHEELER' });
    (prisma.parkingSession.findFirst as any).mockResolvedValue(null);

    const mockSession = { parkingSessionId: 'sess-1', id: 1001, space: { spaceId: 'S1', name: 'Space 1' }, checkedInAt: new Date() };
    (prisma.parkingSession.create as any).mockResolvedValue({ ...mockSession, user: { userId: 1 }, vehicle: { vehicleId: 'vehicle-uuid' }, checkedInBy: null, checkedOutBy: null });

    const result = await checkIn(mockData);

    expect(result.userId).toBe(1);
    expect(prisma.parkingSession.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1,
      tokenId: undefined
    }));
    expect(prisma.auditEntry.create).toHaveBeenCalled();
  });

  it('should check in a guest user and generate a tokenId', async () => {
    const mockData = {
      actionSessionId: 'action-456',
      guestName: 'John Doe',
      guestPhone: '1234567890',
      guestVehicleType: 'FOUR_WHEELER' as const,
      guestVehicleNumber: 'GUEST-123',
      userId: undefined, // Guest
    };

    (consumeActionSession as any).mockResolvedValue({ spaceDbId: 101 });
    (prisma.space.findUnique as any).mockResolvedValue({ currentPricingVersionId: 'pv-1', businessId: 501 });

    const mockSession = { parkingSessionId: 'sess-2', id: 1002, space: { spaceId: 'S1', name: 'Space 1' }, checkedInAt: new Date(), tokenId: 'A1B2C3D4' };
    (prisma.parkingSession.create as any).mockImplementation(async (args) => {
      if (!args.data.tokenId) throw new Error('tokenId is required for guests');
      return { ...mockSession, user: null, vehicle: null, checkedInBy: null, checkedOutBy: null };
    });

    const result = await checkIn(mockData);

    expect(result.tokenId).toBeDefined();
    expect(result.tokenId).toHaveLength(8); // randomBytes(4).toString('hex') = 8 chars
    expect(prisma.parkingSession.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: undefined,
      tokenId: expect.any(String),
    }));
    expect(prisma.auditEntry.create).not.toHaveBeenCalled();
  });
});
