import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PolicyCheckResult {
  allowed: boolean;
  matchedCategory?: string;
}

// NOTE: this is a naive, transparent, keyword-based prototype filter meant to
// demonstrate WHERE a policy check belongs in the pipeline and HOW it's
// logged - it is not a real content-safety classifier. A production system
// would call a dedicated moderation/classification service here.
@Injectable()
export class PolicyService {
  private readonly blockedCategories: string[];

  constructor(private readonly configService: ConfigService) {
    this.blockedCategories = this.configService.get<string[]>('policy.blockedCategories') || [];
  }

  check(prompt: string): PolicyCheckResult {
    const lower = prompt.toLowerCase();
    for (const category of this.blockedCategories) {
      if (category && lower.includes(category)) {
        return { allowed: false, matchedCategory: category };
      }
    }
    return { allowed: true };
  }
}
