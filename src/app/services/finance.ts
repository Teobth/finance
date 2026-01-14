import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction';

export interface TickerStats {
  totalAchat: number;
  totalVente: number;
  profitRealise: number;
  quantiteActuelle: number;
  pru: number;
  rendement: number;
}

export interface YearlyPerformance {
  [year: number]: {
    [ticker: string]: number;
  };
}

@Injectable({ providedIn: 'root' })
export class FinanceService {

  calculateStats(transactions: Transaction[]): TickerStats {
    let cumulCoutAchat = 0;
    let cumulQuantiteAchat = 0;
    let totalVente = 0;
    let quantiteVendue = 0;

    transactions.forEach(t => {
      if (t.type === 'ACHAT') {
        cumulCoutAchat += t.total;
        cumulQuantiteAchat += t.quantite;
      } else if (t.type === 'VENTE') {
        totalVente += t.total;
        quantiteVendue += t.quantite;
      } else if (t.type === 'DIVIDENDE') {
        totalVente += t.total;
      }
    });

    const quantiteActuelle = cumulQuantiteAchat - quantiteVendue;
    
    const pru = cumulQuantiteAchat > 0 ? cumulCoutAchat / cumulQuantiteAchat : 0;
    
    const profitRealise = totalVente - (pru * quantiteVendue);

    return {
      totalAchat: cumulCoutAchat,
      totalVente: totalVente,
      profitRealise: profitRealise,
      quantiteActuelle: quantiteActuelle,
      pru: pru,
      rendement: cumulCoutAchat > 0 ? (profitRealise / cumulCoutAchat) * 100 : 0
    };
  }

  //Inutilisée
  calculateYearlyGlobalStats(allTransactions: Transaction[]): YearlyPerformance {
    const yearlyData: YearlyPerformance = {};

    allTransactions.forEach(t => {
      const year = new Date(t.date).getFullYear();
      const ticker = t.ticker;

      if (!yearlyData[year]) yearlyData[year] = {};
      if (!yearlyData[year][ticker]) yearlyData[year][ticker] = 0;

      if (t.type === 'ACHAT') {
        yearlyData[year][ticker] -= t.total;
      } else {
        yearlyData[year][ticker] += t.total;
      }
    });

    return yearlyData;
  }

  calculateYearlyPnL(allTransactions: Transaction[]): YearlyPerformance {
    const yearlyPnL: YearlyPerformance = {};
    
    const holdings: { [ticker: string]: { totalCost: number, quantity: number } } = {};

    const sortedTransactions = [...allTransactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedTransactions.forEach(t => {
      const year = new Date(t.date).getFullYear();
      const ticker = t.ticker;

      if (!holdings[ticker]) {
        holdings[ticker] = { totalCost: 0, quantity: 0 };
      }

      if (t.type === 'ACHAT') {
        holdings[ticker].totalCost += t.total;
        holdings[ticker].quantity += t.quantite;
      } 
      else if (t.type === 'VENTE') {
        const shareOfCost = (holdings[ticker].totalCost / holdings[ticker].quantity) * t.quantite;
        const profit = t.total - shareOfCost;

        if (!yearlyPnL[year]) yearlyPnL[year] = {};
        if (!yearlyPnL[year][ticker]) yearlyPnL[year][ticker] = 0;

        yearlyPnL[year][ticker] += profit;

        holdings[ticker].totalCost -= shareOfCost;
        holdings[ticker].quantity -= t.quantite;
      }
    });

    return yearlyPnL;
  }
}