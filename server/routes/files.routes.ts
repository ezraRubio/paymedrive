import { Router, Response, NextFunction } from 'express';
import { FileService } from '../services/files.service';
import { upload, handleMulterError } from '../clients/file.handler';
import { authenticate } from '../middleware/auth.middleware';
import { ApiError } from '../middleware/error-handler';
import { ExtendedRequest } from '../types/extended.request';
import { fileIdSchema, validate } from '../utils/validations/files.validation';

const router = Router();
const fileService = new FileService();

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: List all user files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user files
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/files',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'User not authenticated');
      }

      const files = await fileService.listUserFiles(userId);
      console.log(files, 'files');

      res.status(200).json({
        success: true,
        count: files.length,
        files,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/file:
 *   post:
 *     summary: Upload a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: No file provided or invalid file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Quota exceeded
 */
router.post(
  '/file',
  authenticate,
  upload.single('file'),
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'User not authenticated');
      }

      if (!req.file) {
        throw new ApiError(400, 'No file provided');
      }

      const result = await fileService.uploadFile(userId, req.file);

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        file: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        const multerError = handleMulterError(error);
        next(new ApiError(400, multerError));
      } else {
        next(error);
      }
    }
  }
);

/**
 * @swagger
 * /api/file:
 *   get:
 *     summary: Download a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: File not found
 */
router.get(
  '/file',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'User not authenticated');
      }

      const validatedData = validate(fileIdSchema)(req.query);
      const result = await fileService.getFileById(userId, validatedData.id);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${result.name}"`);
      res.setHeader('Content-Length', result.size);

      res.send(result.file);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/file/metadata:
 *   get:
 *     summary: Get file metadata
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File metadata retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: File not found
 */
router.get(
  '/file/metadata',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'User not authenticated');
      }

      const validatedData = validate(fileIdSchema)(req.query);
      const metadata = await fileService.getFileMetadata(userId, validatedData.id);

      res.status(200).json({
        success: true,
        file: metadata,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/file:
 *   delete:
 *     summary: Delete a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: File not found
 */
router.delete(
  '/file',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new ApiError(401, 'User not authenticated');
      }

      const validatedData = validate(fileIdSchema)(req.query);
      const result = await fileService.deleteFile(userId, validatedData.id);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/upload/init:
 *   post:
 *     summary: Initiate a chunked upload session
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileSize
 *               - mimeType
 *             properties:
 *               fileName:
 *                 type: string
 *               fileSize:
 *                 type: integer
 *               mimeType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Upload session initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 chunkSize:
 *                   type: integer
 */
router.post(
  '/upload/init',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    console.log("upload? ")
    try {
      const userId = req.user?.userId;
      if (!userId) throw new ApiError(401, 'User not authenticated');

      const { fileName, fileSize, mimeType } = req.body;

      if (!fileName || !fileSize || !mimeType) {
        throw new ApiError(400, 'Missing required fields');
      }

      const result = await fileService.initiateUpload(
        userId,
        fileName,
        fileSize,
        mimeType
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/upload/chunk:
 *   post:
 *     summary: Upload a file chunk
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - chunk
 *               - sessionId
 *               - index
 *             properties:
 *               chunk:
 *                 type: string
 *                 format: binary
 *               sessionId:
 *                 type: string
 *               index:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Chunk uploaded successfully
 */
router.post(
  '/upload/chunk',
  authenticate,
  upload.single('chunk'),
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new ApiError(401, 'User not authenticated');

      if (!req.file) throw new ApiError(400, 'No chunk provided');

      const { sessionId, index } = req.body;

      if (!sessionId || index === undefined) {
        throw new ApiError(400, 'Missing sessionId or index');
      }

      const result = await fileService.uploadChunk(
        userId,
        sessionId,
        parseInt(index),
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
 * /api/upload/complete:
 *   post:
 *     summary: Complete a chunked upload session
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Upload completed and file created
 */
router.post(
  '/upload/complete',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new ApiError(401, 'User not authenticated');

      const { sessionId } = req.body;

      if (!sessionId) {
        throw new ApiError(400, 'Missing sessionId');
      }

      const result = await fileService.completeUpload(userId, sessionId);

      res.status(200).json({
        success: true,
        message: 'Upload completed successfully',
        file: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/upload/{sessionId}:
 *   get:
 *     summary: Get upload session status
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Upload status
 */
router.get(
  '/upload/:sessionId',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new ApiError(401, 'User not authenticated');

      const { sessionId } = req.params;

      const result = await fileService.getUploadStatus(userId, sessionId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/upload/{sessionId}:
 *   delete:
 *     summary: Cancel an upload session
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Upload cancelled
 */
router.delete(
  '/upload/:sessionId',
  authenticate,
  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new ApiError(401, 'User not authenticated');

      const { sessionId } = req.params;

      await fileService.cancelUpload(userId, sessionId);

      res.status(200).json({
        success: true,
        message: 'Upload cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);
export default router;
