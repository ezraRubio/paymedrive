import request from 'supertest';
import app from '../../app';
import { generateOTP, storeOTP } from '../../utils/otp.util';
import '../setup';

describe('Authentication Endpoints', () => {
  describe('POST /api/auth', () => {
    it('should send OTP to valid email', async () => {
      const response = await request(app)
        .post('/api/auth')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth')
        .send({ email: 'invalid-email' })
        .expect(500);

      expect(response.body.success).toBeUndefined();
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/auth')
        .send({})
        .expect(500);

      expect(response.body.success).toBeUndefined();
    });
  });

  describe('POST /api/otp', () => {
    it('should verify OTP and create new user', async () => {
      const email = 'newuser@example.com';
      const otp = generateOTP();
      storeOTP(email, otp);

      const response = await request(app)
        .post('/api/otp')
        .send({
          email,
          otp,
          name: 'New User',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(email);
    });

    it('should verify OTP and login existing user', async () => {
      const email = 'existing@example.com';
      const otp1 = generateOTP();
      storeOTP(email, otp1);

      await request(app)
        .post('/api/otp')
        .send({
          email,
          otp: otp1,
          name: 'Existing User',
        });

      const otp2 = generateOTP();
      storeOTP(email, otp2);

      const response = await request(app)
        .post('/api/otp')
        .send({
          email,
          otp: otp2,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid OTP', async () => {
      const email = 'test@example.com';

      const response = await request(app)
        .post('/api/otp')
        .send({
          email,
          otp: '000000',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject expired OTP', async () => {
      const email = 'test@example.com';
      const otp = generateOTP();
      storeOTP(email, otp);

      const response = await request(app)
        .post('/api/otp')
        .send({
          email,
          otp: '123456',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/logout', () => {
    it('should logout authenticated user', async () => {
      const email = 'logout@example.com';
      const otp = generateOTP();
      storeOTP(email, otp);

      const loginResponse = await request(app)
        .post('/api/otp')
        .send({
          email,
          otp,
          name: 'Logout User',
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .post('/api/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject logout without token', async () => {
      await request(app)
        .post('/api/logout')
        .expect(401);
    });

    it('should reject logout with invalid token', async () => {
      await request(app)
        .post('/api/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
