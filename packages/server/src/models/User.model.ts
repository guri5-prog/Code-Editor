import mongoose, { Schema, type Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  displayName: string;
  avatar?: string;
  oauthProviders: Array<{ provider: string; providerId: string }>;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    displayName: { type: String, required: true, trim: true },
    avatar: { type: String },
    oauthProviders: [
      {
        provider: { type: String, required: true },
        providerId: { type: String, required: true },
        _id: false,
      },
    ],
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as object).toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
      },
    },
  },
);

export const UserModel = mongoose.model<IUser>('User', userSchema);
