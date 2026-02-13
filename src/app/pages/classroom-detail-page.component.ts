import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PlanComponent } from '../plan.component';
import { SidebarComponent } from '../sidebar.component';
import { StudentDetailComponent } from '../student-detail.component';

@Component({
  selector: 'app-classroom-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PlanComponent,
    SidebarComponent,
    StudentDetailComponent
  ],
  templateUrl: './classroom-detail-page.component.html',
  styleUrls: ['./classroom-detail-page.component.css']
})
export class ClassroomDetailPageComponent implements OnInit {

  classroom: any = null;
  selectedStudent: any = null;
  randomStudent: any = null;
  classId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.classId = this.route.snapshot.paramMap.get('id');
    this.loadClassroom();
  }

  loadClassroom() {
    if (!this.classId) return;

    this.http
      .get(`/api/classrooms/${this.classId}/plan`)
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
    this.selectedStudent = student;
  }

  pickRandomStudent() {
    if (!this.classroom) return;

    const students = this.classroom.tables
      .map((t: any) => t.eleve)
      .filter((e: any) => e);

    if (students.length === 0) return;

    const randomIndex = Math.floor(Math.random() * students.length);
    this.randomStudent = students[randomIndex];
  }
}