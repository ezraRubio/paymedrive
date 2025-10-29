import { DataTypes, Model, Optional } from 'sequelize';
import { getSequelize } from '../clients/db';
import { UserTier } from './user.model';

interface SubscriptionAttributes {
  id: string;
  tier: UserTier;
  limitSize: number | null;
  limitItems: number | null;
}

interface SubscriptionCreationAttributes extends Optional<SubscriptionAttributes, 'id'> {}

export class Subscription extends Model<SubscriptionAttributes, SubscriptionCreationAttributes> implements SubscriptionAttributes {
  declare id: string;
  declare tier: UserTier;
  declare limitSize: number | null;
  declare limitItems: number | null;
}

export const initSubscriptionModel = () => {
  const sequelize = getSequelize();

  Subscription.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tier: {
        type: DataTypes.ENUM(...Object.values(UserTier)),
        allowNull: false,
        unique: true,
      },
      limitSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      limitItems: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },
    },
    {
      sequelize,
      tableName: 'subscriptions',
      timestamps: false,
    }
  );

  return Subscription;
};
