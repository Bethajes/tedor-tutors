import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { EligibilityService } from './eligibility.service';
import { ScoringService } from './scoring/scoring.service';
import { TutorsController } from './tutors.controller';

@Module({
  controllers: [MatchingController, TutorsController],
  providers: [MatchingService, EligibilityService, ScoringService],
  exports: [MatchingService, EligibilityService, ScoringService],
})
export class MatchingModule {}