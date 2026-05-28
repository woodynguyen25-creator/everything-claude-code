import { z } from 'zod';
import { COUNCIL_AGENTS } from '@/lib/council';

export const agentSchema = z.enum(COUNCIL_AGENTS);

export const toolCallStatusSchema = z.enum(['pending', 'running', 'success', 'error']);

export const toolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: toolCallStatusSchema,
  params: z.record(z.string(), z.unknown()).optional(),
  result: z.union([z.string(), z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional(),
  durationMs: z.number().optional(),
  error: z.string().optional(),
});

export const chatRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);

export const chatMessageSchema = z.object({
  id: z.number(),
  threadId: z.number(),
  role: chatRoleSchema,
  content: z.string(),
  toolCalls: z.array(toolCallSchema).nullable(),
  costUsd: z.number(),
  llmProvider: z.string().nullable(),
  llmModel: z.string().nullable(),
  createdAt: z.string(),
});

export const chatThreadSchema = z.object({
  id: z.number(),
  agent: agentSchema,
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  preview: z.string().nullable(),
  lastMessageAt: z.string().nullable(),
  messageCount: z.number(),
});

export const chatRequestSchema = z.object({
  threadId: z.number().nullable().optional(),
  text: z.string().trim().min(1),
  godMode: z.boolean().optional(),
});

export const createThreadSchema = z.object({
  agent: agentSchema,
  title: z.string().trim().min(1).max(120).optional(),
});

export const renameThreadSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const stopStreamSchema = z.object({
  threadId: z.number(),
});

export type ToolCall = z.infer<typeof toolCallSchema>;
export type ChatRole = z.infer<typeof chatRoleSchema>;
export type ChatMessageRecord = z.infer<typeof chatMessageSchema>;
export type ChatThreadRecord = z.infer<typeof chatThreadSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
