import { Injectable, signal } from '@angular/core';
import { Transaction } from './interface_transaction';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExcelParserService {

  private _deposits = signal<number>(0);
  private _transactions = signal<Transaction[]>([]);
  private _yearlyDeposits = signal<Record<number, number>>({});
  private _monthlyPrices = signal<Record<string, Record<string, number>>>({});
  
  public deposits = this._deposits.asReadonly();
  public transactions = this._transactions.asReadonly();
  public yearlyDeposits = this._yearlyDeposits.asReadonly();
  public monthlyPrices = this._monthlyPrices.asReadonly();
  public isLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {}
  
  async loadTransactions() {
    if (this._transactions().length > 0) return;
    this.isLoading.set(true);
    
    try {
      const data = await firstValueFrom(
        // this.http.get<any[]>('data/portfolio-demo.json')
        this.http.get<any[]>(environment.dataPath)
      );

      // 2. Conversion des dates
      const parsedTransactions: Transaction[] = data.map(item => ({
        ...item,
        date: new Date(item.date)
      }));

      // ==========================================
      // --- CHARGEMENT SÉCURISÉ DES PRIX ---
      // ==========================================
      try {
        const prices = await firstValueFrom(this.http.get<any>('data/prices.json'));
        this._monthlyPrices.set(prices);
      } catch (priceError) {
        // Si prices.json est absent ou invalide, on loggue un avertissement 
        // et on met un objet vide pour ne pas bloquer l'application
        console.warn("Avertissement: Impossible de charger 'data/prices.json'. Les valorisations mensuelles vaudront 0€.", priceError);
        this._monthlyPrices.set({});
      }
      // ==========================================

      // 3. Calcul automatique des dépôts annuels cumulés
      const yearlyDeposits: Record<number, number> = {};
      let runningBalance = 0;

      const virements = parsedTransactions
        .filter(t => t.type === 'CRE' || t.type === 'DEB')
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      for (const vir of virements) {
        const year = vir.date.getFullYear();
        if(vir.type === 'DEB') {
          runningBalance -= vir.total;
        } else {
          runningBalance += vir.total;
        }
        yearlyDeposits[year] = Math.max(yearlyDeposits[year] || 0, runningBalance);
      }

      const years = Object.keys(yearlyDeposits).map(Number).sort((a, b) => a - b);
      for (let i = 1; i < years.length; i++) {
        yearlyDeposits[years[i]] = Math.max(yearlyDeposits[years[i]], yearlyDeposits[years[i - 1]]);
      }

      this._yearlyDeposits.set(yearlyDeposits);

      // 4. On filtre pour ne garder QUE les vraies transactions boursières dans le flux principal
      const tradeTransactions = parsedTransactions.filter(t => t.type !== 'DEB' && t.type !== 'CRE');
      const sorted = tradeTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      this._transactions.set(sorted);

    } catch (error) {
      console.error("Erreur critique lors du chargement des transactions principales :", error);
    } finally {
      this.isLoading.set(false);
    }
  }
}