import crypto from 'crypto';
import config from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(config.ENCRYPTION_KEY, 'hex');

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
}

/**
 * Encrypt sensitive data (e.g., API keys)
 * Uses AES-256-GCM for authenticated encryption
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: Invalid key or corrupted data');
  }
}

/**
 * Hash password using bcrypt (will be used with bcryptjs library)
 * This is a placeholder - actual implementation uses bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Generate random token for email verification, password reset, etc.
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate secure API key
 */
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('base64url');
}
