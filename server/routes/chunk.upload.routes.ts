import { Router, Response, NextFunction } from 'express';
import { ChunkUploadService } from '../services/chunk.upload.service';
import { upload } from '../clients/file.handler';
import { authenticate } from '../middleware/auth.middleware';
import { ApiError } from '../middleware/error-handler';
import { ExtendedRequest } from '../types/extended.request';

const router = Router();
const chunkUploadService = new ChunkUploadService();

/**
 * @swagger
 * /api/file/chunk:
 *   post:
 *     summary: Upload a file chunk
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: X-Upload-Id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: X-Chunk-Index
 *         required: true
 *         schema:
 *           type: integer
 *       - in: header
 *         name: X-Total-Chunks
 *         required: true
 *         schema:
 *           type: integer
 *       - in: header
 *         name: X-File-Name
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: X-File-Size
 *         required: true
 *         schema:
 *           type: integer
 *       - in: header
 *         name: X-Mime-Type
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               chunk:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Chunk uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/file/chunk',
  authenticate,
  upload.single('chunk'),
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'User not authenticated');
      }

      if (!req.file) {
        throw new ApiError(400, 'No chunk provided');
      }

      const uploadId = req.headers['x-upload-id'] as string;
      const chunkIndex = parseInt(req.headers['x-chunk-index'] as string);
      const totalChunks = parseInt(req.headers['x-total-chunks'] as string);
      const fileName = req.headers['x-file-name'] as string;
      const fileSize = parseInt(req.headers['x-file-size'] as string);
      const mimeType = req.headers['x-mime-type'] as string;

      if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName || isNaN(fileSize)) {
        throw new ApiError(400, 'Missing or invalid chunk metadata');
      }

      const result = await chunkUploadService.handleChunkUpload(
        userId,
        uploadId,
        chunkIndex,
        totalChunks,
        fileName,
        fileSize,
        mimeType,
        req.file.buffer
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/file/chunk/finalize:
 *   post:
 *     summary: Finalize a chunked upload
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uploadId
 *               - fileName
 *               - fileSize
 *               - totalChunks
 *             properties:
 *               uploadId:
 *                 type: string
 *               fileName:
 *                 type: string
 *               fileSize:
 *                 type: integer
 *               mimeType:
 *                 type: string
 *               totalChunks:
 *                 type: integer
 *     responses:
 *       201:
 *         description: File assembled and uploaded successfully
 *       400:
 *         description: Invalid request or incomplete upload
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Upload not found
 */
router.post(
  '/file/chunk/finalize',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'User not authenticated');
      }

      const { uploadId, fileName, fileSize, mimeType, totalChunks } = req.body;

      if (!uploadId || !fileName || !fileSize || !totalChunks) {
        throw new ApiError(400, 'Missing required fields');
      }

      const result = await chunkUploadService.finalizeUpload(
        userId,
        uploadId,
        fileName,
        fileSize,
        mimeType || 'application/octet-stream',
        totalChunks
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/file/chunk/{uploadId}:
 *   get:
 *     summary: Get upload status
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Upload status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Upload not found
 */
router.get(
  '/file/chunk/:uploadId',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'User not authenticated');
      }

      const { uploadId } = req.params;

      if (!uploadId) {
        throw new ApiError(400, 'Upload ID required');
      }

      const status = await chunkUploadService.getUploadStatus(uploadId);

      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/file/chunk/{uploadId}:
 *   delete:
 *     summary: Cancel an upload
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Upload canceled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Upload not found
 */
router.delete(
  '/file/chunk/:uploadId',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'User not authenticated');
      }

      const { uploadId } = req.params;

      if (!uploadId) {
        throw new ApiError(400, 'Upload ID required');
      }

      const result = await chunkUploadService.cancelUpload(uploadId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
