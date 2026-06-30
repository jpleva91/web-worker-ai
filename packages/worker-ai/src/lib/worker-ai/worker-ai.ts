import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WorkerAiWarmupSnapshot } from '../types';

@Component({
  selector: 'wwai-worker-ai-status',
  imports: [],
  templateUrl: './worker-ai.html',
  styleUrl: './worker-ai.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkerAi {
  snapshot = input<WorkerAiWarmupSnapshot>({ state: 'idle' });
}
