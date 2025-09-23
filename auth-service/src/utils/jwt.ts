import type { SignOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

import type { JWTPayload } from '../types';

export class JWTUtils {
  private static getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === '') {
      throw new Error('JWT_SECRET is not defined');
    }
    return secret;
  }

  static sign(payload: JWTPayload | any, expiresIn?: string): string {
    const expiry = expiresIn || process.env.JWT_EXPIRE_TIME || '7d';
    return jwt.sign(payload, this.getSecret(), { expiresIn: expiry } as SignOptions);
  }

  static verify(token: string, options?: any): JWTPayload {
    const decoded = jwt.verify(token, this.getSecret(), options) as any;
    return decoded as JWTPayload;
  }

  static decode(token: string, options?: any): JWTPayload | null | any {
    try {
      const decoded = jwt.decode(token, options);
      return decoded;
    } catch {
      return null;
    }
  }

  static generateRefreshToken(payload: JWTPayload | any): string {
    return this.sign({ ...payload, type: 'refresh' }, '30d');
  }

  static isTokenExpired(token: string): boolean {
    const decoded = this.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return true;
    }
    return decoded.exp < Math.floor(Date.now() / 1000);
  }
}