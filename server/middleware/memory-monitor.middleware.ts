import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from './error-handler';

// Memory thresholds in bytes
const MEMORY_WARNING_THRESHOLD = 1024 * 1024 * 1024; // 1GB
const MEMORY_CRITICAL_THRESHOLD = 2 * 1024 * 1024 * 1024; // 2GB
const CHECK_INTERVAL_MS = 30000; // 30 seconds

let lastMemoryCheck = 0;
let lastMemoryUsage = 0;

/**
 * Get current memory usage
 */
export function getMemoryUsage(): {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
} {
  const memUsage = process.memoryUsage();
  return {
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    rss: memUsage.rss,
    external: memUsage.external,
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if memory usage is above threshold
 */
export function isMemoryCritical(): boolean {
  const memUsage = getMemoryUsage();
  return memUsage.heapUsed > MEMORY_CRITICAL_THRESHOLD;
}

/**
 * Log memory usage periodically
 */
function logMemoryUsage(): void {
  const now = Date.now();
  
  if (now - lastMemoryCheck < CHECK_INTERVAL_MS) {
    return;
  }

  lastMemoryCheck = now;
  const memUsage = getMemoryUsage();
  lastMemoryUsage = memUsage.heapUsed;

  if (memUsage.heapUsed > MEMORY_CRITICAL_THRESHOLD) {
    logger.error('CRITICAL: Memory usage above threshold', {
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
      rss: formatBytes(memUsage.rss),
      external: formatBytes(memUsage.external),
    });
  } else if (memUsage.heapUsed > MEMORY_WARNING_THRESHOLD) {
    logger.warn('WARNING: High memory usage detected', {
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
      rss: formatBytes(memUsage.rss),
    });
  } else {
    logger.info('Memory usage check', {
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
    });
  }
}

/**
 * Middleware to monitor memory usage and reject requests if memory is critical
 */
export function memoryMonitor(req: Request, _res: Response, next: NextFunction): void {
  // Only log memory periodically, not on every request
  // logMemoryUsage() already has throttling built in
  
  // For upload endpoints, check if we have enough memory
  if (req.path.includes('/chunk') || req.path.includes('/file')) {
    // Log memory only for upload endpoints
    logMemoryUsage();
    
    if (isMemoryCritical()) {
      logger.error('Rejecting upload request due to critical memory usage', {
        path: req.path,
        heapUsed: formatBytes(lastMemoryUsage),
      });
      
      return next(
        new ApiError(
          503,
          'Server is experiencing high load. Please try again in a few moments.'
        )
      );
    }
  }

  next();
}

/**
 * Force garbage collection if available (requires --expose-gc flag)
 */
export function forceGarbageCollection(): void {
  if (global.gc) {
    logger.info('Forcing garbage collection');
    global.gc();
  }
}

/**
 * Get memory usage statistics
 */
export function getMemoryStats(): {
  heapUsed: string;
  heapTotal: string;
  rss: string;
  external: string;
  percentUsed: number;
} {
  const memUsage = getMemoryUsage();
  const percentUsed = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  return {
    heapUsed: formatBytes(memUsage.heapUsed),
    heapTotal: formatBytes(memUsage.heapTotal),
    rss: formatBytes(memUsage.rss),
    external: formatBytes(memUsage.external),
    percentUsed: Math.round(percentUsed * 100) / 100,
  };
}
