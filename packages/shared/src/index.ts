export type { User, AuthPayload } from './types/user.js';
export type { UserSettings } from './types/settings.js';
export type { Project, FileNode } from './types/project.js';
export type { ProjectTemplate, ProjectTemplateFile } from './types/template.js';
export type { EditorSettings } from './types/editor.js';
export { DEFAULT_EDITOR_SETTINGS } from './types/editor.js';

export type { LanguageConfig } from './constants/languages.js';
export { SUPPORTED_LANGUAGES, getLanguageByExtension } from './constants/languages.js';

export {
  registerSchema,
  loginSchema,
  type RegisterInput,
  type LoginInput,
} from './schemas/auth.js';

export {
  fileSaveSchema,
  filePatchSchema,
  fileCreateSchema,
  fileUpdateSchema,
  type FileSaveInput,
  type FilePatchInput,
  type FileCreateInput,
  type FileUpdateInput,
} from './schemas/file.js';

export {
  templateFileSchema,
  templateCreateSchema,
  type TemplateCreateInput,
} from './schemas/template.js';

export type {
  ExecutionStatus,
  ExecutionRequest,
  ExecutionResult,
  ExecutionHistoryEntry,
  TerminalTabInfo,
  ReplClientMessage,
  ReplServerMessage,
  ReplEvalMessage,
  ReplResetMessage,
  ReplResultMessage,
  ReplErrorMessage,
  ReplReadyMessage,
  ExecutionClientMessage,
  ExecutionStartMessage,
  ExecutionStdinMessage,
  ExecutionStopMessage,
  ExecutionServerMessage,
  ExecutionStartedMessage,
  ExecutionOutputMessage,
  ExecutionExitMessage,
  ExecutionWsErrorMessage,
} from './types/execution.js';

export { executeSchema, type ExecuteInput } from './schemas/execution.js';

export { settingsSchema, type SettingsInput } from './schemas/settings.js';

export { DEFAULT_USER_SETTINGS } from './constants/defaults.js';

export type {
  CollabPermission,
  CollabUser,
  RoomState,
  ShareTokenPayload,
  ChatMessage,
} from './types/collab.js';

export type { BuiltInThemeId, ThemeConfig, ThemeColors } from './constants/themes.js';
export {
  BUILT_IN_THEMES,
  THEME_COLOR_KEYS,
  THEME_COLOR_DEFAULTS,
  DARK_COLORS,
  LIGHT_COLORS,
  HIGH_CONTRAST_COLORS,
} from './constants/themes.js';

export {
  projectCreateSchema,
  projectUpdateSchema,
  collaboratorSchema,
  collaboratorPermissionSchema,
  projectListQuerySchema,
  type ProjectCreateInput,
  type ProjectUpdateInput,
  type CollaboratorInput,
  type CollaboratorPermissionInput,
  type ProjectListQueryInput,
} from './schemas/project.js';
