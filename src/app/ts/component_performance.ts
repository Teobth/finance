import { Component, computed, inject, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FinanceService } from './service_finance';
import { ChartService } from './service_chart';

@Component({
  selector: 'app-component-performance',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: '../html/performance.html',
  styleUrl: '../scss/performance.scss',
})
export class Performance {
  private chartWrapper = viewChild<ElementRef>('chartWrapper');

  private financeService = inject(FinanceService);
  private chartService = inject(ChartService);

  globalYearlyStats = computed(() => this.financeService.calculateGlobalYearlyStats());

  private monthlyData = this.financeService.monthlyPnL;

  chartSeries = computed(() =>
    this.chartService.barSeries('Gain / Perte', this.monthlyData().map(d => d.value))
  );

  xaxis = computed(() =>
    this.chartService.monthlyXAxis(this.monthlyData().map(d => d.month))
  );

  colors = computed(() =>
    this.chartService.colorsByValue(this.monthlyData().map(d => d.value))
  );

  chart = computed(() => this.chartService.barChart({ 
    height: 500,
    width: Math.max(900, this.monthlyData().length * 50)
  }));
  plotOptions = this.chartService.barPlotOptions();
  yaxis = this.chartService.currencyYAxis();
  tooltip = computed(() => this.chartService.customTooltip(this.monthlyData()));
  dataLabels = this.chartService.defaultDataLabels;
  annotations = this.chartService.zeroLineAnnotation;
  legend = this.chartService.defaultLegend;
}