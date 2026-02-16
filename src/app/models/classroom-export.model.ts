export interface PositionExport {
  x: number;
  y: number;
}

export interface TableExport {
  position: PositionExport;
}

export interface RemarqueExport {
  id: number;
  intitule: string;
  createdAt: string;
  deletedAt?: string;
}

export interface EleveExport {
  id: number;
  nom: string;
  prenom: string;
  remarques: RemarqueExport[];
  table: TableExport | null;
}

export interface GroupeExport {
  eleves: EleveExport[];
}

export interface ClassRoomExport {
  id: number;
  nom: string;
  eleves: GroupeExport;
  tables: TableExport[];
}