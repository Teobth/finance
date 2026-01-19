import { Injectable, signal } from '@angular/core';
import * as XLSX from 'xlsx';
import { Transaction } from '../models/transaction';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { RawExcelRow } from '../models/rawExcelRow';

@Injectable({ providedIn: 'root' })
export class ExcelParserService {

  private _transactions = signal<Transaction[]>([]);
  public transactions = this._transactions.asReadonly();
  public isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  async loadTransactions() {
    if (this._transactions().length > 0) return;

    this.isLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get('testStock.xlsx', { responseType: 'arraybuffer' })
      );
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
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
      //const libellé = item['libellé'] ?? '';
      const firstWord = item.libellé ? item.libellé.split(' ')[0] : '';
      return firstWord !== 'VIR' && firstWord !== 'TAXE';
    })
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
}