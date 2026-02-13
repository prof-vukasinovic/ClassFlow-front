import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { PlanComponent } from './plan.component';
import { SidebarComponent } from './sidebar.component';
import { StudentDetailComponent } from './student-detail.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, PlanComponent, SidebarComponent, StudentDetailComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {

  classroom: any = null;
  selectedStudent: any = null;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadClassroom();
  }

  loadClassroom() {
    this.http
      .get('/api/classrooms/1/plan')
      .subscribe((data: any) => {

        data.tables.forEach((table: any, index: number) => {
          table.x = 100 + (index * 120);
          table.y = 150;
        });

        this.classroom = data;

        if (this.selectedStudent) {
          const updatedStudent =
            data.tables
              .map((t: any) => t.eleve)
              .find((e: any) => e?.id === this.selectedStudent.id);

          this.selectedStudent = updatedStudent || null;
        }

        this.cdr.detectChanges();
      });
  }

  selectStudent(student: any) {
    if (this.selectedStudent?.id === student.id) {
      this.selectedStudent = null;
    } else {
      this.selectedStudent = student;
    }
  }
}