import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented in Phase 3 & 4
router.get('/users', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet - Phase 4' });
});

router.post('/users', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet - Phase 4' });
});

router.delete('/users', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet - Phase 4' });
});

router.post('/subscribe', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet - Phase 4' });
});

router.post('/auth', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet - Phase 3' });
});

router.post('/otp', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet - Phase 3' });
});

export default router;
