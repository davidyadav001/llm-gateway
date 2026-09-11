import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

// Attaches a request id and logs method/route/user/status/latency for every
// request. Deliberately does NOT log request bodies (prompts) or headers,
// to avoid sensitive content ending up in application logs.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const requestId = randomUUID();
    req.requestId = requestId;
    const start = Date.now();
    const userId = req.user?.userId || 'anonymous';

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `[${requestId}] ${req.method} ${req.originalUrl} user=${userId} status=${res.statusCode} ${Date.now() - start}ms`,
          );
        },
        error: (err) => {
          this.logger.warn(
            `[${requestId}] ${req.method} ${req.originalUrl} user=${userId} error=${err?.status || 500} ${Date.now() - start}ms`,
          );
        },
      }),
    );
  }
}
