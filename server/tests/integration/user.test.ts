import request from 'supertest';
import app from '../../app';
import { generateOTP, storeOTP } from '../../utils/otp.util';
import '../setup';

describe('User Endpoints', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const email = 'user@example.com';
    const otp = generateOTP();
    storeOTP(email, otp);

    const response = await request(app)
      .post('/api/otp')
      .send({
        email,
        otp,
        name: 'Test User',
      });

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  describe('GET /api/users', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('user@example.com');
      expect(response.body.user.quota).toBeDefined();
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('PUT /api/users', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe('Updated Name');
    });

    it('should reject update without token', async () => {
      await request(app)
        .put('/api/users')
        .send({ name: 'Updated Name' })
        .expect(401);
    });

    it('should reject invalid name', async () => {
      await request(app)
        .put('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'X' })
        .expect(500);
    });
  });

  describe('DELETE /api/users', () => {
    it('should delete user account', async () => {
      const response = await request(app)
        .delete('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should reject delete without token', async () => {
      await request(app)
        .delete('/api/users')
        .expect(401);
    });
  });

  describe('GET /api/users/stats', () => {
    it('should get user statistics', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalFiles).toBeDefined();
      expect(response.body.data.stats.totalSize).toBeDefined();
    });

    it('should reject without token', async () => {
      await request(app)
        .get('/api/users/stats')
        .expect(401);
    });
  });

  describe('GET /api/users/quota', () => {
    it('should get quota compliance status', async () => {
      const response = await request(app)
        .get('/api/users/quota')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isCompliant).toBeDefined();
      expect(response.body.currentUsage).toBeDefined();
      expect(response.body.limits).toBeDefined();
    });

    it('should reject without token', async () => {
      await request(app)
        .get('/api/users/quota')
        .expect(401);
    });
  });
});
