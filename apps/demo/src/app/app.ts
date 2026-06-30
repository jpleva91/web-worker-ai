import { Component, computed, signal } from '@angular/core';
import { WorkerAi } from '@m3kit/worker-ai';

@Component({
  imports: [WorkerAi],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly inputText = signal(
    'Browser-local AI should run in a Web Worker so model loading and inference do not block application rendering.',
  );
  protected readonly snapshot = signal({ state: 'ready' as const });
  protected readonly summary = computed(() => {
    const text = this.inputText().trim();
    return text.length > 96 ? `${text.slice(0, 93)}...` : text;
  });
}
