import { Controller, Post, Body, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { CreateContactDto } from './contact.dto';
import { Request } from 'express';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { ttl: 3600000, limit: 3 } }) // 3 submissions per hour per IP
  @ApiOperation({ summary: 'Submit a contact form message' })
  @ApiResponse({
    status: 200,
    description: 'Message received and queued for email delivery',
    schema: {
      example: {
        success: true,
        id: 'clx_abc123',
        message: "Thank you! I'll get back to you within 24 hours.",
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error or too many submissions' })
  submit(@Body() dto: CreateContactDto, @Req() req: Request) {
    return this.contactService.submit(dto, req);
  }
}
