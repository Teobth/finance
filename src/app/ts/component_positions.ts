import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService } from './service_finance';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-positions',
  standalone: true,
  imports: [CommonModule, RouterLink, TableModule, TagModule],
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
        const totalInvesti = stats.quantiteActuelle * stats.pru;
        return { ticker, ...stats, totalInvesti };
      })
      .filter(p => p.quantiteActuelle > 0)
      .sort((a, b) => (b.quantiteActuelle * b.pru) - (a.quantiteActuelle * a.pru));
  });

  totalInvesti = computed(() =>
    this.positions().reduce((acc, p) => acc + (p.quantiteActuelle * p.pru), 0)
  );
}