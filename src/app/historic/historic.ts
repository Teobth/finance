import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService, YearlyPerformance } from '../services/finance';
import { Transaction } from '../models/transaction';
import { ExcelParserService } from '../services/excel-parser';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-historic',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './historic.html',
  styleUrl: './historic.scss',
})
export class Historic implements OnInit {
  @Input() transactions: Transaction[] = [];
  
  yearlyStats: YearlyPerformance = {};
  yearlyDividends: YearlyPerformance = {};

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
    this.yearlyDividends = this.financeService.calculateYearlyDividends(this.transactions);

    const years = new Set([
      ...Object.keys(this.yearlyStats).map(Number),
      ...Object.keys(this.yearlyDividends).map(Number)
    ]);
    this.availableYears = Array.from(years).sort((a, b) => b - a);
    
    const allTickers = this.transactions.map(t => t.ticker);
    this.tickers = [...new Set(allTickers)].filter(t => t !== '').sort();
  }

  getTotalForTicker(ticker: string): number {
    return this.availableYears.reduce((acc, year) => acc + (this.yearlyStats[year][ticker] || 0), 0);
  }

  getTotalForYear(year: number): number {
    return this.tickers.reduce((acc, ticker) => {
      return acc + (this.yearlyStats[year][ticker] || 0);
    }, 0);
  }

  getDividend(year: number, ticker: string): number {
    return this.yearlyDividends[year]?.[ticker] || 0;
  }

  getYearlyDividendTotal(year: number): number {
    const yearData = this.yearlyDividends[year] || {};
    return Object.values(yearData).reduce((sum, val) => sum + val, 0);
  }

  getTickerDividendTotal(ticker: string): number {
    return this.availableYears.reduce((acc, year) => acc + this.getDividend(year, ticker), 0);
  }

  getGrandTotalDividend(): number {
    return this.availableYears.reduce((acc, year) => acc + this.getYearlyDividendTotal(year), 0);
  }

  getGrandTotal(): number {
    return this.availableYears.reduce((acc, year) => acc + this.getTotalForYear(year), 0);
  }
}