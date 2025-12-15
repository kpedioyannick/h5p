// Types pour les modules et scénarios

export type Platform = 'learningapps';

export interface ModuleInfo {
  name: string;
  label: string;
  description: string;
  platform: Platform;
}

export interface CreateContentRequest {
  module: string;
  title: string;
  params: Record<string, unknown>;
}

export interface CreateContentResponse {
  success: boolean;
  moduleType?: Platform;
  module?: string;
  title?: string;
  iframeUrl?: string;
  embedCode?: string;
  appId?: string;
  contentId?: number;
  error?: string;
  details?: string;
}

export interface ScenarioParams {
  title: string;
  [key: string]: unknown;
}

export interface ScenarioResult {
  success: boolean;
  iframeUrl?: string;
  appId?: string;
  error?: string;
}

