# 📈 Stock Tracker

Application web construite avec **Angular** pour suivre, analyser et visualiser
l'évolution d'un portefeuille boursier de manière simple et automatisée.

🔗 **Démo en ligne :** [leafy-twilight-cfa1b9.netlify.app](https://leafy-twilight-cfa1b9.netlify.app)

---

## ✨ Fonctionnalités

- 📊 **Suivi des positions** : calcul automatique du Prix de Revient Unitaire (PRU),
  des montants investis et de l'allocation globale du portefeuille.
- 📉 **Graphiques de performance** : visualisation interactive (ApexCharts) comparant
  mois par mois les plus-values réalisées et latentes.
- 🗓️ **Historique annuel** : suivi des gains, pertes et dividendes par année et par ticker.
- 🔍 **Analyse par ticker** : rendement global, montant maximum investi,
  historique complet des achats/ventes.

---

## 🛠️ Stack technique

| Composant | Technologie |
|-----------|------------|
| Framework | Angular 21 |
| Graphiques | ng-apexcharts (ApexCharts) |
| Style | SCSS |
| Déploiement | Netlify |

---

## 💻 Lancer en local

### Prérequis

- Node.js ≥ 20
- Angular CLI : `npm install -g @angular/cli`

### Installation

```bash
git clone https://github.com/Teobth/finance.git
cd finance
npm install
```

### Démarrage

```bash
ng serve
```

L'application est accessible sur `http://localhost:4200/`.

### Build de production

```bash
ng build
```

---

## À propos

Projet personnel développé et maintenu en autonomie, déployé en production sur Netlify.
