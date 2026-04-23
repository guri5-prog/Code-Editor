import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IFile extends Document {
  projectId: Types.ObjectId;
  path: string;
  content: string;
  language: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    path: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    language: { type: String, required: true },
    version: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as object).toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

fileSchema.index({ projectId: 1, path: 1 }, { unique: true });

export const FileModel = mongoose.model<IFile>('File', fileSchema);
