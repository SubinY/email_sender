import { z } from 'zod';

export const createSendEmailSchema = z.object({
  companyName: z.string()
    .min(1, '企业名称不能为空')
    .max(200, '企业名称不能超过200个字符'),
  referralCode: z.string()
    .min(1, '内推码不能为空')
    .max(50, '内推码不能超过50个字符'),
  referralLink: z.string()
    .url('请输入有效的内推连接')
    .min(1, '内推连接不能为空'),
  emailAccount: z.string()
    .email('请输入有效的邮箱地址')
    .max(100, '邮箱不能超过100个字符'),
  password: z.string()
    .min(1, '密码不能为空')
    .max(100, '密码不能超过100个字符'),
  smtpServer: z.string()
    .min(1, 'SMTP服务器不能为空')
    .max(100, 'SMTP服务器不能超过100个字符'),
  port: z.number()
    .int('端口必须是整数')
    .min(1, '端口必须大于0')
    .max(65535, '端口不能超过65535')
    .default(465),
  sslTls: z.boolean().default(true),
  senderName: z.string()
    .min(1, '发件人名称不能为空')
    .max(100, '发件人名称不能超过100个字符'),
  description: z.string()
    .max(1000, '描述不能超过1000个字符')
    .optional()
});

export const updateSendEmailSchema = createSendEmailSchema.omit({ password: true }).extend({
  password: z.string()
    .max(100, '密码不能超过100个字符')
    .optional()
});

export const sendEmailQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().nullish(),
  companyName: z.string().nullish(),
  isEnabled: z.coerce.boolean().optional()
});

export type CreateSendEmailRequest = z.infer<typeof createSendEmailSchema>;
export type UpdateSendEmailRequest = z.infer<typeof updateSendEmailSchema>;
export type SendEmailQuery = z.infer<typeof sendEmailQuerySchema>; 