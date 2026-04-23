export type CollabPermission = 'edit' | 'view' | 'execute';

export interface CollabUser {
  userId: string;
  displayName: string;
  color: string;
  cursor?: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

export interface RoomState {
  projectId: string;
  fileId: string;
  users: CollabUser[];
}

export interface ShareTokenPayload {
  projectId: string;
  permission: CollabPermission;
}

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  content: string;
  timestamp: number;
}
