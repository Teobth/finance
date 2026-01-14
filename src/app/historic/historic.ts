import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService, YearlyPerformance } from '../services/finance';
import { Transaction } from '../models/transaction';
import { ExcelParserService } from '../services/excel-parser';

@Component({
  selector: 'app-historic',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historic.html',
  styleUrl: './historic.scss',
})
export class Historic implements OnInit {
  @Input() transactions: Transaction[] = [];
  
  yearlyStats: YearlyPerformance = {};
  availableYears: number[] = [];
  tickers: string[] = [];

  constructor(
    private financeService: FinanceService,
    private excelService: ExcelParserService
  ) {}

  ngOnInit() {
    this.transactions = this.excelService.transactions;
    this.generateGlobalSummary();
  }

  generateGlobalSummary() {
    this.yearlyStats = this.financeService.calculateYearlyPnL(this.transactions);
    this.availableYears = Object.keys(this.yearlyStats)
      .map(Number)
      .sort((a, b) => b - a);
    
    const allTickers = this.transactions.map(t => t.ticker);
    this.tickers = [...new Set(allTickers)];
  }

  getTotalForTicker(ticker: string): number {
    return this.availableYears.reduce((acc, year) => acc + (this.yearlyStats[year][ticker] || 0), 0);
  }

  getTotalForYear(year: number): number {
    return this.tickers.reduce((acc, ticker) => acc + (this.yearlyStats[year][ticker] || 0), 0);
  }
}