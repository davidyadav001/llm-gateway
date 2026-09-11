import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Explicitly marks a route as not requiring authentication (e.g. /auth/login).
// Absence of both @Public() and @Roles(...) is treated as "protected but
// misconfigured" rather than silently public - see JwtAuthGuard.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
