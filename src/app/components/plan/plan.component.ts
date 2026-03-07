import{
	Component,
	Input,
	Output,
	EventEmitter,
	ChangeDetectorRef,
	ElementRef,
	ViewChild,
	AfterViewInit,
	OnChanges,
	SimpleChanges
}from'@angular/core';
import{CommonModule}from'@angular/common';

/* Plan interactif permettant d'afficher et déplacer les tables */
@Component({
	selector:'app-plan',
	standalone:true,
	imports:[CommonModule],
	templateUrl:'./plan.component.html',
	styleUrls:['./plan.component.css']
})
export class PlanComponent implements AfterViewInit,OnChanges{

	@Input()tables:any[]=[];
	@Input()interactionMode:'student'|'table'='student';
	@Input()tableSize=100;
	@Input()cols=5;@Input()rows=5;

	@Output()studentClicked=new EventEmitter<any>();
	@Output()tableMoved=new EventEmitter<void>();

	@ViewChild('planContainer')planContainer!:ElementRef;

	planWidth=0;planHeight=0;
	draggedTable:any=null;

	constructor(private cdr:ChangeDetectorRef){}

	/* Initialise le plan après rendu */
	ngAfterViewInit(){
		this.updatePlanSize();
		this.realignAllTables();
	}

	/* Recalcule les positions si données changent */
	ngOnChanges(changes:SimpleChanges){
		if(changes['tables']||changes['cols']||changes['rows']||changes['tableSize']){
			setTimeout(()=>{
				this.updatePlanSize();
				this.realignAllTables();
			});
		}
	}

	updatePlanSize(){
		if(!this.planContainer)return;
		const rect=this.planContainer.nativeElement.getBoundingClientRect();
		this.planWidth=rect.width;this.planHeight=rect.height;
	}

	/* Repositionne les tables selon la grille */
	realignAllTables(){
		if(!this.planWidth||!this.planHeight)return;

		const cellWidth=this.planWidth/this.cols;
		const cellHeight=this.planHeight/this.rows;

		this.tables.forEach(t=>{
			const col=t.backendRef?.position?.x??0;
			const row=t.backendRef?.position?.y??0;
			t.x=col*cellWidth+(cellWidth-this.tableSize)/2;
			t.y=row*cellHeight+(cellHeight-this.tableSize)/2;
		});

		this.cdr.detectChanges();
	}

	getRemarqueCategory(remarque:any):string{
		const t=remarque?.type;
		if(t)return t;
		const match=remarque?.intitule?.match(/^\[(.*?)\]/);
		return match?match[1]:'REMARQUE_GENERALE';
	}

	getBavardageCount(eleve:any):number{
		const remarques=eleve?.remarques;
		if(!Array.isArray(remarques))return 0;
		return remarques.filter((r:any)=>this.getRemarqueCategory(r)==='BAVARDAGE').length;
	}

	/* Couleur de la table selon bavardages */
	getTableColorClass(table:any):string{
		if(!table.eleve)return'';
		const count=this.getBavardageCount(table.eleve);
		if(count>=3)return'table-red';
		if(count===2)return'table-orange';
		if(count===1)return'table-yellow';
		return'';
	}

	getDMCount(table:any):number{
		const remarques=table?.eleve?.remarques;
		if(!Array.isArray(remarques))return 0;
		return remarques.filter((r:any)=>this.getRemarqueCategory(r)==='DEVOIR_NON_FAIT').length;
	}

	/* Couleur de la barre DM */
	getDMBarClass(table:any):string{
		const count=this.getDMCount(table);
		if(count>=3)return'dm-red';
		if(count===2)return'dm-orange';
		if(count===1)return'dm-yellow';
		return'';
	}

	/* Début du drag */
	onMouseDown(event:MouseEvent,table:any){
		if(event.button!==0)return;
		if(this.interactionMode==='table')this.draggedTable=table;
	}

	/* Déplacement dans la grille */
	onMouseMove(event:MouseEvent){

		if(!this.draggedTable||this.interactionMode!=='table')return;

		const rect=this.planContainer.nativeElement.getBoundingClientRect();
		const cellWidth=rect.width/this.cols;
		const cellHeight=rect.height/this.rows;

		let col=Math.floor((event.clientX-rect.left)/cellWidth);
		let row=Math.floor((event.clientY-rect.top)/cellHeight);

		col=Math.max(0,Math.min(col,this.cols-1));
		row=Math.max(0,Math.min(row,this.rows-1));

		this.draggedTable.x=col*cellWidth+(cellWidth-this.tableSize)/2;
		this.draggedTable.y=row*cellHeight+(cellHeight-this.tableSize)/2;

		this.cdr.detectChanges();
	}

	/* Fin du drag et sauvegarde position */
	onMouseUp(event:MouseEvent){

		const movedTable=this.draggedTable;

		if(movedTable&&this.interactionMode==='table'){

			const rect=this.planContainer.nativeElement.getBoundingClientRect();
			const cellWidth=rect.width/this.cols;
			const cellHeight=rect.height/this.rows;

			const col=Math.floor(movedTable.x/cellWidth);
			const row=Math.floor(movedTable.y/cellHeight);

			movedTable.backendRef.position.x=col;
			movedTable.backendRef.position.y=row;

			this.tableMoved.emit();
		}

		this.draggedTable=null;
		this.realignAllTables();
	}

	/* Sélection d'un élève */
	onTableClick(table:any){
		if(this.interactionMode!=='student')return;
		if(table.eleve)this.studentClicked.emit(table.eleve);
	}
}