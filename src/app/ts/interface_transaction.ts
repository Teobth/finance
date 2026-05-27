export interface Transaction {
  id: string;
  date: Date;
  type: 'ACHAT' | 'VENTE' | 'TAXE' | 'DIVIDENDE' | 'LIQUIDATION' | 'CRD' | 'PAI.ITTCPN' | 'VIR' | 'DEB' | 'CRE';
  ticker: string;
  quantite: number;
  prixUnitaire: number;
  frais: number;
  total: number;
  source?: 'FORTUNEO' | 'TRADE_REPUBLIC';
}