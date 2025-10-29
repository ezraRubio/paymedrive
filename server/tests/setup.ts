import { Sequelize } from 'sequelize';
import { initializeModels } from '../models';

let sequelize: Sequelize;

export const setupTestDatabase = async () => {
  sequelize = new Sequelize('sqlite::memory:', {
    logging: false,
  });

  initializeModels();

  await sequelize.sync({ force: true });
};

export const teardownTestDatabase = async () => {
  if (sequelize) {
    await sequelize.close();
  }
};

export const cleanupTestDatabase = async () => {
  if (sequelize) {
    await sequelize.sync({ force: true });
  }
};

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

afterEach(async () => {
  await cleanupTestDatabase();
});
