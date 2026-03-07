import { Component,OnInit,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule,Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

@Component({
  selector:'app-classrooms-page',
  standalone:true,
  imports:[CommonModule,RouterModule,FormsModule],
  templateUrl:'./classrooms-page.component.html',
  styleUrls:['./classrooms-page.component.css']
})
export class ClassroomsPageComponent implements OnInit{

  classrooms:any[]=[];
  importTarget:any=null;
  importFile:File|null=null;
  loadingCsv=false;
  importProgress=0;

  constructor(
    private http:HttpClient,
    private router:Router,
    private cdr:ChangeDetectorRef
  ){}

  ngOnInit(){
    this.loadClasses();
  }

  loadClasses(){
    this.http.get<any[]>('/api/classrooms')
    .subscribe(data=>{
      this.classrooms=data;
      this.cdr.detectChanges();
    });
  }

  goToClass(event:any){
    const id=event.target.value;
    if(id)this.router.navigate(['/classrooms',id]);
  }

  createClass(){
    const nom=prompt("Nom de la nouvelle classe ?");
    if(!nom||!nom.trim())return;
    this.http.post('/api/classrooms',{nom})
    .subscribe(()=>this.loadClasses());
  }

  renameClass(classroom:any){
    const newName=prompt("Nouveau nom :",classroom.nom);
    if(!newName||!newName.trim())return;
    this.http.put(`/api/classrooms/${classroom.id}`,{...classroom,nom:newName})
    .subscribe(()=>this.loadClasses());
  }

  deleteClass(id:number){
    const classroom=this.classrooms.find(c=>c.id===id);
    if(!classroom)return;
    const confirmed=window.confirm(`Vous êtes sûr de vouloir supprimer "${classroom.nom}" ?`);
    if(!confirmed)return;
    this.http.delete(`/api/classrooms/${id}`)
    .subscribe(()=>{
      this.classrooms=this.classrooms.filter(c=>c.id!==id);
      this.cdr.detectChanges();
    });
  }

  openImport(classroom:any){
    this.importTarget=classroom;
    this.importFile=null;
    const input=document.getElementById('csvInput') as HTMLInputElement|null;
    if(input)input.value='';
  }

  onCsvSelected(event:any){
    this.importFile=event.target.files?.[0]??null;
  }

  async importCsvIntoClass(){

    if(!this.importTarget)return;
    if(!this.importFile)return;

    const classId=this.importTarget.id;
    const className=this.importTarget.nom;

    this.loadingCsv=true;
    this.importProgress=0;
    this.cdr.detectChanges();

    try{

      const eleves:any[]=await firstValueFrom(
        this.http.get<any[]>(`/api/classrooms/${classId}/eleves`)
      );

      if(eleves.length>0){
        const confirmed=window.confirm(
          `La classe "${className}" contient déjà ${eleves.length} élèves.\nVoulez-vous vraiment remplacer la classe ?`
        );
        if(!confirmed)return;
      }

      for(const e of eleves){
        await firstValueFrom(
          this.http.delete(`/api/classrooms/${classId}/eleves/${e.id}`)
        );
      }

      const text=await this.importFile.text();
      const rows=this.parseCsv(text);

      if(rows.length===0){
        alert("CSV invalide : colonnes 'nom' et 'prenom' requises.");
        return;
      }

      let tables:any[]=await firstValueFrom(
        this.http.get<any[]>(`/api/classrooms/${classId}/tables`)
      );

      if(tables.length<rows.length){
        for(let i=tables.length;i<rows.length;i++){
          await firstValueFrom(
            this.http.post(
              `/api/classrooms/${classId}/tables`,
              {x:i%10,y:Math.floor(i/10)}
            )
          );
        }
        tables=await firstValueFrom(
          this.http.get<any[]>(`/api/classrooms/${classId}/tables`)
        );
      }

      const limit=Math.min(rows.length,tables.length);

      for(let i=0;i<limit;i++){
        const r=rows[i];
        this.importProgress=Math.round(((i+1)/limit)*100);
        this.cdr.detectChanges();
        if(!r.nom||!r.prenom)continue;

        await firstValueFrom(
          this.http.post(
            `/api/classrooms/${classId}/eleves`,
            {nom:r.nom,prenom:r.prenom,tableIndex:i}
          )
        );
      }

      await this.deleteEmptyTables(classId,limit);

      alert(`${limit} élèves importés dans la classe "${className}".`);
      this.loadClasses();

    }finally{
      this.loadingCsv=false;
      this.importProgress=0;
      this.importTarget=null;
      this.importFile=null;
      this.cdr.detectChanges();
    }

  }

  cancelImport(){
    this.importTarget=null;
    this.importFile=null;
    this.loadingCsv=false;
    this.importProgress=0;
    this.cdr.detectChanges();
  }

  parseCsv(text:string):Array<{nom:string;prenom:string}>{

    const lines=text.replace(/\r/g,'')
    .split('\n')
    .filter(l=>l.trim().length>0);

    if(lines.length===0)return[];

    const header=lines[0]
    .split(',')
    .map(s=>s.trim().toLowerCase());

    const iNom=header.indexOf('nom');
    const iPrenom=header.indexOf('prenom');

    if(iNom===-1||iPrenom===-1)return[];

    const res:Array<{nom:string;prenom:string}>=[];

    for(let i=1;i<lines.length;i++){
      const cols=lines[i].split(',').map(s=>s.trim());
      const nom=cols[iNom]??'';
      const prenom=cols[iPrenom]??'';
      if(nom&&prenom)res.push({nom,prenom});
    }

    return res;

  }

  async exportClassroom(classId:number){

    const classroom:any=await firstValueFrom(
      this.http.get(`/api/classrooms/${classId}`)
    );

    const eleves:any[]=await firstValueFrom(
      this.http.get<any[]>(`/api/classrooms/${classId}/eleves`)
    );

    let csv=`Classe,${classroom.nom}\n`;
    csv+="Date";

    for(const e of eleves)csv+=`,${e.prenom} ${e.nom}`;

    csv+="\n";

    const maxRemarks=Math.max(
      ...eleves.map(e=>e.remarques?.length??0)
    );

    for(let i=0;i<maxRemarks;i++){

      let date="";

      for(const e of eleves){
        const r=e.remarques?.[i];
        if(r&&!date){
          date=new Date(r.createdAt)
          .toLocaleDateString('fr-FR',{
            day:'2-digit',
            month:'2-digit',
            year:'numeric'
          });
        }
      }

      csv+=date;

      for(const e of eleves){
        const r=e.remarques?.[i];
        if(!r){csv+=",";continue;}
        csv+=`,`+r.intitule;
      }

      csv+="\n";

    }

    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=window.URL.createObjectURL(blob);

    const a=document.createElement("a");
    a.href=url;
    a.download=`classe_${classroom.nom}.csv`;
    a.click();

    window.URL.revokeObjectURL(url);

  }

  async deleteEmptyTables(classId:number,keepCount:number){

    const tables:any[]=await firstValueFrom(
      this.http.get<any[]>(`/api/classrooms/${classId}/tables`)
    );

    for(let i=tables.length-1;i>=keepCount;i--){
      await firstValueFrom(
        this.http.delete(`/api/classrooms/${classId}/tables/${i}`)
      );
    }

  }

}