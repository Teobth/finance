import { Injectable, signal } from '@angular/core';
import { Transaction } from './interface_transaction';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

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
      // 1. On charge le fichier JSON unifié généré par le script
      const data = await firstValueFrom(
        this.http.get<any[]>('data/portfolio.json')
      );

      // 2. Le JSON stocke les dates en chaînes de caractères (string).
      // On les convertit en vrais objets Date JavaScript pour FinanceService.
      const parsedTransactions: Transaction[] = data.map(item => ({
        ...item,
        date: new Date(item.date)
      }));

      // 3. Calcul automatique des dépôts annuels cumulés (gère Fortuneo + Trade Republic)
      const yearlyDeposits: Record<number, number> = {};
      let runningBalance = 0;

      // On isole les virements, triés du plus ancien au plus récent
      const virements = parsedTransactions
        .filter(t => t.type === 'CRE' || t.type === 'DEB')
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      for (const vir of virements) {
        const year = vir.date.getFullYear();
        // Le montant du virement est stocké dans 'total'
        if(vir.type === 'DEB') {
          runningBalance -= vir.total;
        } else {
          runningBalance += vir.total;
        }
        yearlyDeposits[year] = Math.max(yearlyDeposits[year] || 0, runningBalance);
      }

      // Reporter le max des années précédentes dans les années suivantes
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
      console.error('Erreur lors du chargement du fichier portfolio.json', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}