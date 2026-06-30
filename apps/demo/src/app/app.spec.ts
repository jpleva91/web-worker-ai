import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('renders browser summarization fallback chain', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Browser summarization fallback chain');
    expect(compiled.querySelector('textarea')).toBeTruthy();
    expect(compiled.textContent).toContain('Chrome / Edge Summarizer API');
    expect(compiled.textContent).toContain('Hugging Face Transformers.js fallback');
    expect(compiled.textContent).toContain('Deterministic fallback');
  });
});
