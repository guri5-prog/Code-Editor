import type { AuthPayload } from '@code-editor/shared';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      displayName: string;
      avatar?: string;
      createdAt: string;
      updatedAt: string;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    authPayload?: AuthPayload;
  }
}
