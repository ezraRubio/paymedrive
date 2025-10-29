import request from 'supertest';
import app from '../../app';
import { generateOTP, storeOTP } from '../../utils/otp.util';
import '../setup';

describe('File Endpoints', () => {
  let authToken: string;
  let uploadedFileId: string;

  beforeEach(async () => {
    const email = 'file@example.com';
    const otp = generateOTP();
    storeOTP(email, otp);

    const response = await request(app)
      .post('/api/otp')
      .send({
        email,
        otp,
        name: 'File User',
      });

    authToken = response.body.token;
  });

  describe('POST /api/file', () => {
    it('should upload a file', async () => {
      const response = await request(app)
        .post('/api/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeDefined();
      expect(response.body.file.id).toBeDefined();
      expect(response.body.file.name).toBe('test.txt');

      uploadedFileId = response.body.file.id;
    });

    it('should reject upload without token', async () => {
      await request(app)
        .post('/api/file')
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(401);
    });

    it('should reject upload without file', async () => {
      await request(app)
        .post('/api/file')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should include file metadata in response', async () => {
      const response = await request(app)
        .post('/api/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test content'), 'document.pdf')
        .expect(201);

      expect(response.body.file.size).toBeDefined();
      expect(response.body.file.format).toBe('pdf');
      expect(response.body.file.createdAt).toBeDefined();
    });
  });

  describe('GET /api/files', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test'), 'test1.txt');

      await request(app)
        .post('/api/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test'), 'test2.txt');
    });

    it('should list all user files', async () => {
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.files).toBeDefined();
      expect(response.body.count).toBeGreaterThanOrEqual(2);
    });

    it('should reject without token', async () => {
      await request(app)
        .get('/api/files')
        .expect(401);
    });
  });

  describe('GET /api/file', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('download test'), 'download.txt');

      uploadedFileId = response.body.file.id;
    });

    it('should download a file', async () => {
      const response = await request(app)
        .get(`/api/file?id=${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.header['content-type']).toBe('application/octet-stream');
      expect(response.header['content-disposition']).toContain('download.txt');
    });

    it('should reject download without token', async () => {
      await request(app)
        .get(`/api/file?id=${uploadedFileId}`)
        .expect(401);
    });

    it('should reject download with invalid file ID', async () => {
      await request(app)
        .get('/api/file?id=invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });

    it('should reject download of non-existent file', async () => {
      await request(app)
        .get('/api/file?id=123e4567-e89b-12d3-a456-426614174999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/file/metadata', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('metadata test'), 'metadata.txt');

      uploadedFileId = response.body.file.id;
    });

    it('should get file metadata', async () => {
      const response = await request(app)
        .get(`/api/file/metadata?id=${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeDefined();
      expect(response.body.file.name).toBe('metadata.txt');
      expect(response.body.file.size).toBeDefined();
      expect(response.body.file.format).toBe('txt');
    });

    it('should reject without token', async () => {
      await request(app)
        .get(`/api/file/metadata?id=${uploadedFileId}`)
        .expect(401);
    });
  });

  describe('DELETE /api/file', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('delete test'), 'delete.txt');

      uploadedFileId = response.body.file.id;
    });

    it('should delete a file', async () => {
      const response = await request(app)
        .delete(`/api/file?id=${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should reject delete without token', async () => {
      await request(app)
        .delete(`/api/file?id=${uploadedFileId}`)
        .expect(401);
    });

    it('should reject delete with invalid file ID', async () => {
      await request(app)
        .delete('/api/file?id=invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });

    it('should not allow downloading deleted file', async () => {
      await request(app)
        .delete(`/api/file?id=${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      await request(app)
        .get(`/api/file?id=${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
