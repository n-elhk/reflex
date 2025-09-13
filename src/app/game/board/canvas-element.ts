import { Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appCanvasElement]',
})
export class CanvasElement {
  private readonly elementRef = inject<ElementRef<HTMLCanvasElement>>(ElementRef);


  readonly element = this.elementRef.nativeElement;

  get ctx() {
    return this.element.getContext('2d')!;
  }
}
