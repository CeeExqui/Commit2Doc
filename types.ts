export enum CommitSource {
  GITHUB = 'GITHUB',
  AZURE = 'AZURE',
  MANUAL = 'MANUAL'
}

export interface Commit {
  id: string;
  hash: string;
  message: string;
  diff: string;
  author?: string;
  date?: string;
  source: CommitSource;
}

export interface GenerationConfig {
  extraInfo: string;
  setupInstructions: string;
  previousDocContent: string | null;
}

export interface DocumentationResult {
  markdown: string;
  generatedAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}