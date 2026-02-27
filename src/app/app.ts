import { Component, inject } from '@angular/core';
import { RouterLinkActive, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FinanceService } from './services/finance';
import { ExcelParserService } from './services/excel-parser';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  imports: [CommonModule, RouterModule, RouterLinkActive],
})
export class AppComponent {

  financeService = inject(FinanceService);
  excelService = inject(ExcelParserService);
  
  constructor() {
    this.excelService.loadTransactions();
  }
}