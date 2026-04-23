import mongoose, { Schema, type Document } from 'mongoose';
import * as Y from 'yjs';

interface IYDoc extends Document {
  docName: string;
  state: Buffer;
  updatedAt: Date;
}

const yDocSchema = new Schema<IYDoc>(
  {
    docName: { type: String, required: true, unique: true, index: true },
    state: { type: Buffer, required: true },
  },
  { timestamps: true },
);

const YDocModel = mongoose.model<IYDoc>('YDoc', yDocSchema);

export async function loadDocState(docName: string): Promise<Uint8Array | null> {
  const doc = await YDocModel.findOne({ docName }).lean();
  if (!doc?.state) return null;
  return new Uint8Array(doc.state);
}

export async function saveDocState(docName: string, ydoc: Y.Doc): Promise<void> {
  const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
  await YDocModel.findOneAndUpdate({ docName }, { state, updatedAt: new Date() }, { upsert: true });
}

export async function deleteDocState(docName: string): Promise<void> {
  await YDocModel.deleteOne({ docName });
}
