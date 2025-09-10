import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReconhecerPage } from './reconhecer.page';

describe('ReconhecerPage', () => {
  let component: ReconhecerPage;
  let fixture: ComponentFixture<ReconhecerPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReconhecerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
