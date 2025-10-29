import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../clients/db';

interface UserFilesAttributes {
  userId: string;
  fileId: string;
}

export class UserFiles extends Model<UserFilesAttributes> implements UserFilesAttributes {
  declare userId: string;
  declare fileId: string;
}

export const initUserFilesModel = () => {
  const sequelize = getSequelize();

  UserFiles.init(
    {
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      fileId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'files',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    },
    {
      sequelize,
      tableName: 'user_files',
      timestamps: false,
    }
  );

  return UserFiles;
};
