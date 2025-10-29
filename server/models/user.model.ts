import { DataTypes, Model, Optional } from 'sequelize';
import { getSequelize } from '../clients/db';

export enum UserTier {
  FREE = 'free',
  PRO = 'pro',
  UNLIMITED = 'unlimited',
}

interface UserAttributes {
  id: string;
  name: string;
  email: string;
  tier: UserTier;
  isAdmin: boolean;
  accessToken: string | null;
  isDeleted: boolean;
  createdAt: Date;
  modifyAt: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'tier' | 'isAdmin' | 'accessToken' | 'isDeleted' | 'createdAt' | 'modifyAt'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare name: string;
  declare email: string;
  declare tier: UserTier;
  declare isAdmin: boolean;
  declare accessToken: string | null;
  declare isDeleted: boolean;
  declare readonly createdAt: Date;
  declare modifyAt: Date;

  // Association methods (added by Sequelize)
  declare getFiles: (options?: any) => Promise<any[]>;
  declare countFiles: (options?: any) => Promise<number>;
  declare addFile: (file: any, options?: any) => Promise<void>;
  declare removeFile: (file: any, options?: any) => Promise<void>;
}

export const initUserModel = () => {
  const sequelize = getSequelize();

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      tier: {
        type: DataTypes.ENUM(...Object.values(UserTier)),
        allowNull: false,
        defaultValue: UserTier.FREE,
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      modifyAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'users',
      timestamps: false,
      hooks: {
        beforeUpdate: (user: User) => {
          user.modifyAt = new Date();
        },
      },
    }
  );

  return User;
};
