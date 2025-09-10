import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HidratacaoPage } from './hidratacao.page';

describe('HidratacaoPage', () => {
  let component: HidratacaoPage;
  let fixture: ComponentFixture<HidratacaoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HidratacaoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
