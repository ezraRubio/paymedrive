import { DataTypes, FindOptions, Model, Optional } from 'sequelize';
import { getSequelize } from '../clients/db';

interface FileAttributes {
  id: string;
  name: string;
  location: string;
  size: number;
  format: string;
  isDeleted: boolean;
  createdAt: Date;
  modifyAt: Date;
}

interface FileCreationAttributes
  extends Optional<FileAttributes, 'id' | 'isDeleted' | 'createdAt' | 'modifyAt'> {}

export class File extends Model<FileAttributes, FileCreationAttributes> implements FileAttributes {
  declare id: string;
  declare name: string;
  declare location: string;
  declare size: number;
  declare format: string;
  declare isDeleted: boolean;
  declare readonly createdAt: Date;
  declare modifyAt: Date;

  // Association methods (added by Sequelize)
  declare getUsers: <M extends Model = Model>(options?: FindOptions) => Promise<M[]>;
  declare addUser: (user: string | Model, options?: FindOptions) => Promise<void>;
  declare removeUser: (user: string | Model, options?: FindOptions) => Promise<void>;
}

export const initFileModel = () => {
  const sequelize = getSequelize();

  File.init(
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
      location: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      format: {
        type: DataTypes.STRING,
        allowNull: false,
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
      tableName: 'files',
      timestamps: false,
      hooks: {
        beforeUpdate: (file: File) => {
          file.modifyAt = new Date();
        },
      },
    }
  );

  return File;
};
