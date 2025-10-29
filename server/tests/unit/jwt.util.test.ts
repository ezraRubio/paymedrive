import {
  generateToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
} from '../../utils/jwt.util';
import { mockJWTPayload } from '../fixtures';

describe('JWT Utility', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockJWTPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include payload data in token', () => {
      const token = generateToken(mockJWTPayload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockJWTPayload.userId);
      expect(decoded?.email).toBe(mockJWTPayload.email);
      expect(decoded?.tier).toBe(mockJWTPayload.tier);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockJWTPayload);
      const verified = verifyToken(token);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(mockJWTPayload.userId);
    });

    it('should reject an invalid token', () => {
      const verified = verifyToken('invalid.token.here');
      expect(verified).toBeNull();
    });

    it('should reject a malformed token', () => {
      const verified = verifyToken('notavalidtoken');
      expect(verified).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode a token without verification', () => {
      const token = generateToken(mockJWTPayload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockJWTPayload.userId);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid');
      expect(decoded).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const extracted = extractTokenFromHeader('InvalidFormat token');
      expect(extracted).toBeNull();
    });

    it('should return null for header without token', () => {
      const extracted = extractTokenFromHeader('Bearer');
      expect(extracted).toBeNull();
    });
  });
});
