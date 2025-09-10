import { AfterViewInit, Component, ElementRef, inject, OnDestroy, QueryList, viewChild, ViewChild, viewChildren, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import gsap from 'gsap';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonIcon, IonButton],
})
export class HomePage implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);

  readonly contentEl = viewChild.required(IonContent, { read: ElementRef });
  readonly heroRef = viewChild.required('hero', { read: ElementRef });
  readonly ctaPlayRef = viewChild.required('ctaPlay', { read: ElementRef });
  readonly blobs = viewChildren('blob', { read: ElementRef });

  private bgTl?: gsap.core.Timeline;
  private enterTl?: gsap.core.Timeline;
  // isHowToOpen = false;

  ngAfterViewInit(): void {
    // Entrée des éléments
    this.enterTl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
    this.enterTl
      .from(this.heroRef().nativeElement, { y: 30, opacity: 0 })
      .to(this.ctaPlayRef().nativeElement, { scale: 1.04, yoyo: true, repeat: -1, ease: 'sine.inOut', duration: 0.9 }, '-=0.3');

    // Fond “blobs” animés
    this.animateBlobs();

    // Parallaxe légère au gyroscope / souris
    window.addEventListener('deviceorientation', this.handleTilt, { passive: true });
    window.addEventListener('mousemove', this.handleMouse, { passive: true });
  }

  ngOnDestroy() {
    // Nettoyage
    this.bgTl?.kill();
    this.enterTl?.kill();
    window.removeEventListener('deviceorientation', this.handleTilt as any);
    window.removeEventListener('mousemove', this.handleMouse as any);
  }

  private animateBlobs() {
    const nodes = this.blobs().map(b => b.nativeElement);
    this.bgTl = gsap.timeline({ repeat: -1, yoyo: true });
    nodes.forEach((node, i) => {
      const rX = gsap.utils.random(-30, 30);
      const rY = gsap.utils.random(-20, 20);
      const rS = gsap.utils.random(0.9, 1.25);
      const d = gsap.utils.random(4, 7);
      this.bgTl!.to(
        node,
        { x: rX, y: rY, scale: rS, duration: d, ease: 'sine.inOut' },
        i * 0.12
      );
    });
  }

  private handleTilt = (e: DeviceOrientationEvent) => {
    const x = (e.gamma ?? 0) / 45; // -1..1
    const y = (e.beta ?? 0) / 45;  // -1..1
    gsap.to(this.contentEl().nativeElement, {
      x: x * 8,
      y: y * 6,
      duration: 0.6,
      ease: 'sine.out',
    });
  };

  private handleMouse = (e: MouseEvent) => {
    const { innerWidth: w, innerHeight: h } = window;
    const x = (e.clientX / w - 0.5) * 2; // -1..1
    const y = (e.clientY / h - 0.5) * 2;
    gsap.to(this.contentEl().nativeElement, {
      x: x * 6,
      y: y * 5,
      duration: 0.6,
      ease: 'sine.out',
    });
  };

  onPlay() {
    // TODO: rediriger vers l’écran de jeu
    this.router.navigateByUrl('/game');
    // Petite animation feedback
    gsap.fromTo(
      this.ctaPlayRef().nativeElement,
      { scale: 0.98 },
      { scale: 1.04, yoyo: true, repeat: 1, duration: 0.12, ease: 'power1.inOut' }
    );
  }
}
