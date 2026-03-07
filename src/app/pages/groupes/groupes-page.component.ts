import { Component,OnInit,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute,RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector:'app-groupes-page',
  standalone:true,
  imports:[CommonModule,FormsModule,RouterModule],
  templateUrl:'./groupes-page.component.html',
  styleUrls:['./groupes-page.component.css']
})
export class GroupesPageComponent implements OnInit{

  classId!:string;
  groupes:any[]=[];
  eleves:any[]=[];
  nombreGroupes=2;
  dirty=false;

  couleurs=['#3498db','#2ecc71','#9b59b6','#e67e22','#e74c3c','#1abc9c'];

  constructor(
    private route:ActivatedRoute,
    private http:HttpClient,
    private cdr:ChangeDetectorRef
  ){}

  ngOnInit(){
    this.classId=this.route.snapshot.paramMap.get('id')!;
    this.loadEleves(()=>this.loadGroupes());
  }

  loadEleves(callback?:()=>void){
    this.http.get<any[]>(`/api/classrooms/${this.classId}/eleves`)
    .subscribe(data=>{
      this.eleves=data||[];
      if(callback)callback();
    });
  }

  loadGroupes(){
    this.http.get<any[]>(`/api/classrooms/${this.classId}/groupes`)
    .subscribe(data=>{

      if(!Array.isArray(data)||data.length===0){
        this.groupes=[];
        this.nombreGroupes=0;
        this.dirty=false;
        this.cdr.detectChanges();
        return;
      }

      this.groupes=data.map((g:any,index:number)=>({
        id:g.id,
        nom:(g.nom&&String(g.nom).trim())?String(g.nom).trim():`Groupe ${index+1}`,
        eleves:Array.isArray(g.eleves)?g.eleves:[]
      }));

      this.nombreGroupes=this.groupes.length;
      this.dirty=false;

      this.cdr.detectChanges();

      this.groupes.forEach((grp:any,index:number)=>{

        const backendNom=data[index]?.nom;
        if(!grp.id)return;
        if(backendNom&&String(backendNom).trim())return;

        this.http.put(`/api/classrooms/${this.classId}/groupes/${grp.id}`,{nom:grp.nom})
        .subscribe({next:()=>{},error:()=>{}});

      });

    });
  }

  createGroupes(){

    const n=Number(this.nombreGroupes);
    if(!Number.isFinite(n)||n<=0)return;

    if(this.dirty){
      const ok=confirm('Les changements non sauvegardés seront remplacés. Continuer ?');
      if(!ok)return;
    }

    this.groupes=[];

    for(let i=0;i<n;i++){
      this.groupes.push({nom:`Groupe ${i+1}`,eleves:[]});
    }

    this.dirty=true;
    this.cdr.detectChanges();

  }

  renameGroupe(groupe:any){

    const nom=prompt('Nom du groupe :',groupe.nom||'');
    if(!nom)return;

    const trimmed=nom.trim();
    if(!trimmed)return;

    if(groupe?.id){

      this.http.put(`/api/classrooms/${this.classId}/groupes/${groupe.id}`,{nom:trimmed})
      .subscribe(()=>{

        this.groupes=this.groupes.map(g=>
          g.id===groupe.id?{...g,nom:trimmed}:g
        );

        this.cdr.detectChanges();

      });

    }else{
      groupe.nom=trimmed;
      this.cdr.detectChanges();
    }

    this.dirty=true;

  }

  repartitionAleatoire(){

    const n=Number(this.nombreGroupes);
    if(!Number.isFinite(n)||n<=0)return;

    if(this.dirty){
      const ok=confirm('Des changements non sauvegardés seront remplacés. Continuer ?');
      if(!ok)return;
    }

    this.http.post<any[]>(`/api/classrooms/${this.classId}/groupes/aleatoire`,{groupCount:n})
    .subscribe({
      next:()=>{
        this.dirty=false;
        this.loadGroupes();
      },
      error:()=>alert('Erreur lors de la répartition aléatoire.')
    });

  }

  getAssignedStudentIds():number[]{
    return this.groupes.flatMap(g=>(g.eleves||[]).map((e:any)=>e.id));
  }

  getAvailableStudents(){
    const assigned=this.getAssignedStudentIds();
    return this.eleves.filter(e=>!assigned.includes(e.id));
  }

  ajouterEleve(groupe:any,eleveId:number){

    const eleve=this.eleves.find(e=>e.id===Number(eleveId));
    if(!eleve)return;

    if(!Array.isArray(groupe.eleves))groupe.eleves=[];
    if(groupe.eleves.some((e:any)=>e.id===eleve.id))return;

    groupe.eleves.push(eleve);
    this.dirty=true;

  }

  retirerEleve(groupe:any,eleve:any){

    groupe.eleves=(groupe.eleves||[])
    .filter((e:any)=>e.id!==eleve.id);

    this.dirty=true;

  }

  sauvegarder(){

    if(!this.groupes||this.groupes.length===0)return;
    if(!this.dirty)return;

    const payload=this.buildCreatePayloadFromCurrent();

    if(!payload){
      alert('Aucun groupe à enregistrer.');
      return;
    }

    const ok=confirm('Enregistrer ces groupes ? Cela remplacera les groupes existants.');
    if(!ok)return;

    this.http.get<any[]>(`/api/classrooms/${this.classId}/groupes`)
    .subscribe(existing=>{

      const list=Array.isArray(existing)?existing:[];
      const backup=this.buildCreatePayloadFromExisting(list);

      if(list.length===0){
        this.postCreatePayload(payload,backup);
        return;
      }

      let remaining=list.length;

      const done=()=>{
        remaining--;
        if(remaining===0)this.postCreatePayload(payload,backup);
      };

      list.forEach(g=>{
        this.http.delete(`/api/classrooms/${this.classId}/groupes/${g.id}`)
        .subscribe({next:()=>done(),error:()=>done()});
      });

    });

  }

  supprimerTousLesGroupes(){

    const ok=confirm('Supprimer tous les groupes ? Cette action est irréversible.');
    if(!ok)return;

    this.http.get<any[]>(`/api/classrooms/${this.classId}/groupes`)
    .subscribe(existing=>{

      const list=Array.isArray(existing)?existing:[];

      if(list.length===0){
        this.groupes=[];
        this.nombreGroupes=0;
        this.dirty=false;
        this.cdr.detectChanges();
        return;
      }

      let remaining=list.length;

      const done=()=>{
        remaining--;
        if(remaining===0){
          this.groupes=[];
          this.nombreGroupes=0;
          this.dirty=false;
          this.cdr.detectChanges();
        }
      };

      list.forEach(g=>{
        this.http.delete(`/api/classrooms/${this.classId}/groupes/${g.id}`)
        .subscribe({next:()=>done(),error:()=>done()});
      });

    });

  }

  private buildCreatePayloadFromCurrent(){

    const groupesIds=(this.groupes||[]).map((g:any)=>
      (g?.eleves||[])
      .map((e:any)=>e?.id)
      .filter((id:any)=>typeof id==='number')
    );

    const noms=(this.groupes||[]).map((g:any,index:number)=>
      (g?.nom&&String(g.nom).trim())?String(g.nom).trim():`Groupe ${index+1}`
    );

    if(groupesIds.length===0)return null;

    return{groupes:groupesIds,noms};

  }

  private buildCreatePayloadFromExisting(existing:any[]){

    const groupesIds=(existing||[]).map((g:any)=>
      (g?.eleves||[])
      .map((e:any)=>e?.id)
      .filter((id:any)=>typeof id==='number')
    );

    const noms=(existing||[]).map((g:any,index:number)=>
      (g?.nom&&String(g.nom).trim())?String(g.nom).trim():`Groupe ${index+1}`
    );

    return{groupes:groupesIds,noms};

  }

  private postCreatePayload(payload:any,backup:any){

    this.http.post(`/api/classrooms/${this.classId}/groupes`,payload)
    .subscribe({

      next:()=>{
        this.dirty=false;
        this.loadGroupes();
      },

      error:(err)=>{

        console.error('POST /groupes failed',err);
        console.error('Payload envoyé :',payload);

        if(backup&&Array.isArray(backup.groupes)&&backup.groupes.length>0){

          this.http.post(`/api/classrooms/${this.classId}/groupes`,backup)
          .subscribe({
            next:()=>this.loadGroupes(),
            error:()=>this.loadGroupes()
          });

        }else{
          this.loadGroupes();
        }

        alert('Erreur lors de l’enregistrement des groupes.');

      }

    });

  }

}