import {Component,Input,Output,EventEmitter,OnChanges,SimpleChanges} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {FormsModule} from '@angular/forms';

/* Structure d'une remarque */
export interface Remarque{
	id:number;
	intitule:string;
	createdAt:string;
	type?:'REMARQUE_GENERALE'|'BAVARDAGE'|'DEVOIR_NON_FAIT'|string;
	eleveId?:number;
	classRoomId?:number;
	deleted?:boolean;
}

/* Structure d'un élève */
export interface Student{
	id:number;
	prenom:string;
	nom:string;
	remarques:Remarque[];
}

type Category='BAVARDAGE'|'DEVOIR_NON_FAIT';

/* Composant affichant les détails d'un élève et ses remarques */
@Component({
	selector:'app-student-detail',
	standalone:true,
	imports:[CommonModule,FormsModule],
	templateUrl:'./student-detail.component.html',
	styleUrls:['./student-detail.component.css']
})
export class StudentDetailComponent implements OnChanges{
	@Input() student:Student|null=null;
	@Input() classRoomId!:number;
	@Input() courseDate:Date|null=null;
	@Input() devoirs:string[]=[];

	@Output() studentDeleted=new EventEmitter<number>();
	@Output() remarksChanged=new EventEmitter<void>();

	newRemarqueText="";
	selectedDevoir:string|null=null;
  categories:{label:string,value:Category}[]=[
    {label:"Bavardage",value:"BAVARDAGE"},
    {label:"Devoir non fait",value:"DEVOIR_NON_FAIT"}
  ];

	constructor(private http:HttpClient){}

	/* Réagit aux changements d'inputs */
	ngOnChanges(changes:SimpleChanges){
		if(changes['student']){
			this.newRemarqueText="";
			if(this.student){
				const rawId:any=
				(this.student as any).id??
				(this.student as any).eleveId??
				(this.student as any).idEleve??
				(this.student as any).id_eleve??
				(this.student as any).eleve_id;
				(this.student as any).id=Number(rawId);
				const r:any=(this.student as any).remarques;
				(this.student as any).remarques=Array.isArray(r)?r:[];
			}
		}

		if(changes['student']||changes['devoirs']){
			this.loadLastSelectedDevoir();
		}
	}

	deleteStudent(){
		if(!this.student)return;
		const confirmed=window.confirm(
			`Vous êtes sûr de vouloir supprimer ${this.student.prenom} ${this.student.nom} ?`
		);
		if(!confirmed)return;

		this.http.delete(`/api/classrooms/${this.classRoomId}/eleves/${this.student.id}`)
		.subscribe(()=>{
			this.studentDeleted.emit(this.student!.id);
		});
	}

	renameStudent(){
		if(!this.student)return;
		const prenom=prompt("Nouveau prénom :",this.student.prenom);

		if(!prenom)return;
		const nom=prompt("Nouveau nom :",this.student.nom);

		if(!nom)return;
		const prenomTrimmed=prenom.trim();
		const nomTrimmed=nom.trim();

		if(!prenomTrimmed||!nomTrimmed)return;

		const body={
			prenom:prenomTrimmed,
			nom:nomTrimmed
		};

		this.http.put(
			`/api/classrooms/${this.classRoomId}/eleves/${this.student.id}`,
			body
		).subscribe(()=>{
			this.student!.prenom=prenomTrimmed;
			this.student!.nom=nomTrimmed;
		});
	}

	/* Ajouter une remarque prédéfinie */
	addCategoryRemarque(category:Category){

		const sameLocalDay=(a:Date,b:Date)=>
		a.getFullYear()===b.getFullYear()&&
		a.getMonth()===b.getMonth()&&
		a.getDate()===b.getDate();

		if(this.courseDate&&!sameLocalDay(this.courseDate,new Date())){
			alert("Cette remarque ne peut pas être ajoutée car la date ne correspond pas.");
			return;
		}

		if(!this.student)return;
		const eleveId=Number((this.student as any).id);
		if(!Number.isFinite(eleveId)||eleveId<=0)return;
		const d=this.courseDate||new Date();
		const yyyy=d.getFullYear();
		const mm=String(d.getMonth()+1).padStart(2,'0');
		const dd=String(d.getDate()).padStart(2,'0');
		const dateStr=`${yyyy}-${mm}-${dd}`;

		if(category==='DEVOIR_NON_FAIT'&&!this.selectedDevoir){
			alert("Veuillez sélectionner un devoir.");
			return;
		}

		if(category==='DEVOIR_NON_FAIT'){
			const devoir=String(this.selectedDevoir).trim().toLowerCase();
			const exists=(this.student.remarques||[]).some(r=>{
				if(r.deleted)return false;
				const intitule=String(r.intitule||'').trim().toLowerCase();
				const type=String((r as any).type||'').trim().toUpperCase();
				return intitule===devoir&&(type==='DEVOIR_NON_FAIT'||type==='');
			});

			if(exists){
				alert("Ce devoir est déjà marqué comme non fait pour cet élève.");
				return;
			}
		}

		if(category==='BAVARDAGE'){
			const intitule='Bavardage';
			const body:any={
				eleveId,
				classRoomId:this.classRoomId,
				intitule,
				label:intitule,
				date:dateStr,
				courseDate:dateStr
			};

			this.http.post('/api/bavardages',body).subscribe({
				next:(created:any)=>{
					const toAdd:Remarque={
						id:Number(created?.id)||Date.now(),
						intitule:created?.intitule||intitule,
						createdAt:created?.createdAt||new Date().toISOString(),
						type:created?.type||'BAVARDAGE',
						eleveId,
						classRoomId:this.classRoomId
					};
					this.student!.remarques.push(toAdd);
					this.remarksChanged.emit();
				},
				error:()=>alert("Erreur lors de l’ajout du bavardage.")
			});
			return;
		}
		const intitule=String(this.selectedDevoir);
		const body:any={
			eleveId,
			classRoomId:this.classRoomId,
			devoir:intitule,
			nomDevoir:intitule,
			intitule,
			date:dateStr,
			courseDate:dateStr
		};

		this.http.post('/api/devoirs-non-faits',body).subscribe({
			next:(created:any)=>{
				const toAdd:Remarque={
					id:Number(created?.id)||Date.now(),
					intitule:created?.intitule||intitule,
					createdAt:created?.createdAt||new Date().toISOString(),
					type:created?.type||'DEVOIR_NON_FAIT',
					eleveId,
					classRoomId:this.classRoomId
				};
				this.student!.remarques.push(toAdd);
				this.remarksChanged.emit();
			},
			error:()=>alert("Erreur lors de l’ajout du devoir non fait.")
		});
	}

	addRemarque(){
		const sameLocalDay=(a:Date,b:Date)=>
		a.getFullYear()===b.getFullYear()&&
		a.getMonth()===b.getMonth()&&
		a.getDate()===b.getDate();

		if(this.courseDate&&!sameLocalDay(this.courseDate,new Date())){
			alert("Cette remarque ne peut pas être ajoutée car la date ne correspond pas.");
			return;
		}

		if(!this.student)return;
		const eleveId=Number((this.student as any).id);
		if(!Number.isFinite(eleveId)||eleveId<=0){
			alert("ID élève invalide.");
			return;
		}

		const intitule=this.newRemarqueText.trim();
		if(!intitule)return;
		const body={
			intitule,
			eleveId,
			classRoomId:this.classRoomId
		};

		this.http.post('/api/remarques',body).subscribe({
			next:(created:any)=>{
				const toAdd:Remarque={
					id:Number(created?.id)||Date.now(),
					intitule:created?.intitule||intitule,
					createdAt:created?.createdAt||new Date().toISOString(),
					type:created?.type||'REMARQUE_GENERALE',
					eleveId,
					classRoomId:this.classRoomId
				};
				this.student!.remarques.push(toAdd);
				this.newRemarqueText="";
				this.remarksChanged.emit();
			},
			error:()=>alert("Erreur lors de l’ajout de la remarque.")
		});
	}

	editRemarque(remarque:Remarque){
		const sameLocalDay=(a:Date,b:Date)=>
		a.getFullYear()===b.getFullYear()&&
		a.getMonth()===b.getMonth()&&
		a.getDate()===b.getDate();

		if(this.courseDate&&!sameLocalDay(this.courseDate,new Date())){
			alert("Cette remarque ne peut pas être modifiée car la date ne correspond pas.");
			return;
		}

		if(!this.student)return;
		if(this.isPredefinedRemarque(remarque))return;
		const nouveauTexte=prompt("Modifier la remarque :",this.cleanText(remarque.intitule));
		if(!nouveauTexte)return;
		const formattedText=nouveauTexte.trim();
		if(!formattedText)return;

		const body={
			intitule:formattedText,
			eleveId:this.student.id,
			classRoomId:this.classRoomId
		};

		this.http.put(`/api/remarques/${remarque.id}`,body).subscribe(()=>{
			remarque.intitule=formattedText;
			this.remarksChanged.emit();
		});
	}

	deleteRemarque(remarque:Remarque){
		remarque.deleted=true;
	}

	restore(remarque:Remarque){
		remarque.deleted=false;
	}

	deleteForever(remarque:Remarque){

		if(!this.student)return;

		this.http.delete(`/api/remarques/${remarque.id}`)
		.subscribe(()=>{
			this.student!.remarques=
			this.student!.remarques.filter(r=>r.id!==remarque.id);
			this.remarksChanged.emit();
		});
	}

	/* Remarques actives */
	get activeRemarques(){
		const remarques=this.student?.remarques;
		return Array.isArray(remarques)?remarques.filter(r=>!r.deleted):[];
	}

	/* Remarques supprimées */
	get deletedRemarques(){
		const remarques=this.student?.remarques;
		return Array.isArray(remarques)?remarques.filter(r=>r.deleted):[];
	}

	/* Nettoyer texte */
	cleanText(text:string):string{
		return(text||'').replace(/^\[[^\]]+\]\s*/,'');
	}

	/* Charger dernier devoir utilisé */
	loadLastSelectedDevoir(){
		if(!this.classRoomId)return;
		const saved=localStorage.getItem(`lastDevoir_${this.classRoomId}`);
		if(saved&&this.devoirs.includes(saved)){
			this.selectedDevoir=saved;
		}
	}

	onDevoirChange(){
		if(!this.classRoomId)return;
		if(this.selectedDevoir){
			localStorage.setItem(
				`lastDevoir_${this.classRoomId}`,
				this.selectedDevoir
			);
		}
	}

	isPredefinedRemarque(remarque:Remarque):boolean{
		const t=(remarque as any)?.type;
		return t==='BAVARDAGE'||t==='DEVOIR_NON_FAIT';
	}

	deleteAllDeleted(){
		if(!this.student)return;

		const confirmed=confirm(
		"Supprimer définitivement toutes les remarques dans la corbeille ?"
		);
		if(!confirmed)return;
		const toDelete=[...this.deletedRemarques];
		Promise.all(
		toDelete.map(remarque=>
			this.http.delete(`/api/remarques/${remarque.id}`).toPromise()
		)
		).then(()=>{
			this.student!.remarques=
			this.student!.remarques.filter(r=>!r.deleted);
			this.remarksChanged.emit();

		}).catch(()=>{
			alert("Une erreur est survenue lors de la suppression.");
		});
	}
}