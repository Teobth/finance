import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService } from './service_finance';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-positions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: '../html/positions.html',
  styleUrl: '../scss/positions.scss',
})
export class Positions {
  private financeService = inject(FinanceService);

  positions = computed(() => {
    const transactions = this.financeService.transactions();
    const tickers = [...new Set(transactions.map(t => t.ticker))].filter(t => t !== '');

    return tickers
      .map(ticker => {
        const tickerTransactions = transactions.filter(t => t.ticker === ticker);
        const stats = this.financeService.calculateStats(tickerTransactions);
        return { ticker, ...stats };
      })
      .filter(p => p.quantiteActuelle > 0)
      .sort((a, b) => (b.quantiteActuelle * b.pru) - (a.quantiteActuelle * a.pru));
  });

  totalInvesti = computed(() =>
    this.positions().reduce((acc, p) => acc + (p.quantiteActuelle * p.pru), 0)
  );
}