import { Component, computed, Input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Transaction } from './models/transaction';
import { FinanceService } from './services/finance';
import { ExcelParserService } from './services/excel-parser';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  imports: [CommonModule, RouterModule],
})
export class AppComponent {

  constructor(
    private financeService: FinanceService,
    public excelService: ExcelParserService // Public pour accéder au signal dans le HTML si besoin
  ) {
    this.excelService.loadTransactions();
  }

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

  grandTotal = computed(() => {
    return this.availableYears().reduce((acc, year) => {
      const yearData = this.yearlyStats()[year] || {};
      return acc + Object.values(yearData).reduce((sum, val) => sum + val, 0);
    }, 0);
  });

  grandTotalDividends = computed(() => {
    return this.availableYears().reduce((acc, year) => {
      const yearData = this.yearlyDividends()[year] || {};
      return acc + Object.values(yearData).reduce((sum, val) => sum + val, 0);
    }, 0);
  });

  getDividend(year: number, ticker: string): number {
    return this.yearlyDividends()[year]?.[ticker] || 0;
  }
}