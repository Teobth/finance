import { computed, inject, Injectable } from '@angular/core';
import { Transaction } from './interface_transaction';
import { ExcelParserService } from './service_CSV-parser';

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
    let totalAchat = 0;
    let totalCost = 0;
    let quantity = 0;
    let totalVente = 0;
    let profitRealise = 0;

    const sorted = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const t of sorted) {
      switch (t.type) {
        case 'ACHAT':
        case 'TAXE':
          totalAchat += t.total;
          totalCost += t.total;
          quantity += t.quantite;
          break;

        case 'VENTE': {
          const pruCourant = quantity > 0 ? totalCost / quantity : 0;
          
          const coutVente = pruCourant * t.quantite;
          profitRealise += (t.total - coutVente);
          
          totalVente += t.total;
          totalCost -= coutVente;
          quantity -= t.quantite;

          if (quantity <= 0) {
            totalCost = 0;
            quantity = 0;
          }
          break;
        }

        case 'DIVIDENDE':
        case 'PAI.ITTCPN':
        case 'LIQUIDATION':
          totalVente += t.total;
          profitRealise += t.total;
          break;
      }
    }

    const pruFinal = quantity > 0 ? totalCost / quantity : 0;
    const rendement = totalAchat > 0 ? (profitRealise / totalAchat) * 100 : 0;

    return {
      totalAchat,
      totalVente,
      profitRealise,
      quantiteActuelle: quantity,
      pru: pruFinal,
      rendement
    };
  }

  calculateYearlyPnL(allTransactions: Transaction[]): YearlyPerformance {
    const yearlyPnL: YearlyPerformance = {};
    
    const holdings: Record<string, { totalCost: number; quantity: number }> = {};

    for (const t of allTransactions.slice().reverse()) {
      const year = new Date(t.date).getFullYear();
      const ticker = t.ticker;

      if (!holdings[ticker]) holdings[ticker] = { totalCost: 0, quantity: 0 };

      const h = holdings[ticker];

      switch (t.type) {
        case 'ACHAT':
        case 'TAXE':
          h.totalCost += t.total;
          h.quantity += t.quantite;
          break;

        case 'VENTE':
          if (h.quantity > 0) {
            const shareOfCost = (h.totalCost / h.quantity) * t.quantite;
            const profit = t.total - shareOfCost;
            yearlyPnL[year] ??= {};
            yearlyPnL[year][ticker] = (yearlyPnL[year][ticker] || 0) + profit;
            h.totalCost -= shareOfCost;
            h.quantity -= t.quantite;

            if (h.quantity <= 0) {
              h.totalCost = 0;
              h.quantity = 0;
            }
          }
          break;

        case 'LIQUIDATION':
          yearlyPnL[year] ??= {};
          yearlyPnL[year][ticker] = (yearlyPnL[year][ticker] || 0) + t.total;
          break;

        case 'CRD':
          yearlyPnL[year] ??= {};
          yearlyPnL[year][ticker] = (yearlyPnL[year][ticker] || 0) - t.total;
          break;
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

  calculateMonthlyPnL(
    allTransactions: Transaction[], 
    monthlyPrices: Record<string, Record<string, number>> = {}
  ) {
    const sorted = [...allTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const holdings: Record<string, { totalCost: number; quantity: number }> = {};
    const monthlyPnL: Record<string, Record<string, number>> = {};
    
    // 1. MODIFICATION : On stocke la quantité ET le coût total historique à fin de mois
    const monthlyHoldingsSnapshot: Record<string, Record<string, { quantity: number; totalCost: number }>> = {};

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

      // 2. MODIFICATION : On enregistre l'état complet (quantité + coût) dans le snapshot
      monthlyHoldingsSnapshot[key] = {};
      for (const [tk, h] of Object.entries(holdings)) {
        if (h.quantity > 0) {
          monthlyHoldingsSnapshot[key][tk] = { 
            quantity: h.quantity, 
            totalCost: h.totalCost 
          };
        }
      }
    }

    const keys = Object.keys(monthlyPnL).sort();
    if (keys.length === 0) return [];

    const result = [];
    const [startYear, startMonth] = keys[0].split('-').map(Number);
    const [endYear, endMonth] = keys[keys.length - 1].split('-').map(Number);

    let y = startYear, m = startMonth;
    
    // 3. MODIFICATION : Typage mis à jour pour propager l'objet complet
    let lastKnownHoldings: Record<string, { quantity: number; totalCost: number }> = {}; 

    while (y < endYear || (y === endYear && m <= endMonth)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const tickerData = monthlyPnL[key] || {};
      
      if (monthlyHoldingsSnapshot[key]) {
        lastKnownHoldings = { ...monthlyHoldingsSnapshot[key] };
      }

      const details = Object.entries(tickerData)
        .map(([ticker, value]) => ({ ticker, value }))
        .sort((a, b) => b.value - a.value);

      // --- 4. MODIFICATION : CALCUL DE LA PLUS-VALUE LATENTE MENSUELLE ---
      let latentPnL = 0;
      const currentMonthPrices = monthlyPrices[key] || {};

      for (const [ticker, asset] of Object.entries(lastKnownHoldings)) {
        const price = currentMonthPrices[ticker] || 0; 
        if (price > 0 && asset.quantity > 0) {
          const currentValuation = asset.quantity * price;
          // Plus-value latente = Valeur marché actuelle - Coût total d'achat historique
          latentPnL += (currentValuation - asset.totalCost);
        }
      }

      // 5. MODIFICATION : On injecte 'latentPnL' à la place de 'portfolioValuation'
      result.push({
        month: key,
        value: details.reduce((acc, d) => acc + d.value, 0), // PnL Réalisé + Dividendes
        latentPnL, // 👈 Devient accessible pour votre composant graphique
        details
      });

      m++;
      if (m > 12) { m = 1; y++; }
    }

    return result.reverse();
  }

  monthlyPnL = computed(() => this.calculateMonthlyPnL(this.transactions(), this.excelService.monthlyPrices()));

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