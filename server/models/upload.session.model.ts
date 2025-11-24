import { DataTypes, Model, Optional } from 'sequelize';
import { getSequelize } from '../clients/db';

export enum UploadStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

interface UploadSessionAttributes {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  uploadedChunks: number[]; // Array of chunk indices
  status: UploadStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UploadSessionCreationAttributes
  extends Optional<
    UploadSessionAttributes,
    'id' | 'uploadedChunks' | 'status' | 'createdAt' | 'updatedAt'
  > {}

export class UploadSession
  extends Model<UploadSessionAttributes, UploadSessionCreationAttributes>
  implements UploadSessionAttributes
{
  declare id: string;
  declare userId: string;
  declare fileName: string;
  declare fileSize: number;
  declare mimeType: string;
  declare totalChunks: number;
  declare uploadedChunks: number[];
  declare status: UploadStatus;
  declare expiresAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initUploadSessionModel = () => {
  const sequelize = getSequelize();

  UploadSession.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fileSize: {
        type: DataTypes.BIGINT, // Use BIGINT for large files
        allowNull: false,
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      totalChunks: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      uploadedChunks: {
        type: DataTypes.JSON, // Store as JSON array
        allowNull: false,
        defaultValue: [],
      },
      status: {
        type: DataTypes.ENUM(...Object.values(UploadStatus)),
        allowNull: false,
        defaultValue: UploadStatus.PENDING,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'upload_sessions',
      timestamps: true,
    }
  );

  return UploadSession;
};
