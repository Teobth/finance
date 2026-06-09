import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ExcelParserService } from './service_CSV-parser';
import { FinanceService } from './service_finance';

@Component({
  selector: 'app-analyse',
  templateUrl: '../html/analyse.html',
  styleUrl: '../scss/analyse.scss',
  imports: [
    CommonModule, 
    MatSelectModule, 
    MatFormFieldModule, 
    RouterModule
  ],
})

export class Analyse {
  selectedTicker = signal<string | null>(null);

  private excelService = inject(ExcelParserService);
  private financeService = inject(FinanceService);

  // Liste des tickers unique calculée automatiquement
  tickers = computed(() => {
    const all = this.excelService.transactions().map(t => t.ticker);
    return [...new Set(all)].sort();
  });

  // Stats calculées automatiquement quand le ticker OU les données changent
  selectedStats = computed(() => {
    const ticker = this.selectedTicker();
    const all = this.excelService.transactions();
    
    if (!ticker) return undefined;
    
    const tickerTransactions = all.filter(t => t.ticker === ticker);
    return this.financeService.calculateStats(tickerTransactions);
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    // On écoute l'URL et on met à jour le signal selectedTicker
    this.route.paramMap.subscribe(params => {
      this.selectedTicker.set(params.get('ticker'));
    });
    
    // On s'assure que les données sont chargées
    this.excelService.loadTransactions();
  }

  yearlyInvestMax = computed(() =>
    this.financeService.calculateInvestMax(this.excelService.transactions())
  );

  investHistoryForSelectedTicker = computed(() => {
    const ticker = this.selectedTicker();
    const allInvestData = this.yearlyInvestMax();

    if (!ticker || !allInvestData) return [];

    return Object.keys(allInvestData)
      .map(year => ({
        year: +year,
        amount: allInvestData[+year][ticker] || 0,
        pnl: this.financeService.getPnL(+year, ticker) + this.financeService.getDividend(+year, ticker),
        performance: allInvestData[+year][ticker] 
          ? ((this.financeService.getPnL(+year, ticker) + this.financeService.getDividend(+year, ticker)) / allInvestData[+year][ticker]) * 100 
          : 0
      }))
      .filter(data => data.amount > 0);
  });

  globalYearlyStats = computed(() =>
    this.financeService.calculateGlobalYearlyStats()
  );

  filteredTransactions = computed(() => {
    const ticker = this.selectedTicker();
    const all = this.excelService.transactions();
    return all.filter(t => t.ticker === ticker);
  });

  onTickerChange(ticker: string) {
    this.router.navigate(['/analyse', ticker]);
  }

  readonly typeColors: Record<string, string> = {
    'ACHAT': '#2e7d32',
    'VENTE': '#d32f2f',
    'DIVIDENDE': '#1976d2',
    'PAI.ITTCPN': '#1976d2',
    'LIQUIDATION': '#1976d2',
    'TAXE': '#757575'
  };
}