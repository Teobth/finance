import { Injectable } from '@angular/core';
import {
  ApexChart, ApexPlotOptions, ApexYAxis,
  ApexDataLabels, ApexTooltip, ApexAnnotations,
  ApexXAxis, ApexAxisChartSeries, ApexLegend
} from 'ng-apexcharts';

@Injectable({ providedIn: 'root' })
export class ChartService {

  readonly defaultTooltip: ApexTooltip = {
    shared: true,
    intersect: false,
    marker: { show: false },
    y: { formatter: (val) => `${val.toFixed(2)}€` }
  };

  readonly defaultDataLabels: ApexDataLabels = { enabled: false };

  readonly defaultLegend: ApexLegend = { show: false };

  readonly zeroLineAnnotation: ApexAnnotations = {
    yaxis: [{ y: 0, borderColor: '#999', borderWidth: 1, strokeDashArray: 4 }]
  };

  barChart(options: { height?: number; width?: number } = {}): ApexChart {
    return {
        type: 'bar',               // 👈 On repasse en mode bar complet
        height: options.height ?? 350,
        width: options.width,
        stacked: true,             // 🔥 FORCE L'EMPILAGE DU RÉALISÉ ET DU LATENT
        toolbar: { show: false },
        zoom: { enabled: false },
    };
  }

  barPlotOptions(options: { columnWidth?: string; minBarHeight?: number } = {}): ApexPlotOptions {
    return {
      bar: {
        distributed: true,
        columnWidth: options.columnWidth ?? '70%',
        borderRadius: 3,
      }
    };
  }

  currencyYAxis(options: { decimals?: number } = {}): ApexYAxis {
    return {
      labels: {
        formatter: (val) => `${val.toFixed(options.decimals ?? 0)}€`
      }
    };
  }

  monthlyXAxis(categories: string[]): ApexXAxis {
    return {
      categories,
      labels: { rotate: -45, style: { fontSize: '11px' } }
    };
  }

  colorsByValue(values: number[], positive = '#2e7d32', negative = '#d32f2f'): string[] {
    return values.map(v => v >= 0 ? positive : negative);
  }

  barSeries(name: string, values: number[]): ApexAxisChartSeries {
    return [{ name, data: values }];
  }

  mixedSeries(
    barName: string, barValues: number[], 
    lineName: string, lineValues: number[]
  ): ApexAxisChartSeries {
    return [
      {
        name: barName,
        type: 'column', // Ceci force cette série à s'afficher en barres
        data: barValues
      },
      {
        name: lineName,
        type: 'line', // Ceci s'affiche en courbe
        data: lineValues
      }
    ];
  }

  dualCurrencyYAxis(): ApexYAxis[] {
    return [
      {
        seriesName: 'Gain / Perte',
        labels: { formatter: (val) => `${val.toFixed(0)}€` }
      },
      {
        opposite: true, // Place cet axe à droite
        seriesName: 'Valorisation',
        labels: { formatter: (val) => `${val.toFixed(0)}€` }
      }
    ];
  }

  customTooltip(
    monthlyData: { month: string; value: number; latentPnL: number; details: { ticker: string; value: number }[] }[],
    showLatent: boolean = true
  ): ApexTooltip {
    return {
      shared: true,
      intersect: false,
      custom: ({ dataPointIndex }) => {
        const data = monthlyData[dataPointIndex];
        if (!data) return '';

        // 1. Extraction de l'année et du mois survolé (ex: "2026-06" -> year: 2026, month: 6)
        const [currentYearStr, currentMonthStr] = data.month.split('-');
        const currentYear = parseInt(currentYearStr, 10);
        const currentMonth = parseInt(currentMonthStr, 10);

        // 2. Calcul du cumul réalisé depuis le début de l'année en cours (YTD)
        // On additionne les "value" (Réalisé) de janvier (01) jusqu'au mois sélectionné inclus
        const realizedYTD = monthlyData.reduce((acc, d) => {
          const [dYear, dMonth] = d.month.split('-').map(Number);
          if (dYear === currentYear && dMonth <= currentMonth) {
            return acc + d.value;
          }
          return acc;
        }, 0);

        // 3. Calcul du total net affiché en bas de bulle
        const displayedTotal = showLatent ? (data.value + data.latentPnL) : data.value;
        const totalPositive = displayedTotal >= 0;
        const totalColor = totalPositive ? '#2e7d32' : '#d32f2f';
        const totalBg = totalPositive ? '#f1f8f1' : '#fdf3f3';
        const totalSign = totalPositive ? '+' : '';

        // Liste des lignes de transactions effectives du mois (Réalisé)
        let rows = data.details.length > 0
          ? data.details.map(d => {
              const pos = d.value >= 0;
              const bg = pos ? 'rgba(46,125,50,0.06)' : 'rgba(211,47,47,0.06)';
              const color = pos ? '#2e7d32' : '#d32f2f';
              const sign = pos ? '+' : '';
              const icon = pos ? '▲' : '▼';
              const barWidth = data.value !== 0 ? Math.min(100, Math.abs(d.value / data.value) * 100) : 0;

              return `
              <div style="padding: 6px 12px; border-bottom: 1px solid #f0f0f0; background: ${bg};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 3px;">
                  <span style="color:#444; font-weight:600; font-size:0.9em;">${d.ticker}</span>
                  <span style="color:${color}; font-weight:700;">
                    ${icon} ${sign}${d.value.toFixed(2)}€
                  </span>
                </div>
                <div style="height:3px; background:#eee; border-radius:2px;">
                  <div style="width:${barWidth}%; height:100%; background:${color}; border-radius:2px;"></div>
                </div>
              </div>`;
            }).join('')
          : `<div style="padding: 10px 12px; color:#999; font-style:italic; text-align:center;">Aucun mouvement ce mois</div>`;

        // 4. Bloc Latent avec intégration du cumul Réalisé de l'année
        if (showLatent) {
          // Nouveau calcul du latent appliqué : Latent du mois + Déjà Réalisé depuis janvier
          const latentApplique = data.latentPnL + realizedYTD;
          
          const latentPositive = latentApplique >= 0;
          const latentBg = latentPositive ? 'rgba(59,130,246,0.06)' : 'rgba(239,68,68,0.06)';
          const latentColor = latentPositive ? '#3B82F6' : '#EF4444';
          const latentSign = latentPositive ? '+' : '';
          const latentIcon = latentPositive ? '▲' : '▼';

          rows += `
            <div style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; background: ${latentBg}; border-top: 1px dashed #cbd5e1;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2px;">
                <span style="color:#1e293b; font-weight:700; font-size:0.9em; text-transform: uppercase; letter-spacing: 0.02em;">✨ Plus-value Latente</span>
                <span style="color:${latentColor}; font-weight:800;">
                  ${latentIcon} ${latentSign}${latentApplique.toFixed(2)}€
                </span>
              </div>
              <div style="font-size: 0.75em; color: #64748b; text-align: right;">
                (Dont ${realizedYTD >= 0 ? '+' : ''}${realizedYTD.toFixed(2)}€ réalisés YTD)
              </div>
            </div>`;
        }

        return `
          <div style="background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); min-width: 250px; overflow: hidden; font-family: inherit;">
            <div style="padding: 10px 14px; background: #1976d2; color: white; font-weight: 700; font-size: 0.95em; letter-spacing: 0.05em;">
              ${data.month}
            </div>

            <div>
              ${rows}
            </div>

            <div style="padding: 10px 14px; background: ${totalBg}; border-top: 2px solid ${totalColor}; display: flex; justify-content: space-between; align-items: center;">
              <span style="color:#555; font-weight:600; font-size:0.85em; text-transform:uppercase; letter-spacing:0.05em;">
                ${showLatent ? 'Total Net' : 'Total Réalisé'}
              </span>
              <span style="color:${totalColor}; font-weight:800; font-size:1.1em;">
                ${totalSign}${displayedTotal.toFixed(2)}€
              </span>
            </div>
          </div>`;
      }
    };
  }
}