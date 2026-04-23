import { FileVersionModel } from '../models/FileVersion.model.js';

const MAX_VERSIONS_PER_FILE = 50;

class VersionService {
  async createVersion(fileId: string, content: string, retries = 3): Promise<number> {
    const latest = await FileVersionModel.findOne({ fileId })
      .sort({ version: -1 })
      .select('version')
      .lean();

    const version = (latest?.version ?? 0) + 1;

    try {
      await FileVersionModel.create({ fileId, version, content });
    } catch (err: unknown) {
      if (
        retries > 0 &&
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        return this.createVersion(fileId, content, retries - 1);
      }
      throw err;
    }

    await this.pruneOldVersions(fileId);

    return version;
  }

  private async pruneOldVersions(fileId: string): Promise<void> {
    try {
      const stale = await FileVersionModel.find({ fileId })
        .sort({ version: -1 })
        .skip(MAX_VERSIONS_PER_FILE)
        .select('_id')
        .lean();

      if (stale.length > 0) {
        await FileVersionModel.deleteMany({
          _id: { $in: stale.map((d) => d._id) },
        });
      }
    } catch (err) {
      console.error('Version pruning failed:', err);
    }
  }

  async getVersions(fileId: string): Promise<Array<{ version: number; timestamp: string }>> {
    const docs = await FileVersionModel.find({ fileId })
      .sort({ version: -1 })
      .select('version timestamp')
      .lean();

    return docs.map((d) => ({
      version: d.version,
      timestamp: d.timestamp.toISOString(),
    }));
  }

  async getVersionContent(fileId: string, version: number): Promise<string | null> {
    const doc = await FileVersionModel.findOne({ fileId, version }).lean();
    return doc?.content ?? null;
  }
}

export const versionService = new VersionService();
