import { Controller, Post, Get, Redirect, Query, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ResumeService } from './resume.service';
import { Request } from 'express';

@ApiTags('Resume')
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  /**
   * POST /resume/download
   * Frontend calls this when the user clicks the download button.
   * Logs the event and returns the actual resume URL.
   * Frontend then opens that URL.
   */
  @Post('download')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 downloads per minute per IP
  @ApiOperation({ summary: 'Log a resume download and return the file URL' })
  @ApiQuery({ name: 'sessionId', required: false, description: 'Optional analytics session ID' })
  @ApiResponse({ status: 200, schema: { example: { id: 'clx...', url: 'https://...', tracked: true } } })
  async download(
    @Query('sessionId') sessionId: string,
    @Req() req: Request,
  ) {
    return this.resumeService.logAndGetResumeUrl(sessionId, req);
  }

  /**
   * GET /resume/redirect
   * Alternative: direct redirect approach.
   * The browser hits this URL, it logs the download, then redirects to the PDF.
   */
  @Get('redirect')
  @Redirect()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Log and redirect to resume PDF (use in <a href> tags)' })
  async redirect(
    @Query('sessionId') sessionId: string,
    @Req() req: Request,
  ) {
    const result = await this.resumeService.logAndGetResumeUrl(sessionId, req);
    return { url: result.url, statusCode: 302 };
  }
}
