import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email("Enter a valid email").max(120),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[a-zA-Z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Enter your password"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(100),
});

// ─── Profile ─────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  bio: z.string().max(500).nullable().optional(),
  image: z.string().url().nullable().optional(),
  banner: z.string().url().nullable().optional(),
  timezone: z.string().max(60).optional(),
  language: z.string().max(10).optional(),
  statusMessage: z.string().max(120).nullable().optional(),
  socialLinks: z
    .array(z.object({ label: z.string().max(40), url: z.string().url() }))
    .max(6)
    .optional(),
});

// ─── Workspaces ──────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "At least 2 characters").max(60),
  description: z.string().max(300).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(300).nullable().optional(),
  image: z.string().url().nullable().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "MODERATOR", "MEMBER"]).default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MODERATOR", "MEMBER"]),
});

// ─── Channels ────────────────────────────────────────────────

export const createChannelSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-_]+$/, "Lowercase letters, numbers, dashes and underscores only"),
  description: z.string().max(300).optional(),
  topic: z.string().max(120).optional(),
  type: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  memberIds: z.array(z.string().uuid()).max(200).optional(),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  description: z.string().max(300).nullable().optional(),
  topic: z.string().max(120).nullable().optional(),
  isArchived: z.boolean().optional(),
});

// ─── Messages ────────────────────────────────────────────────

export const createMessageSchema = z.object({
  content: z.string().min(1, "Message can't be empty").max(8000),
  parentId: z.string().uuid().optional(),
  attachmentIds: z.array(z.string().uuid()).max(10).optional(),
  mentionedUserIds: z.array(z.string().uuid()).max(50).optional(),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(8000),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(16),
});

export const listMessagesSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

// ─── DM ──────────────────────────────────────────────────────

export const createConversationSchema = z.object({
  userId: z.string().uuid(),
});

// ─── Search ──────────────────────────────────────────────────

export const searchSchema = z.object({
  q: z.string().min(1).max(120),
  type: z.enum(["all", "messages", "channels", "members", "files"]).default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─── Types ───────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateChannelInput = z.input<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
