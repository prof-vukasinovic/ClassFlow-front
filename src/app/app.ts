import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

/**
 * Composant racine de l'application.
 * 
 * Il contient le router-outlet qui permet
 * d'afficher dynamiquement les pages selon la route.
 */

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './app.html'
})
export class App {

  helpOpen = false;

  openHelp() {
    this.helpOpen = true;
  }

  closeHelp() {
    this.helpOpen = false;
  }

}