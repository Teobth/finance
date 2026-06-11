# 📈 Stock Tracker

Une application web moderne construite avec **Angular** permettant de suivre, d'analyser et de visualiser l'évolution d'un portefeuille boursier de manière simple et automatisée.

🔗 **Démo en ligne (Netlify) :** [Visiter l'application](https://leafy-twilight-cfa1b9.netlify.app)

---

## ✨ Fonctionnalités

- 📊 **Suivi des Positions Actuelles** : Calcul automatique du Prix de Revient Unitaire (PRU), des montants investis et de l'allocation globale de vos actifs.
- 📉 **Graphiques de Performance Évolués** : Visualisation interactive (via ApexCharts) comparant mois par mois les plus-values **réalisées** et les plus-values **latentes**.
- 🗓️ **Historique Annuel Analytique** : Suivi précis des gains, pertes et dividendes perçus année par année et par actif (tickers).
- ⚙️ **Analyse Approfondie par Ticker** : Métriques détaillées sur le montant maximum investi, le rendement global et l'historique d'achat/vente d'une action ou d'un ETF particulier.

---

## 🛠️ Technologies utilisées

- **Framework :** Angular (v17/v18) utilisant la nouvelle architecture de build (`@angular/build:application`) et les signaux pour une réactivité optimale.
- **Graphiques :** Ng-Apexcharts (Graphiques empilés et tooltips sur mesure).
- **Style :** SCSS & Intégration de composants d'interface.

---

## 💻 Installation et Lancement Local

### 1. Prérequis
Assurez-vous d'avoir installé [Node.js](https://nodejs.org/) et l'Angular CLI globalement (`npm install -g @angular/cli`).

### 2. Cloner le projet et installer les dépendances
```bash
git clone [https://github.com/Teobth/stock-tracker.git](https://github.com/Teobth/stock-tracker.git)
cd stock-tracker
npm install
