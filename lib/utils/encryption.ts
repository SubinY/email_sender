import { createCipher, createDecipher, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-key-for-dev-only';
const ALGORITHM = 'aes-256-cbc';

/**
 * 加密文本
 */
export function encrypt(text: string): string {
  try {
    const iv = randomBytes(16);
    const cipher = createCipher(ALGORITHM, ENCRYPTION_KEY);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error('加密失败');
  }
}

/**
 * 解密文本
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = createDecipher(ALGORITHM, ENCRYPTION_KEY);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('解密失败');
  }
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number = 32): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * 生成安全的令牌哈希
 */
export function generateTokenHash(token: string): string {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
} 