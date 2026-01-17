/**
 * Economic Model Data Adapter
 * 
 * Loads data from blog post JavaScript files and injects into model signals.
 * This module handles the various data formats across different blog posts.
 */

import { Signal, Edge, Graph, transforms, ModelFit } from '../kernel/index.js';
import { createGraphFromDefinition } from './loader.js';

// Time conversion utilities (months since 1948-01-01)
function dateToTime(dateStr) {
    const d = new Date(dateStr);
    const epoch = new Date('1948-01-01');
    return (d.getFullYear() - epoch.getFullYear()) * 12 + (d.getMonth() - epoch.getMonth());
}

function timeToDate(t) {
    const year = 1948 + Math.floor(t / 12);
    const month = t % 12 + 1;
    return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * Load data from a Chart.js format (labels + datasets)
 * Used by: unemployment.js, gdp.js
 */
function loadChartJsData(data) {
    const result = new Map();
    if (!data.labels || !data.datasets) return result;
    
    const values = data.datasets[0].data;
    data.labels.forEach((date, i) => {
        const val = values[i];
        if (val !== null && val !== undefined) {
            result.set(dateToTime(date), parseFloat(val));
        }
    });
    return result;
}

/**
 * Load data from x/y point format
 * Used by: recession_indicator.js
 */
function loadPointData(data) {
    const result = new Map();
    if (!data.datasets || !data.datasets[0].data) return result;
    
    data.datasets[0].data.forEach(point => {
        result.set(dateToTime(point.x), point.y);
    });
    return result;
}

/**
 * Load data from array-of-objects format
 * Used by: cyclical_gdp_data.js, money_supply_data.js, lending_standards_data.js, etc.
 */
function loadArrayData(data, fieldName) {
    const result = new Map();
    if (!Array.isArray(data)) return result;
    
    data.forEach(row => {
        if (row.date && row[fieldName] !== null && row[fieldName] !== undefined) {
            result.set(dateToTime(row.date), parseFloat(row[fieldName]));
        }
    });
    return result;
}

/**
 * Create the economic model graph and load data
 */
export async function createEconomicModel() {
    // First, create the graph from the YAML definition
    const response = await fetch('/definitions/economic-model.yaml');
    const yamlText = await response.text();
    
    // Parse YAML (using js-yaml if available)
    let modelDef;
    if (typeof jsyaml !== 'undefined') {
        modelDef = jsyaml.load(yamlText);
    } else {
        throw new Error('js-yaml library required - include via script tag');
    }
    
    const graph = createGraphFromDefinition(modelDef);
    
    return { graph, modelDef };
}

/**
 * Load data from blog posts into the model
 * @param {Graph} graph - The economic model graph
 * @param {Object} dataSources - Map of data variable names to their data
 */
export function loadBlogData(graph, dataSources) {
    const dataMap = {};
    
    // Unemployment data (Chart.js format)
    if (dataSources.unemploymentData) {
        dataMap.unemployment_rate = loadChartJsData(dataSources.unemploymentData);
    }
    
    // Recession indicator (point format)
    if (dataSources.recessionIndicator) {
        dataMap.recession_indicator = loadPointData(dataSources.recessionIndicator);
    }
    
    // GDP data (Chart.js format)
    if (dataSources.gdpData) {
        dataMap.gdp_real = loadChartJsData(dataSources.gdpData);
    }
    
    // Cyclical GDP data (array format)
    if (dataSources.cyclicalGdpData) {
        dataMap.cyclical_gdp = loadArrayData(dataSources.cyclicalGdpData, 'cyclical_gdp');
        dataMap.non_cyclical_gdp = loadArrayData(dataSources.cyclicalGdpData, 'non_cyclical_gdp');
        dataMap.durables_consumption = loadArrayData(dataSources.cyclicalGdpData, 'durables');
        dataMap.residential_investment = loadArrayData(dataSources.cyclicalGdpData, 'residential');
        dataMap.equipment_investment = loadArrayData(dataSources.cyclicalGdpData, 'equipment');
    }
    
    // Money supply data (array format)
    if (dataSources.moneySupplyData) {
        dataMap.m2_money_supply = loadArrayData(dataSources.moneySupplyData, 'm2');
        dataMap.cpi_inflation = loadArrayData(dataSources.moneySupplyData, 'cpi');
        dataMap.velocity_m2 = loadArrayData(dataSources.moneySupplyData, 'velocity');
        // Ground truth for computed signals
        dataMap.m2_growth_gt = loadArrayData(dataSources.moneySupplyData, 'm2_yoy');
        dataMap.inflation_rate_gt = loadArrayData(dataSources.moneySupplyData, 'cpi_yoy');
    }
    
    // GDP growth data (Chart.js format) - ground truth for gdp_growth
    if (dataSources.gdpGrowthData) {
        dataMap.gdp_growth_gt = loadChartJsData(dataSources.gdpGrowthData);
    }
    
    // Lending standards data (array format)
    if (dataSources.lendingStandardsData) {
        dataMap.lending_standards_ci = loadArrayData(dataSources.lendingStandardsData, 'ci_standards');
        dataMap.ci_loan_volume = loadArrayData(dataSources.lendingStandardsData, 'ci_loans');
    }
    
    // Mortgage rates data (array format)
    if (dataSources.mortgageRatesData) {
        dataMap.mortgage_rate_30y = loadArrayData(dataSources.mortgageRatesData, 'mortgage_30y');
        dataMap.treasury_10y = loadArrayData(dataSources.mortgageRatesData, 'treasury_10y');
        dataMap.fed_funds_rate = loadArrayData(dataSources.mortgageRatesData, 'fed_funds');
    }
    
    // Housing data (array format)
    if (dataSources.housingData) {
        dataMap.new_home_sales = loadArrayData(dataSources.housingData, 'new_home_sales');
        dataMap.months_supply = loadArrayData(dataSources.housingData, 'months_supply');
        dataMap.housing_inventory = loadArrayData(dataSources.housingData, 'inventory');
        dataMap.median_home_price = loadArrayData(dataSources.housingData, 'median_price');
    }
    
    // Inject data into signals
    for (const [signalName, data] of Object.entries(dataMap)) {
        const signal = graph.getSignal(signalName);
        if (!signal) {
            console.warn(`Signal not found in model: ${signalName}`);
            continue;
        }
        
        if (signal.observed) {
            // Observed signals get data injected into history
            for (const [t, value] of data) {
                signal.setValue(t, value);
            }
            console.log(`Loaded ${data.size} points for observed signal: ${signalName}`);
        }
    }
    
    // Set recession indicator as ground truth for recession_probability
    if (dataMap.recession_indicator) {
        const recessionProb = graph.getSignal('recession_probability');
        if (recessionProb) {
            const gtData = [];
            for (const [t, value] of dataMap.recession_indicator) {
                gtData.push({ t, value });
            }
            recessionProb.setGroundTruth(gtData);
            console.log(`Set ${gtData.length} ground truth points for recession_probability`);
        }
        
        // Also set recession_indicator signal data
        const recessionSignal = graph.getSignal('recession_indicator');
        if (recessionSignal) {
            for (const [t, value] of dataMap.recession_indicator) {
                recessionSignal.setValue(t, value);
            }
        }
    }
    
    return dataMap;
}

/**
 * Find common time range across all loaded signals
 */
export function findTimeRange(graph) {
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    for (const [name, signal] of graph.signals) {
        if (signal.history.size > 0) {
            const times = [...signal.history.keys()];
            minTime = Math.min(minTime, ...times);
            maxTime = Math.max(maxTime, ...times);
        }
    }
    
    return { minTime, maxTime };
}

/**
 * Run simulation over a time range
 */
export function runSimulation(graph, startTime, endTime) {
    // Clear computed signals
    for (const [name, signal] of graph.signals) {
        if (!signal.observed) {
            signal.history.clear();
        }
    }
    
    // Step through time
    for (let t = startTime; t <= endTime; t++) {
        graph.step(t);
    }
    
    console.log(`Simulation complete: t=${startTime} to t=${endTime}`);
}

export { dateToTime, timeToDate };
