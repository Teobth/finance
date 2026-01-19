import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService, YearlyPerformance } from '../services/finance';
import { ExcelParserService } from '../services/excel-parser';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-historic',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './historic.html',
  styleUrl: './historic.scss',
})
export class Historic {

  private excelService = inject(ExcelParserService);
  private financeService = inject(FinanceService);

  transactions = this.excelService.transactions;

  yearlyStats = computed(() =>
    this.financeService.calculateYearlyPnL(this.excelService.transactions())
  );

  yearlyDividends = computed(() =>
    this.financeService.calculateYearlyDividends(this.excelService.transactions())
  );
  
  availableYears = computed(() => {
    const year = new Set([
      ...Object.keys(this.yearlyStats()).map(Number),
      ...Object.keys(this.yearlyDividends()).map(Number),
    ]);
    return Array.from(year).sort((a, b) => a - b);
  });
  
  tickers = computed(() => {
    const allTickers = this.excelService.transactions().map(t => t.ticker);
    return [...new Set(allTickers)].filter(t => t !== '').sort();
  });


  getTotalForTicker(ticker: string): number {
    return this.availableYears().reduce((acc, year) => acc + (this.yearlyStats()[year][ticker] || 0), 0);
  }

  getTotalForYear(year: number): number {
    return this.tickers().reduce((acc, ticker) => {
      return acc + (this.yearlyStats()[year][ticker] || 0);
    }, 0);
  }

  getDividend(year: number, ticker: string): number {
    return this.yearlyDividends()[year]?.[ticker] || 0;
  }

  getYearlyDividendTotal(year: number): number {
    const yearData = this.yearlyDividends()[year] || {};
    return Object.values(yearData).reduce((sum, val) => sum + val, 0);
  }

  getTickerDividendTotal(ticker: string): number {
    return this.availableYears().reduce((acc, year) => acc + this.getDividend(year, ticker), 0);
  }

  getGrandTotalDividend(): number {
    return this.availableYears().reduce((acc, year) => acc + this.getYearlyDividendTotal(year), 0);
  }

  getGrandTotal(): number {
    return this.availableYears().reduce((acc, year) => acc + this.getTotalForYear(year), 0);
  }
}