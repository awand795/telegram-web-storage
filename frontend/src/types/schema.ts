import { z } from 'zod'

// === Enums ===
export const FileStatus = z.enum(['pending', 'done', 'failed'])
export type FileStatus = z.infer<typeof FileStatus>

// === Models ===
export const UserSchema = z.object({
  id: z.string(),
  telegram_id: z.string(),
  name: z.string(),
  username: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
})
export type User = z.infer<typeof UserSchema>

export const BotSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  token_preview: z.string(),
  chat_id: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string(),
})
export type Bot = z.infer<typeof BotSchema>

export const FileSchema = z.object({
  id: z.string(),
  bot_id: z.string(),
  user_id: z.string(),
  telegram_file_id: z.string().nullable(),
  message_id: z.string().nullable(),
  name: z.string(),
  size: z.number(),
  mime_type: z.string(),
  folder_id: z.string().nullable(),
  tags: z.array(z.string()),
  status: FileStatus,
  uploaded_at: z.string(),
})
export type File = z.infer<typeof FileSchema>

export interface Folder {
  id: string
  user_id: string
  bot_id: string
  name: string
  parent_id: string | null
  path: string
  children?: Folder[]
}

export const FolderSchema: z.ZodType<Folder> = z.object({
  id: z.string(),
  user_id: z.string(),
  bot_id: z.string(),
  name: z.string(),
  parent_id: z.string().nullable(),
  path: z.string(),
  children: z.lazy(() => FolderSchema.array()).optional(),
})

export const ApiKeySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  key_preview: z.string(),
  last_used_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  rate_limit: z.number(),
  created_at: z.string(),
})
export type ApiKey = z.infer<typeof ApiKeySchema>

export const WebhookSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  active: z.boolean(),
  created_at: z.string(),
})
export type Webhook = z.infer<typeof WebhookSchema>

export const AuditLogSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string().nullable(),
  meta: z.record(z.unknown()).nullable(),
  ip: z.string(),
  user_agent: z.string(),
  created_at: z.string(),
})
export type AuditLog = z.infer<typeof AuditLogSchema>

export const UsageSchema = z.object({
  total_files: z.number(),
  total_size: z.number(),
  active_bots: z.number(),
  files_today: z.number(),
  storage_by_type: z.array(z.object({ mime_type: z.string(), count: z.number(), size: z.number() })),
})
export type Usage = z.infer<typeof UsageSchema>

// === Request Schemas ===
export const CreateBotSchema = z.object({
  name: z.string().min(1).max(100),
  token: z.string().min(1),
})
export type CreateBotInput = z.infer<typeof CreateBotSchema>

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  rate_limit: z.number().min(1).max(1000).default(60),
})
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>

export const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
})
export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>

export const CreateFolderSchema = z.object({
  name: z.string().min(1).max(100),
  parent_id: z.string().nullable().default(null),
})
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>
