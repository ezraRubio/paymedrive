import request from 'supertest';
import app from '../../app';
import { initializeDatabase } from '../../clients/db';
import { User } from '../../models/user.model';
import { UploadSession } from '../../models/upload.session.model';
import { File } from '../../models/file.model';


describe('Chunked Upload Integration Test', () => {
    let token: string;
    let userId: string;
    const testEmail = 'test@example.com';
    const testOtp = '123456'; // Assuming this is the configured TEST_OTP

    beforeAll(async () => {
        // Initialize DB
        await initializeDatabase();

        // Ensure test user exists or clean up
        await User.destroy({ where: { email: testEmail } });

        // Login to get token
        // 1. Initiate (to ensure user creation logic if needed, though verify handles it)
        await request(app)
            .post('/api/auth/init')
            .send({ email: testEmail });

        // 2. Verify
        const res = await request(app)
            .post('/api/otp') // Correct endpoint is /api/otp, not /api/auth/verify
            .send({ email: testEmail, otp: testOtp });

        if (res.status !== 200) {
            console.error('Login failed:', res.body);
        }

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        token = res.body.token;
        userId = res.body.user.id;

        expect(token).toBeDefined();
    });

    afterAll(async () => {
        // Cleanup
        if (userId) {
            await UploadSession.destroy({ where: { userId } });
            await File.destroy({ where: { users: userId } } as any); // Complex association cleanup might be needed
            await User.destroy({ where: { id: userId } });
        }
    });

    it('should perform a full chunked upload flow', async () => {
        const fileName = 'test-large-file.txt';
        const fileSize = 10 * 1024 * 1024; // 10MB
        const mimeType = 'text/plain';

        // 1. Initiate
        const initRes = await request(app)
            .post('/api/upload/init')
            .set('Authorization', `Bearer ${token}`)
            .send({ fileName, fileSize, mimeType });

        expect(initRes.status).toBe(200);
        expect(initRes.body.success).toBe(true);
        const { sessionId, chunkSize } = initRes.body;
        expect(sessionId).toBeDefined();
        expect(chunkSize).toBe(5 * 1024 * 1024);

        // 2. Upload Chunks
        const totalChunks = Math.ceil(fileSize / chunkSize);
        const buffer = Buffer.alloc(chunkSize, 'a'); // Dummy data

        for (let i = 0; i < totalChunks; i++) {
            const chunkBuffer = (i === totalChunks - 1)
                ? Buffer.alloc(fileSize % chunkSize || chunkSize, 'b')
                : buffer;

            const chunkRes = await request(app)
                .post('/api/upload/chunk')
                .set('Authorization', `Bearer ${token}`)
                .field('sessionId', sessionId)
                .field('index', i)
                .attach('chunk', chunkBuffer, 'chunk.part');

            expect(chunkRes.status).toBe(200);
            expect(chunkRes.body.success).toBe(true);
        }

        // 3. Check Status
        const statusRes = await request(app)
            .get(`/api/upload/${sessionId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(statusRes.status).toBe(200);
        expect(statusRes.body.uploadedChunks.length).toBe(totalChunks);

        // 4. Complete
        const completeRes = await request(app)
            .post('/api/upload/complete')
            .set('Authorization', `Bearer ${token}`)
            .send({ sessionId });

        expect(completeRes.status).toBe(200);
        expect(completeRes.body.success).toBe(true);
        expect(completeRes.body.file).toBeDefined();
        expect(completeRes.body.file.name).toBe(fileName);
        expect(completeRes.body.file.size).toBe(fileSize);
    });
});
