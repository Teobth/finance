import { Injectable } from '@angular/core';
import { Transaction } from './interface_transaction';

export interface TickerStats {
  totalAchat: number;
  totalVente: number;
  profitRealise: number;
  quantiteActuelle: number;
  pru: number;
  rendement: number;
}

interface YearlyData<T> {
  [year: number]: {
    [ticker: string]: number;
  };
}

export type YearlyPerformance = YearlyData<number>;
export type YearlyInvest = YearlyData<number>;

// export interface YearlyPerformance {
//   [year: number]: {
//     [ticker: string]: number;
//   };
// }

// export interface YearlyInvest {
//   [year: number]: {
//     [ticker: string]: number;
//   };
// }

@Injectable({ providedIn: 'root' })
export class FinanceService {

  calculateStats(transactions: Transaction[]): TickerStats {
    let cumulCoutAchat = 0;
    let cumulQuantiteAchat = 0;
    let totalVente = 0;
    let quantiteVendue = 0;

    transactions.forEach(t => {
      if (t.type === 'ACHAT' || t.type === 'TAXE') {
        cumulCoutAchat += t.total;
        cumulQuantiteAchat += t.quantite;
      } else if (t.type === 'VENTE') {
        totalVente += t.total;
        quantiteVendue += t.quantite;
      } else if (t.type === 'DIVIDENDE' || t.type === 'PAI.ITTCPN') {
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

  // calculateYearlyGlobalStats(allTransactions: Transaction[]): YearlyPerformance {
  //   const yearlyData: YearlyPerformance = {};

  //   allTransactions.forEach(t => {
  //     const year = new Date(t.date).getFullYear();
  //     const ticker = t.ticker;

  //     if (!yearlyData[year]) yearlyData[year] = {};
  //     if (!yearlyData[year][ticker]) yearlyData[year][ticker] = 0;

  //     if (t.type === 'ACHAT') {
  //       yearlyData[year][ticker] -= t.total;
  //     } else {
  //       yearlyData[year][ticker] += t.total;
  //     }
  //   });

  //   return yearlyData;
  // }

  calculateYearlyPnL(allTransactions: Transaction[]): YearlyPerformance {
    const yearlyPnL: YearlyPerformance = {};
    
    const holdings: Record<string, { totalCost: number; quantity: number }> = {};

    for (let i = allTransactions.length - 1; i >= 0; i--) {
      const t = allTransactions[i];
      const year = new Date(t.date).getFullYear();
      const ticker = t.ticker;

      if (!holdings[ticker]) holdings[ticker] = { totalCost: 0, quantity: 0 };

      if (t.type === 'ACHAT' || t.type === 'TAXE') {
        holdings[ticker].totalCost += t.total;
        holdings[ticker].quantity += t.quantite;
      } 
      else if (t.type === 'VENTE' && holdings[ticker].quantity > 0) {
        const shareOfCost = (holdings[ticker].totalCost / holdings[ticker].quantity) * t.quantite;
        const profit = t.total - shareOfCost;

        if (!yearlyPnL[year]) yearlyPnL[year] = {};
        yearlyPnL[year][ticker] = (yearlyPnL[year][ticker] || 0) + profit;

        holdings[ticker].totalCost -= shareOfCost;
        holdings[ticker].quantity -= t.quantite;
      }
    }
    return yearlyPnL;
  }

  calculateYearlyDividends(allTransactions: Transaction[]): YearlyPerformance {
    const yearlyDividends: YearlyPerformance = {};

    allTransactions.forEach(t => {
      if (t.type === 'DIVIDENDE' || t.type === 'PAI.ITTCPN') {
        const year = new Date(t.date).getFullYear();
        const ticker = t.ticker;

        yearlyDividends[year] ??= {};
        yearlyDividends[year][ticker] = (yearlyDividends[year][ticker] ?? 0) + t.total;

      }
    });

    return yearlyDividends;
  }

  calculateInvestMax(allTransactions: Transaction[]): YearlyInvest {
    const yearlyInvest: YearlyInvest = {};
    const currentRunningBalance: Record<string, number> = {};
    
    // 1. Tri unique
    const sorted = [...allTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let lastYearProcessed = -1;

    for (const t of sorted) {
      const year = new Date(t.date).getFullYear();
      const { ticker, type, total } = t;

      // 2. Si on change d'année, on reporte les soldes actuels 
      // pour que le "Max" de la nouvelle année commence avec l'existant
      if (year !== lastYearProcessed) {
        yearlyInvest[year] = {};
        for (const tk in currentRunningBalance) {
          yearlyInvest[year][tk] = currentRunningBalance[tk];
        }
        lastYearProcessed = year;
      }

      // 3. Mise à jour de la balance
      currentRunningBalance[ticker] ??= 0;
      if (type === 'ACHAT' || type === 'TAXE') {
        currentRunningBalance[ticker] += total;
      } else if (type === 'VENTE') {
        currentRunningBalance[ticker] = Math.max(0, currentRunningBalance[ticker] - total);
      }

      // 4. Calcul du Pic (Max)
      yearlyInvest[year][ticker] = Math.max(
        yearlyInvest[year][ticker] ?? 0,
        currentRunningBalance[ticker]
      );
    }

    return yearlyInvest;
  }
}