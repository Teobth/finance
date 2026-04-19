export interface Transaction {
  id: string;
  date: Date;
  type: 'ACHAT' | 'VENTE' | 'TAXE' | 'DIVIDENDE' | 'PAI.ITTCPN' | 'VIR';
  ticker: string;
  quantite: number;
  prixUnitaire: number;
  frais: number;
  total: number;
}