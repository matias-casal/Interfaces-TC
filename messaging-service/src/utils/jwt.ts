import jwt, { SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '../types';

export class JWTUtils {
  private static getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    return secret;
  }

  static sign(payload: JWTPayload): string {
    const expiresIn = process.env.JWT_EXPIRE_TIME || '7d';
    return jwt.sign(payload, this.getSecret(), { expiresIn } as SignOptions);
  }

  static verify(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.getSecret()) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static decode(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}