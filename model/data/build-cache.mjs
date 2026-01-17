#!/usr/bin/env node
// Build consolidated cache files from blog post data
// Reads data from posts/*/data/ and creates normalized JSON in model/data/cache/
// Run: node model/data/build-cache.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_ROOT = join(__dirname, '../..');
const CACHE_DIR = join(__dirname, 'cache');

mkdirSync(CACHE_DIR, { recursive: true });

function extractJsData(filePath, varName) {
  const content = readFileSync(filePath, 'utf8');
  // Match variable assignment, stopping at next const/let/var or end of content
  const match = content.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*(\\[|\\{)([\\s\\S]*?)(?:\\];|\\};)`));
  if (!match) {
    throw new Error(`Could not find ${varName} in ${filePath}`);
  }
  const jsonStr = match[1] + match[2] + (match[1] === '[' ? ']' : '}');
  try {
    return JSON.parse(jsonStr);
  } catch {
    return eval('(' + jsonStr + ')');
  }
}

function convertChartJsFormat(data) {
  const result = [];
  const values = data.datasets[0].data;
  
  if (values.length > 0 && typeof values[0] === 'object' && 'x' in values[0]) {
    for (const point of values) {
      if (point.y !== null && point.y !== undefined) {
        result.push({ date: point.x, value: point.y });
      }
    }
  } else {
    for (let i = 0; i < data.labels.length; i++) {
      if (values[i] !== null && values[i] !== undefined) {
        result.push({ date: data.labels[i], value: values[i] });
      }
    }
  }
  return result;
}

function convertArrayFormat(data, fieldName) {
  const result = [];
  for (const row of data) {
    if (row.date && row[fieldName] !== null && row[fieldName] !== undefined) {
      result.push({ date: row.date, value: row[fieldName] });
    }
  }
  return result;
}

function resampleToMonthly(data, fieldName) {
  const monthly = new Map();
  for (const row of data) {
    if (row.date && row[fieldName] !== null && row[fieldName] !== undefined) {
      const monthKey = row.date.substring(0, 7);
      if (!monthly.has(monthKey)) {
        monthly.set(monthKey, { date: monthKey + '-01', value: row[fieldName] });
      }
    }
  }
  return Array.from(monthly.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// LABOR MARKET
console.log('Building labor_market.json...');
const laborMarket = {
  metadata: {
    updated: new Date().toISOString().split('T')[0],
    frequency: 'monthly',
    sources: {
      unemployment_rate: 'BLS via FRED (UNRATE)',
      recession_indicator: 'NBER via FRED (USREC)'
    }
  },
  series: {}
};

const unemploymentData = extractJsData(
  join(BLOG_ROOT, 'posts/2025-12-15-recession-unemployment/data/raw/unemployment.js'),
  'unemploymentData'
);
laborMarket.series.unemployment_rate = convertChartJsFormat(unemploymentData);

const recessionData = extractJsData(
  join(BLOG_ROOT, 'posts/2025-12-15-recession-unemployment/data/raw/recession_indicator.js'),
  'recessionIndicator'
);
laborMarket.series.recession_indicator = convertChartJsFormat(recessionData);

writeFileSync(join(CACHE_DIR, 'labor_market.json'), JSON.stringify(laborMarket, null, 2));
console.log(`  unemployment_rate: ${laborMarket.series.unemployment_rate.length} points`);
console.log(`  recession_indicator: ${laborMarket.series.recession_indicator.length} points`);

// INTEREST RATES
console.log('Building interest_rates.json...');
const interestRates = {
  metadata: {
    updated: new Date().toISOString().split('T')[0],
    frequency: 'monthly',
    sources: {
      fed_funds_rate: 'FRED (FEDFUNDS)',
      treasury_10y: 'FRED (DGS10)',
      mortgage_rate_30y: 'FRED (MORTGAGE30US)'
    }
  },
  series: {}
};

const mortgageRatesData = extractJsData(
  join(BLOG_ROOT, 'posts/2026-01-06-mortgage-rates/data/raw/mortgage_rates.js'),
  'mortgageRatesData'
);

interestRates.series.fed_funds_rate = resampleToMonthly(mortgageRatesData, 'fed_funds');
interestRates.series.treasury_10y = resampleToMonthly(mortgageRatesData, 'treasury_10y');
interestRates.series.mortgage_rate_30y = resampleToMonthly(mortgageRatesData, 'mortgage_30y');

writeFileSync(join(CACHE_DIR, 'interest_rates.json'), JSON.stringify(interestRates, null, 2));
console.log(`  fed_funds_rate: ${interestRates.series.fed_funds_rate.length} points`);
console.log(`  treasury_10y: ${interestRates.series.treasury_10y.length} points`);
console.log(`  mortgage_rate_30y: ${interestRates.series.mortgage_rate_30y.length} points`);

// GDP COMPONENTS
console.log('Building gdp_components.json...');
const gdpComponents = {
  metadata: {
    updated: new Date().toISOString().split('T')[0],
    frequency: 'quarterly',
    sources: {
      gdp_real: 'BEA via FRED (GDPC1)',
      gdp_growth: 'BEA via FRED (computed QoQ %)',
      cyclical_gdp: 'BEA components (durables + residential + equipment)',
      non_cyclical_gdp: 'BEA components (services + structures + government)'
    }
  },
  series: {}
};

const gdpData = extractJsData(
  join(BLOG_ROOT, 'posts/2025-12-15-recession-unemployment/data/raw/gdp.js'),
  'gdpData'
);
gdpComponents.series.gdp_real = convertChartJsFormat(gdpData);

const gdpGrowthData = extractJsData(
  join(BLOG_ROOT, 'posts/2025-12-15-recession-unemployment/data/transformed/gdp_growth.js'),
  'gdpGrowthData'
);
gdpComponents.series.gdp_growth = convertChartJsFormat(gdpGrowthData);

const cyclicalData = extractJsData(
  join(BLOG_ROOT, 'posts/2026-01-02-cyclical-gdp-test/data/cyclical_gdp_data.js'),
  'cyclicalGdpData'
);
gdpComponents.series.cyclical_gdp = convertArrayFormat(cyclicalData, 'cyclical_gdp');
gdpComponents.series.non_cyclical_gdp = convertArrayFormat(cyclicalData, 'non_cyclical_gdp');
gdpComponents.series.durables_consumption = convertArrayFormat(cyclicalData, 'durables');
gdpComponents.series.residential_investment = convertArrayFormat(cyclicalData, 'residential');
gdpComponents.series.equipment_investment = convertArrayFormat(cyclicalData, 'equipment');

writeFileSync(join(CACHE_DIR, 'gdp_components.json'), JSON.stringify(gdpComponents, null, 2));
console.log(`  gdp_real: ${gdpComponents.series.gdp_real.length} points`);
console.log(`  gdp_growth: ${gdpComponents.series.gdp_growth.length} points`);
console.log(`  cyclical_gdp: ${gdpComponents.series.cyclical_gdp.length} points`);

// MONEY/INFLATION
console.log('Building money_inflation.json...');
const moneyInflation = {
  metadata: {
    updated: new Date().toISOString().split('T')[0],
    frequency: 'monthly',
    sources: {
      m2_money_supply: 'FRED (M2SL)',
      m2_growth: 'FRED M2SL (YoY %)',
      cpi_inflation: 'FRED (CPIAUCSL)',
      inflation_rate: 'FRED CPIAUCSL (YoY %)',
      velocity_m2: 'FRED (M2V)'
    }
  },
  series: {}
};

const moneyData = extractJsData(
  join(BLOG_ROOT, 'posts/2026-01-03-money-supply-inflation/data/money_supply_data.js'),
  'moneySupplyData'
);
moneyInflation.series.m2_money_supply = convertArrayFormat(moneyData, 'm2');
moneyInflation.series.m2_growth = convertArrayFormat(moneyData, 'm2_yoy');
moneyInflation.series.cpi_inflation = convertArrayFormat(moneyData, 'cpi');
moneyInflation.series.inflation_rate = convertArrayFormat(moneyData, 'cpi_yoy');
moneyInflation.series.velocity_m2 = convertArrayFormat(moneyData, 'velocity');

writeFileSync(join(CACHE_DIR, 'money_inflation.json'), JSON.stringify(moneyInflation, null, 2));
console.log(`  m2_money_supply: ${moneyInflation.series.m2_money_supply.length} points`);
console.log(`  m2_growth: ${moneyInflation.series.m2_growth.length} points`);
console.log(`  inflation_rate: ${moneyInflation.series.inflation_rate.length} points`);

// CREDIT/LENDING
console.log('Building credit_lending.json...');
const creditLending = {
  metadata: {
    updated: new Date().toISOString().split('T')[0],
    frequency: 'quarterly',
    sources: {
      lending_standards_ci: 'FRED Senior Loan Officer Survey (DRTSCILM)',
      ci_loan_volume: 'FRED (BUSLOANS)'
    }
  },
  series: {}
};

const lendingData = extractJsData(
  join(BLOG_ROOT, 'posts/2026-01-04-bank-lending-standards/data/lending_standards_data.js'),
  'lendingStandardsData'
);
creditLending.series.lending_standards_ci = convertArrayFormat(lendingData, 'ci_standards');
creditLending.series.ci_loan_volume = convertArrayFormat(lendingData, 'ci_loans');

writeFileSync(join(CACHE_DIR, 'credit_lending.json'), JSON.stringify(creditLending, null, 2));
console.log(`  lending_standards_ci: ${creditLending.series.lending_standards_ci.length} points`);
console.log(`  ci_loan_volume: ${creditLending.series.ci_loan_volume.length} points`);

// HOUSING
console.log('Building housing.json...');
const housing = {
  metadata: {
    updated: new Date().toISOString().split('T')[0],
    frequency: 'monthly',
    sources: {
      new_home_sales: 'Census Bureau via FRED (HSN1F)',
      months_supply: 'Census Bureau via FRED (MSACSR)',
      housing_inventory: 'Census Bureau via FRED',
      median_home_price: 'Census Bureau via FRED (MSPNHSUS)'
    }
  },
  series: {}
};

const housingData = extractJsData(
  join(BLOG_ROOT, 'posts/2026-01-10-housing-supply-demand/data/raw/housing_data.js'),
  'housingData'
);
housing.series.new_home_sales = convertArrayFormat(housingData, 'new_home_sales');
housing.series.months_supply = convertArrayFormat(housingData, 'months_supply');
housing.series.housing_inventory = convertArrayFormat(housingData, 'inventory');
housing.series.median_home_price = convertArrayFormat(housingData, 'median_price');

writeFileSync(join(CACHE_DIR, 'housing.json'), JSON.stringify(housing, null, 2));
console.log(`  new_home_sales: ${housing.series.new_home_sales.length} points`);
console.log(`  months_supply: ${housing.series.months_supply.length} points`);
console.log(`  median_home_price: ${housing.series.median_home_price.length} points`);

console.log('\nCache build complete!');
