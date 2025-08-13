import { z } from 'zod';

export const createReceiveEmailSchema = z.object({
  universityName: z.string()
    .min(1, '高校名称不能为空')
    .max(200, '高校名称不能超过200个字符'),
  collegeName: z.string()
    .max(200, '学院名称不能超过200个字符')
    .optional(),
  contactPerson: z.string()
    .max(100, '联系人不能超过100个字符')
    .optional(),
  province: z.string()
    .max(50, '省份不能超过50个字符')
    .optional(),
  email: z.string()
    .email('请输入有效的邮箱地址')
    .max(100, '邮箱不能超过100个字符'),
  phone: z.string()
    .max(20, '电话号码不能超过20个字符')
    .optional(),
  responsibility: z.string()
    .max(500, '主要职责不能超过500个字符')
    .optional(),
  isBlacklisted: z.boolean().default(false)
});

export const updateReceiveEmailSchema = createReceiveEmailSchema.partial();

export const receiveEmailQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().nullish(),
  province: z.string().nullish(),
  isBlacklisted: z.coerce.boolean().optional()
});

export type CreateReceiveEmailRequest = z.infer<typeof createReceiveEmailSchema>;
export type UpdateReceiveEmailRequest = z.infer<typeof updateReceiveEmailSchema>;
export type ReceiveEmailQuery = z.infer<typeof receiveEmailQuerySchema>; 