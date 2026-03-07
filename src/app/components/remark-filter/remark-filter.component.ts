import{Component,Input}from'@angular/core';
import{CommonModule}from'@angular/common';
import{FormsModule}from'@angular/forms';

/* Filtre permettant de rechercher des remarques parmi les élèves */
@Component({
	selector:'app-remark-filter',
	standalone:true,
	imports:[CommonModule,FormsModule],
	templateUrl:'./remark-filter.component.html',
	styleUrls:['./remark-filter.component.css']
})
export class RemarkFilterComponent{

	@Input()eleves:any[]=[];
	filterText='';

	/* Supprime les tags éventuels dans les remarques */
	clean(text:string){
		return text.replace(/^\[.*?\]\s*/,'');
	}

	/* Retourne les remarques correspondant au texte recherché */
	get filtered(){

		const search=this.filterText.trim().toLowerCase();
		if(!search)return[];

		return this.eleves
		.map(eleve=>{
			const remarques=eleve.remarques?.filter((r:any)=>
				this.clean(r.intitule).toLowerCase().includes(search)
			);
			return remarques?.length?{eleve,remarques}:null;
		})
		.filter(x=>x!==null);

	}

}