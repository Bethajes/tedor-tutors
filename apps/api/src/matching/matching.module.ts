import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { EligibilityService } from './eligibility.service';
import { ScoringService } from './scoring/scoring.service';
import { TutorsController } from './tutors.controller';
import { SelectionController } from './selection.controller';
import { OpportunitiesController } from './opportunities.controller';
import { SelectionService } from './selection.service';

@Module({
  controllers: [MatchingController, TutorsController, SelectionController, OpportunitiesController],
  providers: [MatchingService, EligibilityService, ScoringService, SelectionService],
  exports: [MatchingService, EligibilityService, ScoringService, SelectionService],
})
export class MatchingModule {}