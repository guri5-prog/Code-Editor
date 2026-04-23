import mongoose, { Schema, type Document } from 'mongoose';

export interface ITemplateFile {
  path: string;
  language: string;
  content: string;
}

export interface ITemplate extends Document {
  name: string;
  description: string;
  language: string;
  tags: string[];
  files: ITemplateFile[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const templateFileSchema = new Schema<ITemplateFile>(
  {
    path: { type: String, required: true, trim: true },
    language: { type: String, required: true, trim: true },
    content: { type: String, required: true },
  },
  { _id: false },
);

const templateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    language: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    files: { type: [templateFileSchema], default: [] },
    createdBy: { type: String, trim: true },
  },
  { timestamps: true },
);

export const TemplateModel = mongoose.model<ITemplate>('Template', templateSchema);
