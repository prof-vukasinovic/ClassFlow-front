/**
 * Modèles utilisés pour l'export des données d'une classe.
 * L'objectif est de fournir au professeur un récapitulatif
 * des élèves et de toutes leurs remarques en fin d'année.
 */

export interface RemarqueExport {
  intitule: string;
  type: string;
  createdAt: string;
}

export interface EleveExport {
  nom: string;
  prenom: string;
  remarques: RemarqueExport[];
}

export interface ClassRoomExport {
  nom: string;
  eleves: EleveExport[];
}