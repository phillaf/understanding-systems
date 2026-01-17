# Economic Model - State & Continuation Guide

> Last updated: 2026-01-16  
> For AI continuation of this project

## What This Is

A causal signal graph modeling economic relationships as a "circuit" with:
- **Signals**: Time series nodes (observed from real data, or computed)
- **Edges**: Weighted causal links with delays and transforms
- **Visual**: Force-directed SVG graph + time series charts
- **Goal**: Predict recession timing, compare model vs reality

## Architecture

```
model/
├── kernel/          # Core classes (~300 LOC total)
│   ├── signal.js    # Signal class with history, tags, groundTruth
│   ├── edge.js      # Edge class with weight, delay, transform, bias
│   ├── graph.js     # Graph holds signals/edges, runs simulation
│   └── model-fit.js # Compares predicted vs actual
├── definitions/
│   └── economic-model.yaml   # THE MODEL (29 signals, 41 edges)
├── adapters/
│   ├── loader.js             # Parses YAML → Graph
│   └── economic-model-adapter.js  # Loads real data into signals
├── data/
│   ├── README.md             # Documents data organization
│   └── cache/                # (Future) Consolidated time series
└── ui/
    ├── economic-model.html   # Main app (loads data, runs sim, renders)
    └── circuit-view.js       # SVG graph visualization
```

## Signal Categories

### Observed Signals (22) - Real Data Inputs
Model doesn't compute these; they're loaded from blog post data.

| Category | Signals |
|----------|---------|
| Interest Rates | fed_funds_rate, treasury_10y, mortgage_rate_30y |
| Labor | unemployment_rate* |
| GDP | gdp_real, cyclical_gdp, non_cyclical_gdp |
| GDP Components | durables_consumption, residential_investment, equipment_investment |
| Money/Inflation | m2_money_supply, cpi_inflation, velocity_m2 |
| Credit | lending_standards_ci, ci_loan_volume |
| Housing | new_home_sales, months_supply, housing_inventory, median_home_price |
| Ground Truth | recession_indicator* |

*Marked `model_output: true` - model computes prediction, compared against actual

### Computed Signals (9) - Model Calculates

| Signal | Inputs | Real Ground Truth Available | Status |
|--------|--------|------------------------------|--------|
| yield_curve_spread | treasury_10y, fed_funds | ❌ Need T10Y-T2Y from FRED | OK |
| gdp_growth | gdp_real (derivative) | ✅ BEA via gdp_growth.js | ✅ FIXED |
| cyclical_gdp_growth | cyclical_gdp (derivative) | ❌ Not directly measured | ✅ FIXED |
| m2_growth | m2_money_supply (derivative) | ✅ FRED m2_yoy field | ✅ FIXED |
| inflation_rate | cpi (derivative) | ✅ FRED cpi_yoy field | ✅ FIXED |
| financial_stress | fed_rate, lending_standards | ❌ Abstract composite | Needs calibration |
| housing_demand | mortgage_rate | ❌ Abstract composite | OK |
| leading_economy_index | yield_curve, lending, housing | ❌ Abstract composite | Needs calibration |
| cyclical_economy_index | cyclical_gdp, leading | ❌ Abstract composite | Needs calibration |

## Real Data Sources (from blog posts)

| Data | Source | File |
|------|--------|------|
| GDP Growth | BEA via FRED | `posts/2025-12-15-recession-unemployment/data/transformed/gdp_growth.js` |
| M2 YoY | FRED M2SL | `posts/2026-01-03-money-supply-inflation/data/money_supply_data.js` (m2_yoy field) |
| CPI YoY | FRED CPIAUCSL | `posts/2026-01-03-money-supply-inflation/data/money_supply_data.js` (cpi_yoy field) |
| Unemployment | BLS via FRED | `posts/2025-12-15-recession-unemployment/data/raw/unemployment.js` |
| Recession Dates | NBER via FRED | `posts/2025-12-15-recession-unemployment/data/raw/recession_indicator.js` |

**Important:** Only use ground truth comparisons when we have actual authoritative data. 
Do NOT generate synthetic "ground truth" - that defeats the purpose.

## Priority Fixes

### 1. ✅ FIXED: Derivative Transform
Changed from `(v[t] - v[t-1])` to Year-over-Year percent change:
```
YoY % = (value[t] - value[t-12]) / |value[t-12]| * 100
```
Updated edges to use `weight: 1.0` so they pass through actual percentages.

### 2. ✅ Weight Calibration Done

Based on actual data ranges from FRED:

| Input Signal | Data Range | Weight | Contribution to Recession |
|--------------|------------|--------|---------------------------|
| yield_curve_spread | -8 to +4 | -0.15, bias 0.15 | 0 to 1.35 (inverted=high) |
| lending_standards_ci | -32 to 84 | 0.008, bias -0.05 | -0.3 to 0.6 (tight=high) |
| financial_stress | 0 to ~1 | 0.8 | 0 to 0.8 |
| cyclical_economy_index | 0 to 1 | -0.5, bias 0.5 | 0 to 1 (low activity=high) |
| cyclical_gdp_growth | -8% to +8% | -0.08, bias 0.1 | -0.5 to 0.7 (negative=high) |

### 3. Abstract Composite Signals
`leading_economy_index` and `cyclical_economy_index` are not directly measurable. Options:
- Remove them and link components directly to recession
- Or keep as organizational groupings but don't use for prediction

## What's Working ✅

1. **Graph visualization** - Force-directed layout, pan/zoom
2. **Edge editing** - Click edge → adjust weight/delay → re-simulate
3. **Recession indicator** - Model vs actual overlay working
4. **Unemployment rate** - Model vs actual overlay working
5. **Signal tags** - Links to blog posts displayed
6. **Time series charts** - Sparklines for each signal

## Data Organization

**COMPLETED:** Data is now centralized in `model/data/cache/` with consistent JSON format.

```
model/data/
├── README.md             # Documents sources
├── build-cache.mjs       # Script to rebuild from blog posts
└── cache/
    ├── labor_market.json     # unemployment_rate, recession_indicator
    ├── interest_rates.json   # fed_funds, treasury_10y, mortgage_30y
    ├── gdp_components.json   # gdp_real, gdp_growth, cyclical components
    ├── money_inflation.json  # m2, cpi, velocity, growth rates
    ├── credit_lending.json   # lending_standards, loan_volume
    └── housing.json          # sales, supply, inventory, prices
```

### Cache File Format
```json
{
  "metadata": {
    "updated": "2026-01-16",
    "frequency": "monthly",
    "sources": {
      "signal_name": "FRED series ID or description"
    }
  },
  "series": {
    "signal_name": [
      { "date": "2000-01-01", "value": 5.4 },
      ...
    ]
  }
}
```

### Rebuilding Cache
```bash
cd /home/phil/Projects/blog
node model/data/build-cache.mjs
```

## How to Run

```bash
cd /home/phil/Projects/blog
python3 -m http.server 8765
# Open http://localhost:8765/model/ui/economic-model.html
```

## Next Steps (In Priority Order)

1. ~~**Load real data**~~ ✅ Done - using cache files from FRED/BEA/BLS
2. ~~**Calibrate recession inputs**~~ ✅ Done - weights normalized to data ranges
3. ~~**Fix graph computation**~~ ✅ Done - observed data preserved, forward-fill for sparse data
4. ~~**Simplify abstract composites**~~ ✅ Done - removed problematic edges
5. **Tune recession prediction** - Compare against NBER recession dates
6. **Regression** - Only after manual tuning produces plausible outputs

## Key Relationships From Blog Posts

| Source Post | Key Finding | Edge in Model |
|-------------|-------------|---------------|
| 2025-12-30 Bond Markets | Yield curve inversion → recession 6-16mo | yield_curve_spread → recession (12mo) |
| 2025-12-31 Credit Spreads | Spread widening → recession 4-6mo | lending_standards → recession (4mo) |
| 2025-12-15 Recession/Unemployment | GDP → Unemployment ~7 quarters | gdp_growth → unemployment (7mo) |
| 2026-01-03 Money Supply | M2 → Inflation 12-18mo | m2_growth → inflation (18mo) |
| 2026-01-01 Business Cycle | Leading → Cyclical 8mo | leading_index → cyclical_index (8mo) |

## manual control of the nodes

works in the browser console

exportNodePositions() - Downloads JSON and logs to console
importNodePositions({...}) - Load positions from a JSON object
resetNodeLayout() - Reset all positions to force-directed layout