import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Transaction } from '../models/transaction';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ExcelParserService {

  constructor(private http: HttpClient) {}

  public transactions: Transaction[] = [];
  
  async parseExcel(): Promise<Transaction[]> {
    try {
      console.log("1. Requête HTTP lancée...");
      const data = await firstValueFrom(
        this.http.get('testStock.xlsx', { responseType: 'arraybuffer' })
      );
      
      console.log("2. Fichier reçu, lecture Excel en cours...");
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log("3. Données extraites :", jsonData.length, "lignes");
      return this.mapToTransactions(jsonData);
    } catch (error) {
      console.error("Erreur critique dans parseExcel :", error);
      throw error;
    }
  }

  private mapToTransactions(data: any[]): Transaction[] {
    return data
    .filter(item => {
      const firstWord = item.libellé ? item.libellé.split(' ')[0] : '';
      return firstWord !== 'VIR';
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