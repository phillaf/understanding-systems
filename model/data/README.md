# Model Data Sources

This folder contains consolidated time series data for the economic model.

## Data Flow

```
Blog Posts (raw data)        Model
  posts/*/data/   ──────►   model/data/cache/
       │                          │
       │                          ▼
       │                    economic-model-adapter.js
       │                          │
       │                          ▼
       └──────────────────►  Graph signals
```

## Source Mapping

| Cache File | Blog Post Sources | Signals |
|------------|-------------------|---------|
| interest_rates.json | 2026-01-06-mortgage-rates | fed_funds_rate, treasury_10y, mortgage_rate_30y |
| labor_market.json | 2025-12-15-recession-unemployment | unemployment_rate, recession_indicator |
| gdp_components.json | 2026-01-02-cyclical-gdp-test | gdp_real, cyclical_gdp, non_cyclical_gdp, durables, residential, equipment |
| money_inflation.json | 2026-01-03-money-supply-inflation | m2_money_supply, cpi_inflation, velocity_m2 |
| credit_lending.json | 2026-01-04-bank-lending-standards | lending_standards_ci, ci_loan_volume |
| housing.json | 2026-01-10-housing-supply-demand | new_home_sales, months_supply, housing_inventory, median_home_price |

## Cache File Format

```json
{
  "metadata": {
    "updated": "2026-01-16",
    "frequency": "monthly",
    "source_posts": ["2026-01-06-mortgage-rates"]
  },
  "series": {
    "signal_name": {
      "description": "Human description",
      "unit": "percent|dollars|index",
      "values": [
        { "date": "2000-01-01", "value": 5.45 },
        { "date": "2000-02-01", "value": 5.73 }
      ]
    }
  }
}
```

## Updating Data

When blog post data changes:
1. Run `node model/data/build-cache.js` to regenerate cache files
2. Or manually update the relevant cache JSON

The adapter loads directly from cache files, so blog post JS format doesn't matter.
