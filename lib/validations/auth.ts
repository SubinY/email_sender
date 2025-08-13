import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(50, '用户名不能超过50个字符'),
  password: z.string()
    .min(8, '密码至少8个字符')
    .max(100, '密码不能超过100个字符')
});

export const registerSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(50, '用户名不能超过50个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  email: z.string()
    .email('请输入有效的邮箱地址')
    .max(100, '邮箱不能超过100个字符'),
  password: z.string()
    .min(8, '密码至少8个字符')
    .max(100, '密码不能超过100个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大写字母、小写字母和数字'),
  role: z.enum(['admin', 'manager', 'operator']).default('operator')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string()
    .min(8, '新密码至少8个字符')
    .max(100, '新密码不能超过100个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '新密码必须包含大写字母、小写字母和数字'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '确认密码不匹配',
  path: ['confirmPassword']
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能为空')
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>; 