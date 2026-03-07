import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

/* Page d'accueil de l'application */
@Component({
	selector:'app-home-page',
	standalone:true,
	imports:[CommonModule,RouterModule],
	templateUrl:'./home-page.component.html',
	styleUrls:['./home-page.component.css']
})
export class HomePageComponent{}