import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkerAi } from './worker-ai';

describe('WorkerAi', () => {
  let component: WorkerAi;
  let fixture: ComponentFixture<WorkerAi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkerAi],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkerAi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('creates the generic status component', () => {
    expect(component).toBeTruthy();
  });

  it('renders generic warmup state', () => {
    fixture.componentRef.setInput('snapshot', { state: 'ready' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Local AI ready');
  });
});
