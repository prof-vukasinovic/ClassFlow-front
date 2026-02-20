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
import { HostListener } from '@angular/core';

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

  @HostListener('window:resize')
  onResize() {
    if (this.planComponent && this.classroom?.uiTables) {
      this.planComponent.updatePlanSize();
      this.applyGrid();
    }
  }

  classroom: any = null;
  selectedStudent: any = null;
  classId: string | null = null;
  sidebarVisible = true;
  devoirs: string[] = [];

  interactionMode: 'student' | 'table' = 'student';

  rows = 5;
  cols = 10;

  tempRows = 5;
  tempCols = 10;
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
    this.tempRows = this.rows;
    this.tempCols = this.cols;
    this.loadSidebarState();
    this.loadDevoirs();
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

        this.cdr.detectChanges();

        setTimeout(() => {
          if (this.planComponent) {
            this.planComponent.updatePlanSize();
            this.applyGrid();
          }
        });
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
          }
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
    if (!this.classroom?.uiTables) return;

    this.cols = this.tempCols;
    this.rows = this.tempRows;

    const occupied = new Set<string>();

    for (const t of this.classroom.uiTables) {

      let x = t.backendRef.position.x;
      let y = t.backendRef.position.y;

      if (x >= this.cols || y >= this.rows || occupied.has(`${x},${y}`)) {

        let placed = false;

        for (let row = 0; row < this.rows; row++) {
          for (let col = 0; col < this.cols; col++) {

            const key = `${col},${row}`;

            if (!occupied.has(key)) {
              t.backendRef.position.x = col;
              t.backendRef.position.y = row;
              occupied.add(key);
              placed = true;
              break;
            }
          }
          if (placed) break;
        }

      } else {
        occupied.add(`${x},${y}`);
      }
    }

    if (!this.planComponent) return;

    this.planComponent.updatePlanSize();

    const width = this.planComponent.planWidth;
    const height = this.planComponent.planHeight;

    if (!width || !height) return;

    const cellWidth = width / this.cols;
    const cellHeight = height / this.rows;

    this.tableSize = Math.min(cellWidth, cellHeight) - 10;

    for (const t of this.classroom.uiTables) {

      const px = t.backendRef.position.x;
      const py = t.backendRef.position.y;

      t.x = px * cellWidth + (cellWidth - this.tableSize) / 2;
      t.y = py * cellHeight + (cellHeight - this.tableSize) / 2;
    }

    this.saveGridLocally();
    this.cdr.detectChanges();
  }

  saveClassroom() {
    if (this.interactionMode !== 'table') return;
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

    setTimeout(() => {
      if (this.planComponent && this.classroom?.uiTables) {
        this.planComponent.updatePlanSize();
        this.applyGrid();
      }
    });
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

  onStudentsSwapped(event: { student1: any, student2: any }) {

    if (!this.classroom?.eleves?.eleves) return;

    const list = this.classroom.eleves.eleves;

    const index1 = list.findIndex((e: any) => e.id === event.student1.id);
    const index2 = list.findIndex((e: any) => e.id === event.student2.id);

    if (index1 === -1 || index2 === -1) return;

    const temp = list[index1];
    list[index1] = list[index2];
    list[index2] = temp;

    this.http
      .post('/api/classrooms/sauvegarde', this.classroom)
      .subscribe();
  }

  loadDevoirs() {
    if (!this.classId) return;

    const saved = localStorage.getItem(`devoirs_${this.classId}`);
    if (saved) {
      this.devoirs = JSON.parse(saved);
    }
  }

  addDevoir() {
    const nom = prompt("Nom du devoir (ex: DM1, Interro2...)");
    if (!nom) return;

    const trimmed = nom.trim();
    if (!trimmed) return;

    if (this.devoirs.includes(trimmed)) {
      alert("Ce devoir existe déjà.");
      return;
    }

    this.devoirs.push(trimmed);

    if (this.classId) {
      localStorage.setItem(
        `devoirs_${this.classId}`,
        JSON.stringify(this.devoirs)
      );
    }
  }
}