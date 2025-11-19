import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

let sequelize: Sequelize | undefined;

export const initializeDatabase = async (): Promise<void> => {
  const dbPath = process.env.DB_PATH || './data/database.sqlite';
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory: ${dbDir}`);
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.DB_LOGGING === 'true' ? (msg) => logger.debug(msg) : false,
  });

  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    const { initializeModels } = await import('../models');
    initializeModels();

    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database models synchronized');

    const { seedSubscriptions } = await import('../seeders/subscription-seeder');
    await seedSubscriptions();
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
};

export const getSequelize = (): Sequelize => {
  if (!sequelize) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return sequelize;
};
