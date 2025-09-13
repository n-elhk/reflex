import { AfterContentInit, OnDestroy, contentChild, Directive, input } from '@angular/core';
import { CanvasElement } from './canvas-element';
import { Direction } from '../store/game.state';

/** Paramétrage UI regroupé pour éviter les valeurs magiques éparpillées */
const UI = Object.freeze({
  paddingRatio: 0.05,   // % bords
  gapRatioX: 0.40,      // écart relatif horizontal entre cases
  gapRatioY: 0.40,      // écart relatif vertical entre cases
  maxSideRatio: 0.35,   // taille max d'une case par rapport au côté min du canvas
  cornerRadiusRatio: 0.08,
  strokeWidth: 2,
  colors: {
    squareFill: '#ffffff',
    squareStroke: '#cfd6df',
    arrow: '#111827',
  },
});

const ANIMATION = Object.freeze({
  minSpeed: 80,   // % bords
  maxSpeed: 320,      // écart relatif horizontal entre cases
  speedK: 0.08,   // taille max d'une case par rapport au côté min du canvas
});

type ArrowOptions = {
  shaftLen: number;   // longueur totale de la flèche
  shaftWidth: number; // épaisseur de tige
  headLen: number;    // longueur de la pointe
  headWidth: number;  // largeur de la pointe
  color: string;
};

type HiDPIMetrics = { W: number; H: number; dpr: number };
type GridDims = { rows: number; cols: number; isVertical: boolean };
type CellSizing = {
  side: number;
  gapX: number;
  gapY: number;
  totalW: number;
  totalH: number;
  radius: number;
};
type Offsets = { rowXOffset: number[]; colYOffset: number[] };
type StartPos = { startX: number; startY: number };

@Directive({
  selector: '[appGameRunner]',
})
export class GameRunner implements AfterContentInit, OnDestroy {
  /** Canvas enfant (ctx + element) */
  readonly canvasChild = contentChild.required(CanvasElement);

  /** Nombre de cases par groupe (colonne si vertical, ligne si horizontal) */
  readonly squareCount = 3;
  /** Nombre de groupes (colonnes si vertical, lignes si horizontal) */
  readonly groupCount = 3;

  /** Direction des flèches affichées dans chaque case */
  readonly arrowDirection = input<Direction>('left');
  /** Direction du défilement (détermine l’axe et l’orientation de la grille) */
  readonly movementDirection = input<Direction>('right');

  readonly score = input.required<number>();

  // ---- État d’animation ----
  private rafId: number | null = null;
  private lastTs = 0;
  private phasePx = 0;                   // décalage cumulé en px
  private readonly speedPxPerSec = 200;  // vitesse du défilement (px/s)

  ngAfterContentInit(): void {
    // Démarrer directement l’animation
    this.startAnimation();
  }

  ngOnDestroy(): void {
    this.stopAnimation();
  }

  // 4) Courbe à rendement décroissant (asymptotique vers MAX_SPEED)
  private computeSpeedPxPerSec(): number {
    const s = this.score();
    const min = ANIMATION.minSpeed;
    const max = ANIMATION.maxSpeed;
    const k = ANIMATION.speedK;

    // Courbe saturante : v = min + (max-min) * (1 - e^{-k * s})
    const v = min + (max - min) * (1 - Math.exp(-k * s));

    // Sécurité numérique
    return Math.min(max, Math.max(min, v));
  }

  // ---------------------------------------------------------
  //                     ANIMATION
  // ---------------------------------------------------------

  /** Lance le défilement continu selon movementDirection() */
  startAnimation(): void {
    this.stopAnimation();
    this.phasePx = 0;
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame(this.renderFrame);
  }

  /** Stoppe l’animation */
  stopAnimation(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Tick animation */
  private renderFrame = (ts: number) => {
    const dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;

    const dir = this.movementDirection();
    const sign = (dir === 'down' || dir === 'right') ? +1 : -1;

    const speed = this.computeSpeedPxPerSec();
    this.phasePx += sign * speed * dt;

    this.drawWithPhase(this.phasePx);
    this.rafId = requestAnimationFrame(this.renderFrame);
  };

  // ---------------------------------------------------------
  //                    PIPELINE DE RENDU
  // ---------------------------------------------------------

  /** Dessin avec phase (utilisé par l’animation) */
  private drawWithPhase(phasePx: number): void {
    const { ctx } = this.canvasChild();
    const { W, H } = this.setupHiDPI();

    // Nettoyage
    ctx.clearRect(0, 0, W, H);

    // 1) Dimensions de grille selon la direction de mouvement
    const grid = this.computeGridDims();

    // 2) Calcul des espacements & taille de case
    const sizing = this.computeCellSizing(W, H, grid);

    // 3) Offsets pour casser l’alignement (toujours actifs)
    const offsets = this.computeOffsets(grid, sizing);

    // 4) Position de départ (centrage en tenant compte des offsets)
    const start = this.computeStartPosition(W, H, grid, sizing, offsets);

    // 5) Angle des flèches
    const angleDeg = this.toAngle(this.arrowDirection());

    // 6) Dessin animé
    this.drawGridAnimated(grid, sizing, offsets, start, angleDeg, phasePx);
  }

  // ---------------------------------------------------------
  //         CALCULS : DPI, GRILLE, ESPACEMENTS, OFFSETS
  // ---------------------------------------------------------

  /**
   * HiDPI / Retina : fixe width/height du buffer interne en pixels réels,
   * et remet le contexte en unités CSS via setTransform(dpr,...).
   */
  private setupHiDPI(): HiDPIMetrics {
    const { element: canvas, ctx } = this.canvasChild();

    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width || canvas.width || 200));
    const cssH = Math.max(1, Math.round(rect.height || canvas.height || 200));
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // Taille d’affichage CSS
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    // Buffer interne en pixels réels
    const bufferW = Math.round(cssW * dpr);
    const bufferH = Math.round(cssH * dpr);
    if (canvas.width !== bufferW) canvas.width = bufferW;
    if (canvas.height !== bufferH) canvas.height = bufferH;

    // Contexte en unités CSS
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { W: cssW, H: cssH, dpr };
  }

  /** Définit rows/cols en fonction de la direction de mouvement et des comptes */
  private computeGridDims(): GridDims {
    const move = this.movementDirection();
    const isVertical = move === 'up' || move === 'down';
    // squareCount = nombre par groupe (colonne si vertical, ligne si horizontal)
    // groupCount  = nombre de groupes (colonnes si vertical, lignes si horizontal)
    const rows = isVertical ? this.squareCount : this.groupCount;
    const cols = isVertical ? this.groupCount : this.squareCount;
    return { rows, cols, isVertical };
  }

  /** Calcule la taille de case, les gaps et le rayon des coins */
  private computeCellSizing(W: number, H: number, grid: GridDims): CellSizing {
    const paddingX = W * UI.paddingRatio;
    const paddingY = H * UI.paddingRatio;
    const availW = Math.max(0, W - 2 * paddingX);
    const availH = Math.max(0, H - 2 * paddingY);

    const denomX = grid.cols + UI.gapRatioX * (grid.cols - 1);
    const denomY = grid.rows + UI.gapRatioY * (grid.rows - 1);

    let side = Math.min(
      availW / Math.max(1, denomX),
      availH / Math.max(1, denomY)
    );

    const maxSide = Math.min(W, H) * UI.maxSideRatio;
    if (side > maxSide) side = maxSide;

    const gapX = side * UI.gapRatioX;
    const gapY = side * UI.gapRatioY;

    const totalW = grid.cols * side + (grid.cols - 1) * gapX;
    const totalH = grid.rows * side + (grid.rows - 1) * gapY;

    const radius = Math.max(4, Math.round(side * UI.cornerRadiusRatio));

    return { side, gapX, gapY, totalW, totalH, radius };
  }

  /**
   * Calcule les offsets (décalages) par ligne/colonne pour le "non-aligné"
   * - si vertical : colonnes décalées verticalement
   * - si horizontal : lignes décalées horizontalement
   */
  private computeOffsets(grid: GridDims, s: CellSizing): Offsets {
    const colYOffset = new Array(grid.cols).fill(0);
    const rowXOffset = new Array(grid.rows).fill(0);

    if (grid.isVertical) {
      const ampY = 0.35 * (s.side + s.gapY);
      for (let c = 0; c < grid.cols; c++) {
        colYOffset[c] = Math.round((c - (grid.cols - 1) / 2) * ampY);
      }
    } else {
      const ampX = 0.35 * (s.side + s.gapX);
      for (let r = 0; r < grid.rows; r++) {
        rowXOffset[r] = Math.round((r - (grid.rows - 1) / 2) * ampX);
      }
    }

    return { rowXOffset, colYOffset };
  }

  /** Centre la grille dans le canvas en tenant compte des offsets */
  private computeStartPosition(
    W: number,
    H: number,
    grid: GridDims,
    s: CellSizing,
    o: Offsets
  ): StartPos {
    let startX = (W - s.totalW) / 2;
    let startY = (H - s.totalH) / 2;

    if (grid.isVertical) {
      const minOff = Math.min(...o.colYOffset);
      const maxOff = Math.max(...o.colYOffset);
      startY = (H - (s.totalH + (maxOff - minOff))) / 2 - minOff;
    } else {
      const minOff = Math.min(...o.rowXOffset);
      const maxOff = Math.max(...o.rowXOffset);
      startX = (W - (s.totalW + (maxOff - minOff))) / 2 - minOff;
    }

    return { startX, startY };
  }

  // ---------------------------------------------------------
  //                       DESSIN
  // ---------------------------------------------------------

  /** Dessine la grille avec défilement selon movementDirection() */
  private drawGridAnimated(
    grid: GridDims,
    s: CellSizing,
    o: Offsets,
    start: StartPos,
    angleDeg: number,
    phasePx: number
  ): void {
    const dir = this.movementDirection();
    const isVertical = grid.isVertical;

    const stepX = s.side + s.gapX;
    const stepY = s.side + s.gapY;
    const period = isVertical ? stepY : stepX;

    // Phase normalisée:
    // - down/right : shift ∈ [0, period)
    // - up/left    : shift ∈ (-period, 0]
    let shift = phasePx % period;
    if (shift < 0) shift += period;
    if (dir === 'up' || dir === 'left') shift = shift - period;

    if (isVertical) {
      // Colonnes défilent verticalement
      for (let r = -2; r <= grid.rows + 1; r++) {
        for (let c = 0; c < grid.cols; c++) {
          const x = Math.floor(start.startX + c * stepX);
          const y = Math.floor(start.startY + r * stepY + o.colYOffset[c] + shift);
          this.drawCell(x, y, s.side, s.radius, angleDeg);
        }
      }
    } else {
      // Lignes défilent horizontalement
      for (let r = 0; r < grid.rows; r++) {
        for (let c = -2; c <= grid.cols + 1; c++) {
          const x = Math.floor(start.startX + c * stepX + o.rowXOffset[r] + shift);
          const y = Math.floor(start.startY + r * stepY);
          this.drawCell(x, y, s.side, s.radius, angleDeg);
        }
      }
    }
  }

  /** Dessine 1 case (carré + flèche au centre) */
  private drawCell(x: number, y: number, side: number, radius: number, angleDeg: number): void {
    const { ctx } = this.canvasChild();

    // Carré
    const square = this.roundedRectPath(x, y, side, side, radius);
    ctx.fillStyle = UI.colors.squareFill;
    ctx.strokeStyle = UI.colors.squareStroke;
    ctx.lineWidth = UI.strokeWidth;
    ctx.fill(square);
    ctx.stroke(square);

    // Flèche centrée
    this.drawArrowCentered(x + side / 2, y + side / 2, angleDeg, {
      shaftLen: side * 0.70,
      shaftWidth: Math.max(6, side * 0.12),
      headLen: side * 0.25,
      headWidth: side * 0.35,
      color: UI.colors.arrow,
    });
  }

  /** Chemin d’un rectangle à coins arrondis (Path2D) */
  private roundedRectPath(x: number, y: number, w: number, h: number, r: number): Path2D {
    const rr = Math.min(r, w / 2, h / 2);
    const p = new Path2D();
    p.moveTo(x + rr, y);
    p.lineTo(x + w - rr, y);
    p.quadraticCurveTo(x + w, y, x + w, y + rr);
    p.lineTo(x + w, y + h - rr);
    p.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    p.lineTo(x + rr, y + h);
    p.quadraticCurveTo(x, y + h, x, y + h - rr);
    p.lineTo(x, y + rr);
    p.quadraticCurveTo(x, y, x + rr, y);
    p.closePath();
    return p;
  }

  /**
   * Dessine une flèche orientée (0° = haut, sens horaire).
   * Coordonnées en unités CSS (grâce à setupHiDPI()).
   */
  private drawArrowCentered(
    cx: number,
    cy: number,
    angleDeg: number,
    options: Partial<ArrowOptions> = {}
  ) {
    const { ctx } = this.canvasChild();

    const {
      shaftLen = 84,
      shaftWidth = 10,
      headLen = 22,
      headWidth = 26,
      color = '#1f2937',
    } = options;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((Math.PI / 180) * angleDeg);

    ctx.fillStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const top = -shaftLen / 2;          // pointe
    const baseBody = top + headLen;     // début du corps
    const bottom = shaftLen / 2;        // fin de la tige
    const halfShaft = shaftWidth / 2;
    const halfHead = headWidth / 2;

    const path = new Path2D();
    // tige
    path.rect(-halfShaft, baseBody, shaftWidth, bottom - baseBody);
    // tête
    path.moveTo(-halfHead, baseBody);
    path.lineTo(0, top);
    path.lineTo(halfHead, baseBody);
    path.closePath();

    ctx.fill(path);
    ctx.restore();
  }

  /** Map direction → angle (0 = haut, 90 = droite, 180 = bas, 270 = gauche) */
  private toAngle(dir: Direction): number {
    switch (dir) {
      case 'up': return 0;
      case 'right': return 90;
      case 'down': return 180;
      case 'left': return 270;
      default: return 0;
    }
  }
}
