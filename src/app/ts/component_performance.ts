import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService } from './service_finance';

@Component({
  selector: 'app-component-performance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: '../html/performance.html',
  styleUrl: '../scss/performance.scss',
})
export class Performance {
  private financeService = inject(FinanceService);

  globalYearlyStats = computed(() => this.financeService.calculateGlobalYearlyStats());
}