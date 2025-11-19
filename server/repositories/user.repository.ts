import { User, Subscription, File } from '../models';
import { UserTier } from '../models/user.model';

export class UserRepository {
  async findById(id: string, includeDeleted = false): Promise<User | null> {
    const whereClause = includeDeleted ? { id } : { id, isDeleted: false };

    return await User.findOne({
      where: whereClause,
      include: [
        {
          model: Subscription,
          as: 'subscriptions',
          through: { attributes: [] },
        },
      ],
    });
  }

  async findByEmail(email: string, includeDeleted = false): Promise<User | null> {
    const whereClause = includeDeleted ? { email } : { email, isDeleted: false };

    return await User.findOne({
      where: whereClause,
      include: [
        {
          model: Subscription,
          as: 'subscriptions',
          through: { attributes: [] },
        },
      ],
    });
  }

  async create(data: { name: string; email: string; tier?: UserTier }): Promise<User> {
    return await User.create(data);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    await user.update(data);
    return user;
  }

  async softDelete(id: string): Promise<boolean> {
    const user = await this.findById(id);
    if (!user) return false;

    await user.update({ isDeleted: true });
    return true;
  }

  async getUserWithFiles(userId: string): Promise<User | null> {
    return await User.findOne({
      where: { id: userId, isDeleted: false },
      include: [
        {
          model: File,
          as: 'files',
          where: { isDeleted: false },
          required: false,
          through: { attributes: [] },
        },
        {
          model: Subscription,
          as: 'subscriptions',
          through: { attributes: [] },
        },
      ],
    });
  }

  async getTotalFileCount(userId: string): Promise<number> {
    const user = await User.findByPk(userId);
    if (!user) return 0;

    return await user.countFiles({
      where: { isDeleted: false },
    });
  }

  async getTotalFileSize(userId: string): Promise<number> {
    const user = await this.getUserWithFiles(userId);
    if (!user) return 0;

    const files = await user.getFiles({
      where: { isDeleted: false },
      attributes: ['size'],
    });

    return files.reduce((total: number, file) => {
      const fileData = file.get({ plain: true }) as { size: number };
      return total + fileData.size;
    }, 0);
  }
}
