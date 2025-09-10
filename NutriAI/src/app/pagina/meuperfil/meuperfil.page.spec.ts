import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeuperfilPage } from './meuperfil.page';

describe('MeuperfilPage', () => {
  let component: MeuperfilPage;
  let fixture: ComponentFixture<MeuperfilPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MeuperfilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
