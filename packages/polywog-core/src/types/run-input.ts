export interface AttachmentSummary {
  filename: string;
  mimeType: string;
  size: number;
  tags?: string[];
}

export interface RequestMetadata {
  userId?: string;
  workspaceId?: string;
  source?: string;
  timestamp?: string;
  requestId?: string;
}

export interface SystemContext {
  activeProject?: string;
  mode?: string;
  constraints?: string[];
  featureFlags?: Record<string, boolean>;
}

export type FormatProfile = 'chat' | 'api' | 'dashboard' | 'compact';

export interface Preferences {
  internalFirst?: boolean;
  preferSpeed?: boolean;
  preferAccuracy?: boolean;
  preferLowCost?: boolean;
  allowParallel?: boolean;
  formatProfile?: FormatProfile;
  includeDebug?: boolean;
}

export interface RuntimeOverrides {
  availableSpokes?: string[];
  disabledSpokes?: string[];
  offlineMode?: boolean;
  mockData?: Record<string, unknown>;
}

export interface PolywogRunInput {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  metadata?: RequestMetadata;
  attachments?: AttachmentSummary[];
  systemContext?: SystemContext;
  preferences?: Preferences;
  runtimeOverrides?: RuntimeOverrides;
  debug?: boolean;
}
