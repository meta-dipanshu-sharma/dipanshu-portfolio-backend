import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Protects dashboard endpoints with a static API key.
 * Pass the key in the `x-api-key` header.
 * Set DASHBOARD_API_KEY in your .env — make it a long random string.
 */
@Injectable()
export class DashboardGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.headers['x-api-key'];
    const expected = this.config.get<string>('DASHBOARD_API_KEY');

    if (!expected) {
      throw new UnauthorizedException('Dashboard API key not configured');
    }

    if (key !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
