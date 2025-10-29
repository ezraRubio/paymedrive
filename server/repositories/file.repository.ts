import { File, User } from '../models';

export class FileRepository {
  async findById(id: string, includeDeleted = false): Promise<File | null> {
    const whereClause = includeDeleted ? { id } : { id, isDeleted: false };
    return await File.findOne({ where: whereClause });
  }

  async findByLocation(location: string): Promise<File | null> {
    return await File.findOne({ where: { location } });
  }

  async findByUserId(userId: string, includeDeleted = false): Promise<File[]> {
    const user = await User.findByPk(userId);
    if (!user) return [];

    return await user.getFiles({
      where: includeDeleted ? {} : { isDeleted: false },
    });
  }

  async create(data: {
    name: string;
    location: string;
    size: number;
    format: string;
  }): Promise<File> {
    return await File.create(data);
  }

  async update(id: string, data: Partial<File>): Promise<File | null> {
    const file = await this.findById(id);
    if (!file) return null;

    await file.update(data);
    return file;
  }

  async softDelete(id: string): Promise<boolean> {
    const file = await this.findById(id);
    if (!file) return false;

    await file.update({ isDeleted: true });
    return true;
  }

  async hardDelete(id: string): Promise<boolean> {
    const file = await this.findById(id, true);
    if (!file) return false;

    await file.destroy();
    return true;
  }

  async checkOwnership(fileId: string, userId: string): Promise<boolean> {
    const file = await File.findByPk(fileId);
    if (!file) return false;

    const users = await file.getUsers({
      where: { id: userId },
    });

    return users.length > 0;
  }

  async linkFileToUser(fileId: string, userId: string): Promise<void> {
    const file = await File.findByPk(fileId);
    const user = await User.findByPk(userId);

    if (!file || !user) {
      throw new Error('File or user not found');
    }

    await file.addUser(user);
  }
}
