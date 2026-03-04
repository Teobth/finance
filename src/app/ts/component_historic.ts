import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService, YearlyPerformance } from './service_finance';
import { ExcelParserService } from './service_excel-parser';
import { RouterLink } from "@angular/router";

type SortType = { column: 'NAME' | 'TOTAL' | 'YEAR', year?: number };

@Component({
  selector: 'app-historic',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: '../html/historic.html',
  styleUrl: '../scss/historic.scss',
})
export class Historic {

  private excelService = inject(ExcelParserService);
  private financeService = inject(FinanceService);

  private sortCriteria = signal<SortType>({ column: 'NAME' });

  transactions = this.excelService.transactions;

  yearlyStats = computed(() =>
    this.financeService.calculateYearlyPnL(this.transactions())
  );

  yearlyDividends = computed(() =>
    this.financeService.calculateYearlyDividends(this.transactions())
  );
  
  availableYears = computed(() => {
    const year = new Set([
      ...Object.keys(this.yearlyStats()).map(Number),
      ...Object.keys(this.yearlyDividends()).map(Number),
    ]);
    return Array.from(year).sort((a, b) => a - b);
  });
  
  tickers = computed(() => {
    const list = [...new Set(this.transactions().map(t => t.ticker))].filter(t => t !== '');
    const criteria = this.sortCriteria();
    const pnl = this.yearlyStats();
    const divs = this.yearlyDividends();

    return list.sort((a, b) => {
      switch (criteria.column) {
        case 'TOTAL':
          return (this.getTickerTotal(b, pnl, divs)) - (this.getTickerTotal(a, pnl, divs));
        case 'YEAR':
          const valA = pnl[criteria.year!]?.[a] || 0;
          const valB = pnl[criteria.year!]?.[b] || 0;
          return valB - valA;
        default:
          return a.localeCompare(b);
      }
    });
  });

  private getTickerTotal(ticker: string, pnl: YearlyPerformance, divs: YearlyPerformance): number {
    const pnlTotal = Object.values(pnl).reduce((acc, year) => acc + (year[ticker] || 0), 0);
    const divTotal = Object.values(divs).reduce((acc, year) => acc + (year[ticker] || 0), 0);
    return pnlTotal + divTotal;
  }

  getTotalForTicker(ticker: string): number {
    return this.availableYears().reduce((acc, year) => acc + (this.yearlyStats()[year][ticker] || 0), 0);
  }

  getPnL(year: number, ticker: string): number {
    return this.yearlyStats()[year]?.[ticker] || 0;
  }

  getDividend(year: number, ticker: string): number {
    return this.yearlyDividends()[year]?.[ticker] || 0;
  }

  getYearlyTotal(year: number): number {
    const pnl = Object.values(this.yearlyStats()[year] || {}).reduce((a, b) => a + b, 0);
    const divs = Object.values(this.yearlyDividends()[year] || {}).reduce((a, b) => a + b, 0);
    return pnl + divs;
  }

  grandTotal = computed(() => {
    return this.availableYears().reduce((acc, year) => acc + this.getYearlyTotal(year), 0);
  });

  getTickerPnLTotal(ticker: string): number {
    return this.availableYears().reduce((acc, year) => acc + this.getPnL(year, ticker), 0);
  }

  getTickerDividendTotal(ticker: string): number {
    return this.availableYears().reduce((acc, year) => acc + this.getDividend(year, ticker), 0);
  }

  getYearlyPnLTotal(year: number): number {
    return Object.values(this.yearlyStats()[year] || {}).reduce((a, b) => a + b, 0);
  }

  getYearlyDividendTotal(year: number): number {
    return Object.values(this.yearlyDividends()[year] || {}).reduce((a, b) => a + b, 0);
  }

  grandTotalPnL = computed(() => 
    this.availableYears().reduce((acc, year) => acc + this.getYearlyPnLTotal(year), 0)
  );

  grandTotalDividends = computed(() => 
    this.availableYears().reduce((acc, year) => acc + this.getYearlyDividendTotal(year), 0)
  );

  toggleSortTicker() {
    this.sortCriteria.set({ column: 'NAME' });
  }

  toggleSortTickerTotal() {
    this.sortCriteria.set({ column: 'TOTAL' });
  }

  toggleSortTickerOfYear(year: number) {
    this.sortCriteria.set({ column: 'YEAR', year });
  }
}