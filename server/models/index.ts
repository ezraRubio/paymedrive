import { User, initUserModel } from './user.model';
import { File, initFileModel } from './file.model';
import { Subscription, initSubscriptionModel } from './subscription.model';
import { UserFiles, initUserFilesModel } from './user.files.model';
import { UserSubscription, initUserSubscriptionModel } from './user.subscription.model';
import { UploadSession, initUploadSessionModel } from './upload.session.model';
import { logger } from '../utils/logger';

export const initializeModels = () => {
  logger.info('Initializing database models...');

  initUserModel();
  initFileModel();
  initSubscriptionModel();
  initUserFilesModel();
  initUserSubscriptionModel();
  initUploadSessionModel();

  setupAssociations();

  logger.info('Database models initialized successfully');
};

const setupAssociations = () => {
  // User hasMany Files through UserFiles
  User.belongsToMany(File, {
    through: UserFiles,
    foreignKey: 'userId',
    otherKey: 'fileId',
    as: 'files',
  });

  // File belongsToMany Users through UserFiles
  File.belongsToMany(User, {
    through: UserFiles,
    foreignKey: 'fileId',
    otherKey: 'userId',
    as: 'users',
  });

  // User hasOne Subscription through UserSubscription
  User.belongsToMany(Subscription, {
    through: UserSubscription,
    foreignKey: 'userId',
    otherKey: 'subscriptionId',
    as: 'subscriptions',
  });

  // Subscription hasMany Users through UserSubscription
  Subscription.belongsToMany(User, {
    through: UserSubscription,
    foreignKey: 'subscriptionId',
    otherKey: 'userId',
    as: 'users',
  });

  // User hasMany UploadSessions
  User.hasMany(UploadSession, {
    foreignKey: 'userId',
    as: 'uploadSessions',
  });

  UploadSession.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  logger.info('Model associations established');
};

export { User, File, Subscription, UserFiles, UserSubscription, UploadSession };
