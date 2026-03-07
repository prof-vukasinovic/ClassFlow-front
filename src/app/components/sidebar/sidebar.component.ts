import{Component,Input,Output,EventEmitter}from'@angular/core';
import{CommonModule}from'@angular/common';
import{FormsModule}from'@angular/forms';

/* Sidebar permettant de rechercher et sélectionner un élève */
@Component({
	selector:'app-sidebar',
	standalone:true,
	imports:[CommonModule,FormsModule],
	templateUrl:'./sidebar.component.html',
	styleUrls:['./sidebar.component.css']
})
export class SidebarComponent{

	@Input()tables:any[]=[];
	@Input()disabled=false;

	@Output()studentSelected=new EventEmitter<any>();

	searchTerm='';

	/* Retourne les élèves présents dans les tables */
	getStudents(){
		return this.tables
		.map(t=>t.eleve)
		.filter(e=>e)
		.sort((a:any,b:any)=>a.nom.localeCompare(b.nom,'fr',{sensitivity:'base'}));
	}

	/* Élèves filtrés selon la recherche */
	filteredStudents(){
		const search=this.searchTerm.toLowerCase();
		return this.getStudents().filter((e:any)=>
			(e.prenom+' '+e.nom).toLowerCase().includes(search)
		);
	}

	selectStudent(eleve:any){
		if(this.disabled)return;
		this.studentSelected.emit(eleve);
	}
}