import { createGraphFromDefinition } from './adapters/loader.js';
import yaml from 'yaml';
import { readFileSync } from 'fs';

const def = yaml.parse(readFileSync('definitions/economic-model.yaml', 'utf8'));
const graph = createGraphFromDefinition(def);

console.log('Loaded graph:', graph.signals.size, 'signals,', graph.edges.length, 'edges');

// Load cache data
const rates = JSON.parse(readFileSync('data/cache/interest_rates.json', 'utf8'));
const labor = JSON.parse(readFileSync('data/cache/labor_market.json', 'utf8'));
const credit = JSON.parse(readFileSync('data/cache/credit_lending.json', 'utf8'));
const gdp = JSON.parse(readFileSync('data/cache/gdp_components.json', 'utf8'));

// Date to time (months since 1948-01-01)
function dateToTime(dateStr) {
  const [year, month] = dateStr.split('-').map(Number);
  return (year - 1948) * 12 + (month - 1);
}

// Inject series from cache
function injectSeries(signalName, series, source) {
  const signal = graph.getSignal(signalName);
  if (!signal) {
    console.warn(`Signal ${signalName} not found in model`);
    return 0;
  }
  let count = 0;
  for (const point of series) {
    const t = dateToTime(point.date);
    signal.setValue(t, point.value);
    count++;
  }
  console.log(`  ${signalName}: ${count} points from ${source}`);
  return count;
}

console.log('\nInjecting data:');
injectSeries('fed_funds_rate', rates.series.fed_funds_rate, 'FRED');
injectSeries('treasury_10y', rates.series.treasury_10y, 'FRED');
injectSeries('unemployment_rate', labor.series.unemployment_rate, 'BLS');
injectSeries('lending_standards_ci', credit.series.lending_standards_ci, 'FRED');
injectSeries('gdp_real', gdp.series.gdp_real, 'BEA');
injectSeries('cyclical_gdp', gdp.series.cyclical_gdp, 'BEA');
injectSeries('non_cyclical_gdp', gdp.series.non_cyclical_gdp, 'BEA');
injectSeries('durables_consumption', gdp.series.durables_consumption, 'BEA');
injectSeries('residential_investment', gdp.series.residential_investment, 'BEA');
injectSeries('equipment_investment', gdp.series.equipment_investment, 'BEA');

// Run simulation like the HTML does
const startTime = 504; // 1990
const endTime = 935; // 2025

console.log('\nRunning simulation from t=' + startTime + ' to t=' + endTime);
for (let t = startTime; t <= endTime; t++) {
  graph.step(t);
}

// Check a few key values
const testT = 720; // ~2008 (financial crisis)
console.log('\n--- At t=' + testT + ' (2008) ---');
const yc = graph.getSignal('yield_curve_spread');
console.log('yield_curve_spread:', yc?.getValue(testT)?.toFixed(3));

const fs = graph.getSignal('financial_stress');
console.log('financial_stress:', fs?.getValue(testT)?.toFixed(3));

const cei = graph.getSignal('cyclical_economy_index');
console.log('cyclical_economy_index:', cei?.getValue(testT)?.toFixed(3));

const rec = graph.getSignal('recession_indicator');
console.log('recession_indicator:', rec?.getValue(testT)?.toFixed(4));

// Also check 2020 (COVID)
const t2020 = 864;
console.log('\n--- At t=' + t2020 + ' (2020) ---');
console.log('yield_curve_spread:', yc?.getValue(t2020)?.toFixed(3));
console.log('financial_stress:', fs?.getValue(t2020)?.toFixed(3));
console.log('cyclical_economy_index:', cei?.getValue(t2020)?.toFixed(3));
console.log('recession_indicator:', rec?.getValue(t2020)?.toFixed(4));

// And stable period 2015
const t2015 = 804;
console.log('\n--- At t=' + t2015 + ' (2015) ---');
console.log('yield_curve_spread:', yc?.getValue(t2015)?.toFixed(3));
console.log('financial_stress:', fs?.getValue(t2015)?.toFixed(3));
console.log('cyclical_economy_index:', cei?.getValue(t2015)?.toFixed(3));
console.log('recession_indicator:', rec?.getValue(t2015)?.toFixed(4));
