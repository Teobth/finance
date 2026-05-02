import { Injectable, signal } from '@angular/core';
import * as XLSX from 'xlsx';
import { Transaction } from './interface_transaction';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { APP_CONFIG } from './const_constants';

@Injectable({ providedIn: 'root' })
export class ExcelParserService {

  private _deposits = signal<number>(0);
  private _transactions = signal<Transaction[]>([]);
  private _yearlyDeposits = signal<Record<number, number>>({});
  public deposits = this._deposits.asReadonly();
  public transactions = this._transactions.asReadonly();
  public yearlyDeposits = this._yearlyDeposits.asReadonly();
  public isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  async loadTransactions() {
    if (this._transactions().length > 0) return;
    this.isLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get('dataStock.xlsx', { responseType: 'arraybuffer' })
      );
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const yearlyDeposits: Record<number, number> = {};
      let runningBalance = 0;

      const virements = jsonData
        .filter((item: any) => item.libellé?.split(' ')[0] === 'VIR')
        .map((item: any) => ({
          date: this.parseFrenchDate(item['Date valeur']),
          amount: (+item.Crédit || 0) - Math.abs(+item.Débit || 0)
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      for (const vir of virements) {
        const year = vir.date.getFullYear();
        runningBalance += vir.amount;
        yearlyDeposits[year] = Math.max(yearlyDeposits[year] || 0, runningBalance);
      }

      // Reporter le max des années précédentes dans les années suivantes
      const years = Object.keys(yearlyDeposits).map(Number).sort((a, b) => a - b);
      for (let i = 1; i < years.length; i++) {
        yearlyDeposits[years[i]] = Math.max(yearlyDeposits[years[i]], yearlyDeposits[years[i - 1]]);
      }

      this._yearlyDeposits.set(yearlyDeposits);

      const parsed = this.mapToTransactions(jsonData);
      const sorted = parsed.sort((a, b) => b.date.getTime() - a.date.getTime());
      this._transactions.set(sorted);
    } catch (error) {
      console.error('Erreur lors du chargement Excel', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private mapToTransactions(data: any[]): Transaction[] {
    return data 
    .filter(item => {
      const firstWord = item.libellé ? item.libellé.split(' ')[0] : '';
      return ['ACHAT', 'VENTE', 'TAXE', 'DIVIDENDE', 'PAI.ITTCPN', 'LIQUIDATION', 'CRD'].includes(firstWord);
    })
    .map(item => ({
      ...item,
      libellé: item.libellé.startsWith('TAXE')
        ? this.parseTaxe(item.libellé)
        : item.libellé.startsWith('LIQUIDATION')
          ? this.parseLiquidation(item.libellé)
          : item.libellé.startsWith('CRD')
            ? this.parseCRD(item.libellé)
            : item.libellé
    }))
    .map(item => {
      const parts = item.libellé ? item.libellé.split(' ') : [];
      const type = parts[0]
      const quantite = +parts[1];
      const ticker = parts.slice(2).join(' ');
      const total = item.Débit ? Math.abs(+item.Débit) : (+item.Crédit || 0);
      const prixUnitaire = quantite > 0 ? total / quantite : 0;
      return {
        id: item.ID || '',
        date: this.parseFrenchDate(item['Date valeur']),
        type: type,
        ticker: ticker,
        quantite: quantite,
        prixUnitaire: prixUnitaire,
        frais: 0,
        total: total
      };
    });
  }

  private parseFrenchDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  private parseTaxe(libelle: string): string {
    const parts = libelle.split(' ');
    const isin = parts[3];
    const ticker =
    (APP_CONFIG.CODE_ISIN as Record<string, string>)[isin] ?? isin;
    return `${parts[0]} 0 ${ticker}`;
  }

  private parseLiquidation(libelle: string): string {
    const parts = libelle.split(' ');
    const ticker = parts.slice(1).join(' ');
    return `LIQUIDATION 0 ${ticker}`;
  }

  private parseCRD(libelle: string): string {
    return `CRD 0 FRAIS SRD`;
  }
}