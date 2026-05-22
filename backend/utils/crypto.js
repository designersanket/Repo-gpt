const crypto = require('crypto');

const ENCRYPTION_SECRET = process.env.API_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'repogpt-secret-key-should-be-32-bytes';
const KEY = crypto.createHash('sha256').update(String(ENCRYPTION_SECRET)).digest();
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

const decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  const data = Buffer.from(ciphertext, 'base64');
  const iv = data.slice(0, IV_LENGTH);
  const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

module.exports = { encrypt, decrypt };
