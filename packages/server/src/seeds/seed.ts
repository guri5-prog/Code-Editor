import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.model.js';
import { ProjectModel } from '../models/Project.model.js';
import { FileModel } from '../models/File.model.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/code-editor';

async function seed(): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  await UserModel.deleteMany({});
  await ProjectModel.deleteMany({});
  await FileModel.deleteMany({});
  console.log('Cleared existing data');

  const passwordHash = await bcrypt.hash('password123', 12);

  const testUser = await UserModel.create({
    email: 'test@example.com',
    passwordHash,
    displayName: 'Test User',
  });
  console.log(`Created test user: ${testUser.email}`);

  const project = await ProjectModel.create({
    ownerId: testUser._id,
    name: 'Hello World',
    description: 'A sample project to get started',
    language: 'javascript',
    isPublic: true,
  });
  console.log(`Created project: ${project.name}`);

  await FileModel.create({
    projectId: project._id,
    path: 'index.js',
    content: 'console.log("Hello, World!");\n',
    language: 'javascript',
  });

  await FileModel.create({
    projectId: project._id,
    path: 'README.md',
    content: '# Hello World\n\nA sample project created by the seed script.\n',
    language: 'markdown',
  });
  console.log('Created sample files');

  await mongoose.disconnect();
  console.log('Seed complete');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
