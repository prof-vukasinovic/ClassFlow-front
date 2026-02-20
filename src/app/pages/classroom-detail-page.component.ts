import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { PlanComponent } from '../plan.component';
import { SidebarComponent } from '../sidebar.component';
import { StudentDetailComponent } from '../student-detail.component';

@Component({
  selector: 'app-classroom-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PlanComponent,
    SidebarComponent,
    StudentDetailComponent
  ],
  templateUrl: './classroom-detail-page.component.html',
  styleUrls: ['./classroom-detail-page.component.css']
})
export class ClassroomDetailPageComponent implements OnInit {

  @ViewChild(PlanComponent) planComponent!: PlanComponent;
  @ViewChild('sidebar') sidebar!: SidebarComponent;

  classroom: any = null;
  selectedStudent: any = null;
  classId: string | null = null;
  sidebarVisible = true;

  interactionMode: 'student' | 'table' = 'student';

  rows = 5;
  cols = 10;
  tableSize = 80;

  remarqueFilter: string = '';

  courseDate: Date = new Date();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.classId = this.route.snapshot.paramMap.get('id');
    this.initCourseDateFromQuery();
    this.loadSavedGrid();
    this.loadSidebarState();
    this.loadClassroom();
  }

  initCourseDateFromQuery() {
    const dateStr = this.route.snapshot.queryParamMap.get('date');
    if (dateStr) {
      const d = new Date(`${dateStr}T00:00:00`);
      if (!isNaN(d.getTime())) this.courseDate = d;
    }
  }

  setCourseDate(d: Date) {
    this.courseDate = d;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { date: `${yyyy}-${mm}-${dd}` },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    this.loadRemarques();
    this.cdr.detectChanges();
  }

  prevCourse() {
    const d = new Date(this.courseDate);
    d.setDate(d.getDate() - 1);
    this.setCourseDate(d);
  }

  nextCourse() {
    const d = new Date(this.courseDate);
    d.setDate(d.getDate() + 1);
    this.setCourseDate(d);
  }

  get filteredResults(): { eleve: any; remarques: any[] }[] {
    if (!this.classroom?.eleves?.eleves) return [];
    if (!this.remarqueFilter.trim()) return [];

    const search = this.remarqueFilter.toLowerCase();
    const results: { eleve: any; remarques: any[] }[] = [];

    for (const eleve of this.classroom.eleves.eleves) {
      const matched = (eleve.remarques || []).filter((r: any) =>
        r.intitule.toLowerCase().includes(search)
      );

      if (matched.length > 0) {
        results.push({
          eleve: eleve,
          remarques: matched
        });
      }
    }

    return results;
  }

  loadSavedGrid() {
    if (!this.classId) return;

    const saved = localStorage.getItem(`grid_${this.classId}`);
    if (saved) {
      const grid = JSON.parse(saved);
      this.cols = grid.cols;
      this.rows = grid.rows;
    }
  }

  saveGridLocally() {
    if (!this.classId) return;

    localStorage.setItem(
      `grid_${this.classId}`,
      JSON.stringify({ cols: this.cols, rows: this.rows })
    );
  }

  loadClassroom() {
    if (!this.classId) return;

    this.http
      .get(`/api/classrooms/${this.classId}/chargement`)
      .subscribe((data: any) => {
        this.classroom = data;

        this.loadRemarques();
        this.buildUITables();

        setTimeout(() => {
          this.applyGrid();
        }, 0);

        this.cdr.detectChanges();
      });
  }

  loadRemarques() {
    if (!this.classId) return;

    const sameLocalDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    this.http
      .get<any[]>(`/api/classrooms/${this.classId}/eleves`)
      .subscribe((eleves) => {
        this.classroom.eleves.eleves.forEach((e: any) => {
          const full = eleves.find(x => x.id === e.id);
          if (full) {
            e.remarques = (full.remarques || []).filter((r: any) => {
              const d = new Date(r.createdAt);
              return sameLocalDay(d, this.courseDate);
            });
          } else {
            e.remarques = [];
          }
          e.bavardages = [];
          e.devoirsNonFaits = [];
        });

        this.http.get<any[]>(`/api/classrooms/${this.classId}/bavardages`)
          .subscribe((items) => {
            const byEleve = new Map<number, any[]>();
            for (const it of (items || [])) {
              const d = new Date(it.createdAt);
              if (!sameLocalDay(d, this.courseDate)) continue;
              const k = it.eleveId;
              byEleve.set(k, [...(byEleve.get(k) || []), it]);
            }
            this.classroom.eleves.eleves.forEach((e: any) => {
              e.bavardages = byEleve.get(e.id) || [];
            });
            this.cdr.detectChanges();
          });

        this.http.get<any[]>(`/api/classrooms/${this.classId}/devoirs-non-faits`)
          .subscribe((items) => {
            const byEleve = new Map<number, any[]>();
            for (const it of (items || [])) {
              const d = new Date(it.createdAt);
              if (!sameLocalDay(d, this.courseDate)) continue;
              const k = it.eleveId;
              byEleve.set(k, [...(byEleve.get(k) || []), it]);
            }
            this.classroom.eleves.eleves.forEach((e: any) => {
              e.devoirsNonFaits = byEleve.get(e.id) || [];
            });
            this.cdr.detectChanges();
          });

        this.cdr.detectChanges();
      });
  }

  buildUITables() {
    if (!this.classroom) return;

    const uiTables: any[] = [];

    this.classroom.tables.forEach((table: any, index: number) => {
      const eleve = this.classroom.eleves.eleves[index] || null;

      uiTables.push({
        x: table.position.x,
        y: table.position.y,
        eleve: eleve,
        backendRef: table
      });
    });

    this.classroom.uiTables = uiTables;
  }

  applyGrid() {
    if (!this.planComponent || !this.classroom?.uiTables) return;

    this.planComponent.updatePlanSize();

    const width = this.planComponent.planWidth;
    const height = this.planComponent.planHeight;

    if (!width || !height) return;

    const cellWidth = width / this.cols;
    const cellHeight = height / this.rows;

    this.tableSize = Math.min(cellWidth, cellHeight) - 10;

    this.classroom.uiTables.forEach((t: any) => {
      const px = Math.max(0, Math.min(this.cols - 1, t.backendRef.position.x));
      const py = Math.max(0, Math.min(this.rows - 1, t.backendRef.position.y));

      t.backendRef.position.x = px;
      t.backendRef.position.y = py;

      t.x = px * cellWidth + (cellWidth - this.tableSize) / 2;
      t.y = py * cellHeight + (cellHeight - this.tableSize) / 2;
    });

    this.planComponent.tables = this.classroom.uiTables;

    this.saveGridLocally();
    this.cdr.detectChanges();
  }

  saveClassroom() {
    if (!this.planComponent || !this.classroom?.uiTables) return;

    const width = this.planComponent.planWidth;
    const height = this.planComponent.planHeight;

    if (!width || !height) return;

    const cellWidth = width / this.cols;
    const cellHeight = height / this.rows;

    const used = new Set<string>();

    for (const uiTable of this.classroom.uiTables) {
      let col = Math.round(uiTable.x / cellWidth);
      let row = Math.round(uiTable.y / cellHeight);

      col = Math.max(0, Math.min(col, this.cols - 1));
      row = Math.max(0, Math.min(row, this.rows - 1));

      const key = `${col},${row}`;

      if (used.has(key)) {
        alert("Impossible d’enregistrer : deux tables sont sur la même case.");
        this.applyGrid();
        return;
      }

      used.add(key);

      uiTable.backendRef.position.x = col;
      uiTable.backendRef.position.y = row;
    }

    this.http
      .post('/api/classrooms/sauvegarde', this.classroom)
      .subscribe();
  }

  toggleLock() {
    this.interactionMode =
      this.interactionMode === 'student' ? 'table' : 'student';

    if (this.sidebar) {
      this.sidebar.showStudents = false;
    }

    this.selectedStudent = null;
  }

  selectStudent(student: any) {
    if (this.interactionMode !== 'student') return;

    if (this.selectedStudent?.id === student?.id) {
      this.selectedStudent = null;
    } else {
      this.selectedStudent = student;
    }
  }

  onRemarksChanged() {
    this.loadRemarques();
    this.cdr.detectChanges();
  }

  onStudentDeleted(studentId: number) {
    if (!this.classroom) return;

    const index = this.classroom.eleves.eleves.findIndex(
      (e: any) => e.id === studentId
    );

    this.selectedStudent = null;

    if (index === -1) {
      this.loadClassroom();
      return;
    }

    this.http.delete(
      `/api/classrooms/${this.classroom.id}/tables/${index}`
    ).subscribe(() => {
      this.loadClassroom();
    });
  }

  openAddStudent(data: { nom: string; prenom: string }) {
    if (!this.classroom) return;

    const nom = data.nom.trim();
    const prenom = data.prenom.trim();

    if (!nom || !prenom) return;

    const exists = this.classroom.eleves.eleves.some((e: any) =>
      e.nom.toLowerCase() === nom.toLowerCase() &&
      e.prenom.toLowerCase() === prenom.toLowerCase()
    );

    if (exists) {
      alert("Un élève avec le même nom et prénom existe déjà.");
      return;
    }

    const used = this.classroom.tables.map((t: any) => ({
      x: t.position.x,
      y: t.position.y
    }));

    let newX = -1;
    let newY = -1;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (!used.some((p: any) => p.x === x && p.y === y)) {
          newX = x;
          newY = y;
          break;
        }
      }
      if (newX !== -1) break;
    }

    if (newX === -1) {
      alert("La grille est pleine.");
      return;
    }

    this.http.post(
      `/api/classrooms/${this.classroom.id}/tables`,
      { x: newX, y: newY }
    ).subscribe(() => {
      const tableIndex = this.classroom.tables.length;

      this.http.post(
        `/api/classrooms/${this.classroom.id}/eleves`,
        { nom, prenom, tableIndex }
      ).subscribe(() => this.loadClassroom());
    });
  }

  loadSidebarState() {
    if (!this.classId) return;

    const saved = localStorage.getItem(`sidebar_${this.classId}`);
    if (saved !== null) {
      this.sidebarVisible = saved === 'true';
    }
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;

    if (this.classId) {
      localStorage.setItem(
        `sidebar_${this.classId}`,
        this.sidebarVisible.toString()
      );
    }
  }

  sameLocalDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  parseDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
  }

  isTodayCourse(): boolean {
    return this.sameLocalDay(this.courseDate, new Date());
  }
}