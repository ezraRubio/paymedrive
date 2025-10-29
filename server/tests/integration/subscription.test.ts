import request from 'supertest';
import app from '../../app';
import { generateOTP, storeOTP } from '../../utils/otp.util';
import { UserTier } from '../../models/user.model';
import '../setup';

describe('Subscription Endpoints', () => {
  let authToken: string;

  beforeEach(async () => {
    const email = 'sub@example.com';
    const otp = generateOTP();
    storeOTP(email, otp);

    const response = await request(app)
      .post('/api/otp')
      .send({
        email,
        otp,
        name: 'Subscription User',
      });

    authToken = response.body.token;
  });

  describe('GET /api/subscription/tiers', () => {
    it('should get all subscription tiers without auth', async () => {
      const response = await request(app)
        .get('/api/subscription/tiers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tiers).toBeDefined();
      expect(response.body.tiers.length).toBeGreaterThan(0);
    });

    it('should include all three tiers', async () => {
      const response = await request(app)
        .get('/api/subscription/tiers')
        .expect(200);

      const tiers = response.body.tiers.map((t: any) => t.tier);
      expect(tiers).toContain(UserTier.FREE);
      expect(tiers).toContain(UserTier.PRO);
      expect(tiers).toContain(UserTier.UNLIMITED);
    });

    it('should include pricing information', async () => {
      const response = await request(app)
        .get('/api/subscription/tiers')
        .expect(200);

      const tier = response.body.tiers[0];
      expect(tier.price).toBeDefined();
      expect(tier.currency).toBeDefined();
      expect(tier.billingPeriod).toBeDefined();
    });
  });

  describe('POST /api/subscription/upgrade', () => {
    it('should upgrade from free to pro', async () => {
      const response = await request(app)
        .post('/api/subscription/upgrade')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tier: UserTier.PRO })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tier).toBe(UserTier.PRO);
    });

    it('should reject upgrade without token', async () => {
      await request(app)
        .post('/api/subscription/upgrade')
        .send({ tier: UserTier.PRO })
        .expect(401);
    });

    it('should reject invalid tier', async () => {
      await request(app)
        .post('/api/subscription/upgrade')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tier: 'invalid' })
        .expect(500);
    });

    it('should reject upgrade to same tier', async () => {
      await request(app)
        .post('/api/subscription/upgrade')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tier: UserTier.FREE })
        .expect(400);
    });

    it('should allow upgrade from pro to unlimited', async () => {
      await request(app)
        .post('/api/subscription/upgrade')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tier: UserTier.PRO });

      const response = await request(app)
        .post('/api/subscription/upgrade')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tier: UserTier.UNLIMITED })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tier).toBe(UserTier.UNLIMITED);
    });
  });
});
