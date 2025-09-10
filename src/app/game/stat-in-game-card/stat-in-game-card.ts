import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-ingame-card',
  template: `
    <div class="stat-in-game-card">
      <div class="label">{{label()}}</div>
      <strong class="point">{{ points()  }}</strong>
    </div>
  `,
  styles: `
  .stat-in-game-card {
    background: rgba(0, 0, 0, 0.35);
    color: #fff;
    padding: 6px 10px;
    border-radius: 8px;
    text-align: center;
    min-width: 84px;
  }
    .label{
      font-size: 10px;
      opacity: 0.8;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }

  .point {
      font-size: 20px;
      display: block;
    }

  `,
})
export class StatInGameCardComponent {
  readonly label = input('');
  readonly points = input(0);
}
