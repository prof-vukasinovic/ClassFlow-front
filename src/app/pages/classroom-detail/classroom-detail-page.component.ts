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
import { PlanComponent } from '../../components/plan/plan.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { StudentDetailComponent } from '../../components/student-detail/student-detail.component';
import { HostListener } from '@angular/core';
import { RemarkFilterComponent } from '../../components/remark-filter/remark-filter.component';
import { firstValueFrom } from 'rxjs';

/*
  Composant principal de gestion d'une classe.
  Il orchestre les composants enfants :
  - plan de la salle
  - sidebar des élèves
  - détail d'un élève
  - filtre de remarques
*/
@Component({
  selector: 'app-classroom-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PlanComponent,
    SidebarComponent,
    StudentDetailComponent,
    RemarkFilterComponent
  ],
  templateUrl: './classroom-detail-page.component.html',
  styleUrls: ['./classroom-detail-page.component.css']
})
export class ClassroomDetailPageComponent implements OnInit {

  @ViewChild(PlanComponent) planComponent!: PlanComponent;
  @ViewChild('sidebar') sidebar!: SidebarComponent;

  /* Recalcule la grille quand la fenêtre est redimensionnée */
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
  showStudentsList = true;
  showDevoirsList = false;
  elevesFull:any[]=[];

  toggleDevoirsList() {
    this.showDevoirsList = !this.showDevoirsList;
  }

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

  /* Initialisation de la page */
  ngOnInit() {

    this.classId = this.route.snapshot.paramMap.get('id');
    this.initCourseDateFromQuery();
    this.loadSavedGrid();
    this.tempRows = this.rows;
    this.tempCols = this.cols;
    this.loadSidebarState();
    this.loadDevoirs();
    this.loadClassroom();
    document.body.style.overflow = 'hidden';
  }

  /* Restaure le scroll lorsque la page est détruite */
  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  /* Initialise la date du cours depuis l'URL */
  initCourseDateFromQuery() {
    const dateStr = this.route.snapshot.queryParamMap.get('date');

    if (dateStr) {
      const d = new Date(`${dateStr}T00:00:00`);
      if (!isNaN(d.getTime()))
        this.courseDate = d;
    }
  }

  /* Change la date du cours */
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

  loadClassroom(){
    if(!this.classId)return;
    this.http.get(`/api/classrooms/${this.classId}/chargement`).subscribe({
      next:(data:any)=>{
        this.classroom=data||{};
        if(!this.classroom.eleves)this.classroom.eleves={eleves:[]};
        if(!Array.isArray(this.classroom.eleves.eleves))this.classroom.eleves.eleves=[];
        if(!Array.isArray(this.classroom.tables))this.classroom.tables=[];
        this.loadSavedTablePositions();
        this.buildUITables();
        this.loadRemarques();
        this.cdr.detectChanges();
        setTimeout(()=>{
          if(this.planComponent){
            this.planComponent.updatePlanSize();
            this.applyGrid();
          }
        });
      },
      error:(err)=>console.error(err)
    });
  }

  loadRemarques(){
    if(!this.classId)return;
    const sameLocalDay=(a:Date,b:Date)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
    const isOnOrBefore=(a:Date,b:Date)=>{
      const da=new Date(a.getFullYear(),a.getMonth(),a.getDate()).getTime();
      const db=new Date(b.getFullYear(),b.getMonth(),b.getDate()).getTime();
      return da<=db;
    };
    this.http.get<any[]>(`/api/classrooms/${this.classId}/eleves`).subscribe({
      next:(eleves)=>{
        this.elevesFull=Array.isArray(eleves)?eleves:[];
        const list=this.classroom?.eleves?.eleves||[];
        list.forEach((e:any,i:number)=>{
          const full=(Number(e?.id)>0?eleves.find(x=>Number(x.id)===Number(e.id)):null)||eleves.find(x=>x?.prenom===e?.prenom&&x?.nom===e?.nom)||eleves[i];
          if(!full){e.remarques=[];(e as any)._allRemarques=[];return;}
          e.id=Number(full.id);
          e.prenom=full.prenom;
          e.nom=full.nom;
          const all=Array.isArray(full.remarques)?full.remarques:[];
          (e as any)._allRemarques=all;
          e.remarques=all.filter((r:any)=>{
            const d=new Date(r.createdAt);
            if(r.type==='DEVOIR_NON_FAIT')return isOnOrBefore(d,this.courseDate);
            return sameLocalDay(d,this.courseDate);
          });
        });
        this.cdr.detectChanges();
      },
      error:(err)=>console.error(err)
    });
  }

  /* Construit la structure UI des tables */
  buildUITables(){
    if(!this.classroom)return;
    const tables=Array.isArray(this.classroom.tables)?this.classroom.tables:[];
    const eleves=Array.isArray(this.classroom?.eleves?.eleves)?this.classroom.eleves.eleves:[];
    this.classroom.uiTables=tables.map((table:any,index:number)=>({
      x:table?.position?.x??0,
      y:table?.position?.y??0,
      eleve:eleves[index]??null,
      backendRef:table
    }));
  }

  /* Recalcule les positions des tables dans la grille */
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

  async saveClassroom(){
    if(this.interactionMode!=='table')return;
    if(!this.classId||!this.classroom?.tables||!this.classroom?.uiTables)return;

    const used=new Set<string>();
    for(const uiTable of this.classroom.uiTables){
      const col=uiTable.backendRef?.position?.x??0;
      const row=uiTable.backendRef?.position?.y??0;
      const key=`${col},${row}`;
      if(used.has(key)){alert("Impossible d’enregistrer : deux tables sont sur la même case.");this.applyGrid();return;}
      used.add(key);
    }

    let fullEleves:any[]=[];
    try{
      fullEleves=await firstValueFrom(this.http.get<any[]>(`/api/classrooms/${this.classId}/eleves`));
      if(!Array.isArray(fullEleves))fullEleves=[];
    }catch(e){
      fullEleves=[];
    }

    const byId=new Map<number,any>();
    for(const e of fullEleves)byId.set(Number(e?.id),e);

    const elevesUI=this.classroom?.eleves?.eleves||[];
    const elevesPayload=elevesUI.map((e:any)=>{
      const full=byId.get(Number(e?.id));
      const remarques=Array.isArray(full?.remarques)?full.remarques:(Array.isArray((e as any)?._allRemarques)?(e as any)._allRemarques:[]);
      const out={...e,remarques};
      delete (out as any)._allRemarques;
      return out;
    });

    const payload={
      id:this.classroom.id,
      nom:this.classroom.nom,
      eleves:{eleves:elevesPayload},
      tables:this.classroom.tables
    };

    this.http.post('/api/classrooms/sauvegarde',payload).subscribe({error:(err)=>console.error(err)});
  }

  toggleLock() {
    this.interactionMode =
      this.interactionMode === 'student' ? 'table' : 'student';
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

  /* Rafraîchit les remarques après modification */
  onRemarksChanged() {
    this.loadRemarques();
    this.cdr.detectChanges();
  }

  /* Suppression d'un élève depuis le détail */
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

  /* Charge l'état sauvegardé de la sidebar */
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

  /* Compare deux dates sans tenir compte de l'heure */
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

  deleteDevoir(devoir: string) {
  if (!this.classId) return;
  const confirmed = confirm(`Supprimer le devoir "${devoir}" ?`);
  if (!confirmed) return;
  this.devoirs = this.devoirs.filter(d => d !== devoir);
  localStorage.setItem(
    `devoirs_${this.classId}`,
    JSON.stringify(this.devoirs)
  );
}

  /* Retourne la liste complète des élèves */
  getAllStudents() {
    if (!this.classroom?.uiTables) return [];
    return this.classroom.uiTables
      .map((t: any) => t.eleve)
      .filter((e: any) => e);
  }

  addStudentDirect() {
    if (!this.classroom) return;
    const prenom = prompt("Prénom de l'élève :");
    if (!prenom) return;
    const nom = prompt("Nom de l'élève :");
    if (!nom) return;
    this.openAddStudent({
      nom: nom.trim(),
      prenom: prenom.trim()
    });
  }

  toggleStudentsList() {
    this.showStudentsList = !this.showStudentsList;
  }

  /* Supprime les tables vides restantes dans la classe */
  async deleteEmptyTables() {

    if (!this.classroom) return;
    const classId = this.classroom.id;
    const tables: any[] = await firstValueFrom(
      this.http.get<any[]>(`/api/classrooms/${classId}/tables`)
    );
    const eleves: any[] = await firstValueFrom(
      this.http.get<any[]>(`/api/classrooms/${classId}/eleves`)
    );
    for (let i = tables.length - 1; i >= eleves.length; i--) {
      await firstValueFrom(
        this.http.delete(`/api/classrooms/${classId}/tables/${i}`)
      );
    }
    this.loadClassroom();
  }

  onTableMoved(){
    this.saveTablePositionsLocally();
  }

  saveTablePositionsLocally(){
    if(!this.classId||!this.classroom?.tables)return;
    const positions=this.classroom.tables.map((t:any,index:number)=>({
      id:t?.id??null,
      index,
      x:t?.position?.x??0,
      y:t?.position?.y??0
    }));
    localStorage.setItem(`tablepos_${this.classId}`,JSON.stringify(positions));
  }

  loadSavedTablePositions(){
    if(!this.classId||!this.classroom?.tables)return;
    const raw=localStorage.getItem(`tablepos_${this.classId}`);
    if(!raw)return;

    let positions:any[]=[];
    try{positions=JSON.parse(raw);if(!Array.isArray(positions))positions=[];}catch{positions=[];}

    const byId=new Map<number,any>();
    for(const p of positions)if(typeof p?.id==='number')byId.set(p.id,p);

    this.classroom.tables.forEach((t:any,index:number)=>{
      const p=(typeof t?.id==='number'?byId.get(t.id):null)||positions.find(pp=>pp.index===index);
      if(!p)return;
      if(!t.position)t.position={x:0,y:0};
      t.position.x=Number.isFinite(p.x)?p.x:t.position.x;
      t.position.y=Number.isFinite(p.y)?p.y:t.position.y;
    });
  }

}