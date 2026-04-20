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
        type: 'bar',
        height: options.height ?? 350,
        width: options.width,
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

  customTooltip(monthlyData: { month: string; value: number; details: { ticker: string; value: number }[] }[]): ApexTooltip {
    return {
        shared: true,
        intersect: false,
        custom: ({ dataPointIndex }) => {
        const data = monthlyData[dataPointIndex];
        if (!data) return '';

        const totalPositive = data.value >= 0;
        const totalColor = totalPositive ? '#2e7d32' : '#d32f2f';
        const totalBg = totalPositive ? '#f1f8f1' : '#fdf3f3';
        const totalSign = totalPositive ? '+' : '';

        const rows = data.details.length > 0
            ? data.details.map(d => {
                const pos = d.value >= 0;
                const bg = pos ? 'rgba(46,125,50,0.06)' : 'rgba(211,47,47,0.06)';
                const color = pos ? '#2e7d32' : '#d32f2f';
                const sign = pos ? '+' : '';
                const icon = pos ? '▲' : '▼';
                const barWidth = data.value !== 0
                ? Math.min(100, Math.abs(d.value / data.value) * 100)
                : 0;
                const barColor = pos ? '#2e7d32' : '#d32f2f';

                return `
                <div style="
                    padding: 6px 12px;
                    border-bottom: 1px solid #f0f0f0;
                    background: ${bg};
                ">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 3px;">
                    <span style="color:#444; font-weight:600; font-size:0.9em;">${d.ticker}</span>
                    <span style="color:${color}; font-weight:700;">
                        ${icon} ${sign}${d.value.toFixed(2)}€
                    </span>
                    </div>
                    <div style="height:3px; background:#eee; border-radius:2px;">
                    <div style="width:${barWidth}%; height:100%; background:${barColor}; border-radius:2px; transition: width 0.3s;"></div>
                    </div>
                </div>`;
            }).join('')
            : `<div style="padding: 10px 12px; color:#999; font-style:italic; text-align:center;">
                Aucun mouvement ce mois
            </div>`;

        return `
            <div style="
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            min-width: 240px;
            overflow: hidden;
            font-family: inherit;
            ">
            <div style="
                padding: 10px 14px;
                background: #1976d2;
                color: white;
                font-weight: 700;
                font-size: 0.95em;
                letter-spacing: 0.05em;
            ">
                ${data.month}
            </div>

            <div>
                ${rows}
            </div>

            <div style="
                padding: 10px 14px;
                background: ${totalBg};
                border-top: 2px solid ${totalColor};
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <span style="color:#555; font-weight:600; font-size:0.85em; text-transform:uppercase; letter-spacing:0.05em;">
                Total
                </span>
                <span style="color:${totalColor}; font-weight:800; font-size:1.1em;">
                ${totalSign}${data.value.toFixed(2)}€
                </span>
            </div>
            </div>`;
        }
    };
    }
}