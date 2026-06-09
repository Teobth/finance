import { Component, computed, inject, ElementRef, viewChild, signal } from '@angular/core'; // 👈 Ajout de signal
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

  // ✅ NOUVEAU : Signal pour piloter l'affichage (true = tout afficher, false = réalisé uniquement)
  showLatent = signal<boolean>(true);

  // Séries de données calculées dynamiquement
  chartSeries = computed(() => {
    const series = [
      {
        name: 'Gain / Perte Réalisé',
        type: 'bar',
        data: this.monthlyData().map(d => d.value)
      }
    ];

    // On ajoute la série latente uniquement si le bouton est activé
    if (this.showLatent()) {
      series.push({
        name: 'Plus / Moins-value Latente',
        type: 'bar',
        data: this.monthlyData().map(d => d.latentPnL)
      });
    }

    return series;
  });

  xaxis = computed(() =>
    this.chartService.monthlyXAxis(this.monthlyData().map(d => d.month))
  );

  yaxis = this.chartService.currencyYAxis();

  chart = computed(() => this.chartService.barChart({ 
    height: 500,
    width: Math.max(900, this.monthlyData().length * 50)
  }));
  
  plotOptions = this.chartService.barPlotOptions();
  tooltip = computed(() => 
    this.chartService.customTooltip(this.monthlyData(), this.showLatent())
  );

  // ✅ MODIFICATION : Les couleurs s'adaptent au nombre de séries affichées
  colors = computed(() => 
    this.showLatent() ? ['#10B981', '#3B82F6'] : ['#10B981']
  );

  dataLabels = this.chartService.defaultDataLabels;
  legend = this.chartService.defaultLegend;

  // ✅ NOUVEAU : Méthode pour inverser l'état au clic du bouton
  toggleLatent() {
    this.showLatent.update(value => !value);
  }
}