import crypto from 'crypto';
import bcrypt from 'bcrypt';

export class CryptoUtils {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    return { publicKey, privateKey };
  }

  static encryptMessage(text: string, publicKeyPem: string): string {
    try {
      const publicKey = crypto.createPublicKey(publicKeyPem);
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(text, 'utf8')
      );
      return encrypted.toString('base64');
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  static decryptMessage(encryptedBase64: string, privateKeyPem: string): string {
    try {
      const privateKey = crypto.createPrivateKey(privateKeyPem);
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(encryptedBase64, 'base64')
      );
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  static generateUUID(): string {
    return crypto.randomUUID();
  }
}