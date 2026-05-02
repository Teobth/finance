import { computed, inject, Injectable } from '@angular/core';
import { Transaction } from './interface_transaction';
import { ExcelParserService } from './service_excel-parser';

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

@Injectable({ providedIn: 'root' })
export class FinanceService {

  private excelService = inject(ExcelParserService);
  transactions = this.excelService.transactions;

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
      } else if (t.type === 'DIVIDENDE' || t.type === 'PAI.ITTCPN' || t.type === 'LIQUIDATION') {
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

      else if (t.type === 'LIQUIDATION') {  // ← comme un dividende
        if (!yearlyPnL[year]) yearlyPnL[year] = {};
        yearlyPnL[year][ticker] = (yearlyPnL[year][ticker] || 0) + t.total;
      }

      else if (t.type === 'CRD') {
        if (!yearlyPnL[year]) yearlyPnL[year] = {};
        yearlyPnL[year][ticker] = (yearlyPnL[year][ticker] || 0) - t.total;
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

  calculateGlobalYearlyStats(): { 
    year: number; 
    amount: number; 
    amountWithPnL: number;
    pnl: number; 
    performance: number;
    performanceWithPnL: number;
  }[] {
    const yearlyDeposits = this.excelService.yearlyDeposits();
    const pnl = this.yearlyStats();
    const dividends = this.yearlyDividends();

    const allYears = new Set([
      ...Object.keys(yearlyDeposits).map(Number),
      ...Object.keys(pnl).map(Number),
      ...Object.keys(dividends).map(Number),
    ]);

    let cumulativePnL = 0;

    return Array.from(allYears)
      .sort((a, b) => a - b)
      .map(year => {
        const deposits = yearlyDeposits[year] || 0;
        const yearPnl = Object.values(pnl[year] || {}).reduce((a, b) => a + b, 0);
        const yearDiv = Object.values(dividends[year] || {}).reduce((a, b) => a + b, 0);
        const totalGain = yearPnl + yearDiv;

        const amount = deposits;
        const amountWithPnL = deposits + cumulativePnL;

        cumulativePnL += totalGain;

        return {
          year,
          amount,
          amountWithPnL,
          pnl: totalGain,
          performance: amount > 0 ? (totalGain / amount) * 100 : 0,
          performanceWithPnL: amountWithPnL > 0 ? (totalGain / amountWithPnL) * 100 : 0
        };
      })
      .filter(d => d.amount > 0);
  }

  calculateMonthlyPnL(allTransactions: Transaction[]): { month: string; value: number; details: { ticker: string; value: number }[] }[] {
    const sorted = [...allTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const holdings: Record<string, { totalCost: number; quantity: number }> = {};
    const monthlyPnL: Record<string, Record<string, number>> = {}; // ← par mois ET par ticker

    for (const t of sorted) {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const { ticker, type, total } = t;

      holdings[ticker] ??= { totalCost: 0, quantity: 0 };
      monthlyPnL[key] ??= {};

      if (type === 'ACHAT' || type === 'TAXE') {
        holdings[ticker].totalCost += total;
        holdings[ticker].quantity += t.quantite;
      } else if (type === 'VENTE' && holdings[ticker].quantity > 0) {
        const shareOfCost = (holdings[ticker].totalCost / holdings[ticker].quantity) * t.quantite;
        const profit = total - shareOfCost;
        monthlyPnL[key][ticker] = (monthlyPnL[key][ticker] || 0) + profit;
        holdings[ticker].totalCost -= shareOfCost;
        holdings[ticker].quantity -= t.quantite;
      } else if (type === 'DIVIDENDE' || type === 'PAI.ITTCPN' || type === 'LIQUIDATION') {
        monthlyPnL[key][ticker] = (monthlyPnL[key][ticker] || 0) + total;
      } else if (type === 'CRD') {
        monthlyPnL[key][ticker] = (monthlyPnL[key][ticker] || 0) - total;
      }
    }

    // Génère tous les mois entre le premier et le dernier
    const keys = Object.keys(monthlyPnL).sort();
    if (keys.length === 0) return [];

    const result: { month: string; value: number; details: { ticker: string; value: number }[] }[] = [];
    const [startYear, startMonth] = keys[0].split('-').map(Number);
    const [endYear, endMonth] = keys[keys.length - 1].split('-').map(Number);

    let y = startYear, m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const tickerData = monthlyPnL[key] || {};
      const details = Object.entries(tickerData)
        .map(([ticker, value]) => ({ ticker, value }))
        .sort((a, b) => b.value - a.value); // ← les plus gros gains en premier

      result.push({
        month: key,
        value: details.reduce((acc, d) => acc + d.value, 0),
        details
      });

      m++;
      if (m > 12) { m = 1; y++; }
    }

    return result.reverse();
  }

  monthlyPnL = computed(() => this.calculateMonthlyPnL(this.transactions()));

  yearlyStats = computed(() =>
    this.calculateYearlyPnL(this.transactions())
  );

  yearlyDividends = computed(() =>
    this.calculateYearlyDividends(this.transactions())
  );

  availableYears = computed(() => {
    const year = new Set([
      ...Object.keys(this.yearlyStats()).map(Number),
      ...Object.keys(this.yearlyDividends()).map(Number),
    ]);
    return Array.from(year).sort((a, b) => a - b);
  });

  getPnL(year: number, ticker: string): number {
    return this.yearlyStats()[year]?.[ticker] || 0;
  }

  getDividend(year: number, ticker: string): number {
    return this.yearlyDividends()[year]?.[ticker] || 0;
  }
}