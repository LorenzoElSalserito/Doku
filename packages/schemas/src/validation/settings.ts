import { z } from 'zod';

export const LanguageSchema = z.enum(['it', 'en', 'es', 'de', 'fr', 'pt']);
export type Language = z.infer<typeof LanguageSchema>;

export const ThemeBaseSchema = z.enum(['light', 'dark']);
export type ThemeBase = z.infer<typeof ThemeBaseSchema>;

export const ThemePreferenceSchema = z.enum(['light', 'dark', 'system', 'custom']);
export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;

const HexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{6})$/, 'Expected a 6-digit hex color like #00A3EE');

export const CustomThemeSchema = z.object({
  mode: ThemeBaseSchema,
  base: HexColorSchema,
  surface: HexColorSchema,
  elevated: HexColorSchema,
  accent: HexColorSchema,
  accentSoft: HexColorSchema,
  textPrimary: HexColorSchema,
  textSecondary: HexColorSchema,
  border: HexColorSchema,
  focusRing: HexColorSchema,
});
export type CustomTheme = z.infer<typeof CustomThemeSchema>;

export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  mode: 'light',
  base: '#F6F3EE',
  surface: '#FDFBF7',
  elevated: '#FFFFFF',
  accent: '#00A3EE',
  accentSoft: '#EEF8FF',
  textPrimary: '#1A1816',
  textSecondary: '#6B6560',
  border: '#E5E0D8',
  focusRing: '#66CBF5',
};

export const DocumentKindSchema = z.enum(['file', 'draft']);
export type DocumentKind = z.infer<typeof DocumentKindSchema>;

export const DocumentSummarySchema = z.object({
  id: z.string().min(1),
  kind: DocumentKindSchema,
  title: z.string().min(1),
  path: z.string().min(1).optional(),
  snippet: z.string(),
  lastOpenedAt: z.string().min(1),
});
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;

export const DocumentSessionSchema = DocumentSummarySchema.extend({
  content: z.string(),
  lastSavedAt: z.string().nullable(),
});
export type DocumentSession = z.infer<typeof DocumentSessionSchema>;

export const DocumentSaveModeSchema = z.enum(['save', 'saveAs', 'autosave']);
export type DocumentSaveMode = z.infer<typeof DocumentSaveModeSchema>;

export const DocumentSaveRequestSchema = z.object({
  id: z.string().min(1),
  kind: DocumentKindSchema,
  title: z.string().min(1),
  path: z.string().min(1).optional(),
  content: z.string(),
  mode: DocumentSaveModeSchema,
});
export type DocumentSaveRequest = z.infer<typeof DocumentSaveRequestSchema>;

export const LauncherStateSchema = z.object({
  recentDocuments: z.array(DocumentSummarySchema).max(8),
  quickResumeId: z.string().nullable(),
});
export type LauncherState = z.infer<typeof LauncherStateSchema>;

export const DocumentOperationResultSchema = z.object({
  document: DocumentSessionSchema,
  launcher: LauncherStateSchema,
});
export type DocumentOperationResult = z.infer<typeof DocumentOperationResultSchema>;

export const PdfExportRequestSchema = z.object({
  engine: z.enum(['lualatex', 'weasy']),
  title: z.string().min(1),
  content: z.string(),
  sourcePath: z.string().min(1).optional(),
});
export type PdfExportRequest = z.infer<typeof PdfExportRequestSchema>;

export const PdfExportResultSchema = z.object({
  outputPath: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative(),
  engine: z.enum(['lualatex', 'weasy']),
  exportedAt: z.string().min(1),
});
export type PdfExportResult = z.infer<typeof PdfExportResultSchema>;

export const WorkspaceLayoutSchema = z.object({
  leftPanelWidth: z.number().min(220).max(420),
  rightPanelWidth: z.number().min(260).max(520),
  leftPanelCollapsed: z.boolean(),
  rightPanelCollapsed: z.boolean(),
});
export type WorkspaceLayout = z.infer<typeof WorkspaceLayoutSchema>;

export const WorkspaceViewModeSchema = z.enum(['write', 'preview', 'split']);
export type WorkspaceViewMode = z.infer<typeof WorkspaceViewModeSchema>;

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayout = {
  leftPanelWidth: 280,
  rightPanelWidth: 340,
  leftPanelCollapsed: true,
  rightPanelCollapsed: true,
};

export const DefaultAppPromptSchema = z.object({
  dismissed: z.boolean(),
  shown: z.boolean(),
});
export type DefaultAppPrompt = z.infer<typeof DefaultAppPromptSchema>;

export const SettingsSchema = z.object({
  language: LanguageSchema,
  theme: ThemePreferenceSchema,
  customTheme: CustomThemeSchema,
  writingFontFamily: z.string().min(1).nullable(),
  defaultMarkdownAppPrompt: DefaultAppPromptSchema,
  firstRunCompleted: z.boolean(),
  launcher: LauncherStateSchema,
  workspace: WorkspaceLayoutSchema,
  workspaceViewMode: WorkspaceViewModeSchema,
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  theme: 'system',
  customTheme: DEFAULT_CUSTOM_THEME,
  writingFontFamily: null,
  defaultMarkdownAppPrompt: {
    dismissed: false,
    shown: false,
  },
  firstRunCompleted: false,
  launcher: {
    recentDocuments: [],
    quickResumeId: null,
  },
  workspace: DEFAULT_WORKSPACE_LAYOUT,
  workspaceViewMode: 'split',
};

export const SettingsPatchSchema = SettingsSchema.partial();
export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;
