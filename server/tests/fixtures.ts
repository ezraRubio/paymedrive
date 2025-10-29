import { UserTier } from '../models/user.model';

export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test User',
  email: 'test@example.com',
  tier: UserTier.FREE,
  isAdmin: false,
  accessToken: 'mock-token',
  isDeleted: false,
  createdAt: new Date(),
  modifyAt: new Date(),
};

export const mockProUser = {
  ...mockUser,
  id: '223e4567-e89b-12d3-a456-426614174001',
  email: 'pro@example.com',
  tier: UserTier.PRO,
};

export const mockFile = {
  id: '323e4567-e89b-12d3-a456-426614174002',
  name: 'test-file.pdf',
  location: '/bucket/test-file.pdf',
  size: 1024000,
  format: 'pdf',
  isDeleted: false,
  createdAt: new Date(),
  modifyAt: new Date(),
};

export const mockSubscription = {
  id: '423e4567-e89b-12d3-a456-426614174003',
  tier: UserTier.FREE,
  limitSize: 10485760, // 10MB
  limitItems: 10,
};

export const mockJWTPayload = {
  userId: mockUser.id,
  email: mockUser.email,
  tier: mockUser.tier,
};

export const mockOTP = '123456';

export const mockFileBuffer = Buffer.from('test file content');

export const createMockUser = (overrides?: Partial<typeof mockUser>) => ({
  ...mockUser,
  ...overrides,
});

export const createMockFile = (overrides?: Partial<typeof mockFile>) => ({
  ...mockFile,
  ...overrides,
});
