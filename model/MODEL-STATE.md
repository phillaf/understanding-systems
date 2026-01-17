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

| Signal | Inputs | Ground Truth Available | Status |
|--------|--------|------------------------|--------|
| yield_curve_spread | treasury_10y, fed_funds | ✅ Synthetic proxy | OK |
| gdp_growth | gdp_real (derivative) | ✅ Synthetic | BROKEN - derivative not working |
| cyclical_gdp_growth | cyclical_gdp (derivative) | ❌ | BROKEN - derivative not working |
| m2_growth | m2_money_supply (derivative) | ✅ Synthetic | BROKEN - derivative not working |
| inflation_rate | m2_growth, velocity, cpi (derivative) | ✅ Synthetic | BROKEN - depends on m2_growth |
| financial_stress | fed_rate, lending_standards | ❌ Abstract | OK but needs calibration |
| housing_demand | mortgage_rate | ❌ Abstract | OK |
| leading_economy_index | yield_curve, lending, housing | ❌ Abstract | Needs calibration |
| cyclical_economy_index | cyclical_gdp, leading | ❌ Abstract | Needs calibration |

## Priority Fixes

### 1. ⚠️ Derivative Transform Not Working
The `transform: derivative` edges produce flat/wrong values.

**Affected:**
- gdp_real → gdp_growth
- cyclical_gdp → cyclical_gdp_growth
- m2_money_supply → m2_growth
- cpi_inflation → inflation_rate

**Root cause:** The derivative transform in edge.js needs consecutive time values. Current implementation may not be handling the time series correctly.

**Fix options:**
1. Fix derivative in edge.js to compute `(v[t] - v[t-12]) / v[t-12] * 100` for YoY %
2. Pre-compute growth rates in data adapter
3. Add observed growth rate signals from existing transformed data

### 2. Weight Calibration Needed

| Edge | Current | Issue |
|------|---------|-------|
| lending_standards → recession | 0.01 | Too small, CI standards range 0-100 |
| financial_stress → recession | 1.5 | Dominates, need to scale |
| gdp_growth → unemployment | -0.4 | Okun's law should be ~-2 |
| cyclical_economy → recession | -0.8 | Sign correct, magnitude uncertain |

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

Current: Data scattered in `posts/*/data/` folders, loaded inline via fetch

Proposed: Centralized in `model/data/cache/` with consistent JSON format

```
model/data/
├── README.md           # Documents sources
└── cache/
    ├── interest_rates.json
    ├── labor_market.json
    ├── gdp_components.json
    ├── money_inflation.json
    ├── credit_lending.json
    └── housing.json
```

## How to Run

```bash
cd /home/phil/Projects/blog
python3 -m http.server 8765
# Open http://localhost:8765/model/ui/economic-model.html
```

## Next Steps (In Priority Order)

1. **Fix derivative transform** - Without this, growth rate signals are broken
2. **Calibrate recession inputs** - Get yield_curve, lending_standards, financial_stress weights reasonable
3. **Test with real data** - Replace synthetic data with actual blog post data
4. **Consider simplifying** - Remove abstract composites if they add noise
5. **Regression** - Only after manual tuning produces plausible outputs

## Key Relationships From Blog Posts

| Source Post | Key Finding | Edge in Model |
|-------------|-------------|---------------|
| 2025-12-30 Bond Markets | Yield curve inversion → recession 6-16mo | yield_curve_spread → recession (12mo) |
| 2025-12-31 Credit Spreads | Spread widening → recession 4-6mo | lending_standards → recession (4mo) |
| 2025-12-15 Recession/Unemployment | GDP → Unemployment ~7 quarters | gdp_growth → unemployment (7mo) |
| 2026-01-03 Money Supply | M2 → Inflation 12-18mo | m2_growth → inflation (18mo) |
| 2026-01-01 Business Cycle | Leading → Cyclical 8mo | leading_index → cyclical_index (8mo) |
