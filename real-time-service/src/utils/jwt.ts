import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

export class JWTUtils {
  private static getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    return secret;
  }

  static verify(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.getSecret()) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
