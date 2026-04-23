import mongoose from 'mongoose';
import { env } from '../config/env.js';

export async function connectMongo(): Promise<void> {
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

export function isMongoHealthy(): boolean {
  return mongoose.connection.readyState === 1;
}
