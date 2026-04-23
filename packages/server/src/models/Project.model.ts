import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IProject extends Document {
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  language: string;
  isPublic: boolean;
  collaborators: Array<{
    userId: Types.ObjectId;
    permission: 'edit' | 'view' | 'execute';
  }>;
  template?: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    language: { type: String, required: true },
    isPublic: { type: Boolean, default: false },
    collaborators: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        permission: { type: String, enum: ['edit', 'view', 'execute'], default: 'view' },
        _id: false,
      },
    ],
    template: { type: String },
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

export const ProjectModel = mongoose.model<IProject>('Project', projectSchema);
