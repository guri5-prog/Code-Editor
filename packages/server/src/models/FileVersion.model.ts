import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IFileVersion extends Document {
  fileId: Types.ObjectId;
  version: number;
  content: string;
  timestamp: Date;
}

const fileVersionSchema = new Schema<IFileVersion>({
  fileId: { type: Schema.Types.ObjectId, ref: 'File', required: true, index: true },
  version: { type: Number, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

fileVersionSchema.index({ fileId: 1, version: -1 }, { unique: true });

export const FileVersionModel = mongoose.model<IFileVersion>('FileVersion', fileVersionSchema);
