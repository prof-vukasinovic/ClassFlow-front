import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-classrooms-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './classrooms-page.component.html'
})
export class ClassroomsPageComponent implements OnInit {

  classrooms: any[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.http
      .get<any[]>('/api/classrooms')
      .subscribe(data => {
        this.classrooms = data;
        this.cdr.detectChanges();
      });
  }

  goToClass(event: any) {
    const id = event.target.value;
    if (id) {
      this.router.navigate(['/classrooms', id]);
    }
  }
}