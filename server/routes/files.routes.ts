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
router.get('/files', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const files = await fileService.listUserFiles(userId);

    res.status(200).json({
      success: true,
      count: files.length,
      files,
    });
  } catch (error) {
    next(error);
  }
});

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
      if (error && typeof error === 'object' && 'code' in error) {
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
router.get('/file', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
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
});

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
router.get('/file/metadata', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
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
});

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
router.delete('/file', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
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
});

export default router;
