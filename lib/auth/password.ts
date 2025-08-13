import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * 加密密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 密码强度验证
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('密码长度至少8位');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码需包含至少一个大写字母');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码需包含至少一个小写字母');
  }

  if (!/\d/.test(password)) {
    errors.push('密码需包含至少一个数字');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 