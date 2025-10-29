import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented in Phase 5
router.get('/files', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet - Phase 5' });
});

router.get('/file', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet - Phase 5' });
});

router.post('/file', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet - Phase 5' });
});

router.delete('/file', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet - Phase 5' });
});

export default router;
