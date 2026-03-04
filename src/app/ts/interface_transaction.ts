export interface Transaction {
  id: string;
  date: Date;
  type: 'ACHAT' | 'VENTE' | 'TAXE' | 'DIVIDENDE' | 'PAI.ITTCPN';
  ticker: string;
  quantite: number;
  prixUnitaire: number;
  frais: number;
  total: number;
}