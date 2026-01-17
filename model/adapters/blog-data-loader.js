/**
 * Blog Data Loader
 * 
 * Loads economic time series data from blog post data files.
 * Handles the different data formats used across posts.
 */

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(dateStr) {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
}

/**
 * Parse date to numeric time (months since epoch)
 * Using 1948-01-01 as epoch (start of NBER recession data)
 */
function dateToTime(dateStr) {
    const d = new Date(dateStr);
    const epoch = new Date('1948-01-01');
    const monthsDiff = (d.getFullYear() - epoch.getFullYear()) * 12 + 
                       (d.getMonth() - epoch.getMonth());
    return monthsDiff;
}

/**
 * Convert time back to date string
 */
function timeToDate(time) {
    const epoch = new Date('1948-01-01');
    const date = new Date(epoch);
    date.setMonth(date.getMonth() + time);
    return date.toISOString().split('T')[0];
}

/**
 * Load unemployment data
 * Format: { labels: [...], datasets: [{ data: [...] }] }
 */
export function loadUnemploymentData(data) {
    const result = new Map();
    
    if (data.labels && data.datasets) {
        // Chart.js format
        const values = data.datasets[0].data;
        data.labels.forEach((date, i) => {
            const time = dateToTime(date);
            if (values[i] !== null && values[i] !== undefined) {
                result.set(time, parseFloat(values[i]));
            }
        });
    }
    
    return result;
}

/**
 * Load recession indicator data
 * Format: { datasets: [{ data: [{ x: date, y: value }, ...] }] }
 */
export function loadRecessionData(data) {
    const result = new Map();
    
    if (data.datasets && data.datasets[0].data) {
        data.datasets[0].data.forEach(point => {
            const time = dateToTime(point.x);
            result.set(time, point.y);
        });
    }
    
    return result;
}

/**
 * Load GDP data
 * Format: { labels: [...], datasets: [{ data: [...] }] }
 */
export function loadGDPData(data) {
    const result = new Map();
    
    if (data.labels && data.datasets) {
        const values = data.datasets[0].data;
        data.labels.forEach((date, i) => {
            const time = dateToTime(date);
            if (values[i] !== null && values[i] !== undefined) {
                result.set(time, parseFloat(values[i]));
            }
        });
    }
    
    return result;
}

/**
 * Load array-of-objects data (cyclical GDP, money supply, lending, housing)
 * Format: [{ date: "YYYY-MM-DD", field1: value, field2: value, ... }, ...]
 */
export function loadArrayData(data, fieldName) {
    const result = new Map();
    
    if (Array.isArray(data)) {
        data.forEach(row => {
            if (row.date && row[fieldName] !== null && row[fieldName] !== undefined) {
                const time = dateToTime(row.date);
                result.set(time, parseFloat(row[fieldName]));
            }
        });
    }
    
    return result;
}

/**
 * Load cyclical GDP data - extracts multiple signals
 */
export function loadCyclicalGDPData(data) {
    return {
        cyclical_gdp: loadArrayData(data, 'cyclical_gdp'),
        non_cyclical_gdp: loadArrayData(data, 'non_cyclical_gdp'),
        total_gdp: loadArrayData(data, 'total_gdp'),
        cyclical_share: loadArrayData(data, 'cyclical_share'),
        durables: loadArrayData(data, 'durables'),
        residential: loadArrayData(data, 'residential'),
        equipment: loadArrayData(data, 'equipment')
    };
}

/**
 * Load money supply data - extracts multiple signals
 */
export function loadMoneySupplyData(data) {
    return {
        m2: loadArrayData(data, 'm2'),
        cpi: loadArrayData(data, 'cpi'),
        pce: loadArrayData(data, 'pce'),
        core_cpi: loadArrayData(data, 'core_cpi'),
        velocity: loadArrayData(data, 'velocity'),
        monetary_base: loadArrayData(data, 'monetary_base'),
        m2_yoy: loadArrayData(data, 'm2_yoy'),
        cpi_yoy: loadArrayData(data, 'cpi_yoy')
    };
}

/**
 * Load lending standards data - extracts multiple signals
 */
export function loadLendingData(data) {
    return {
        ci_standards: loadArrayData(data, 'ci_standards'),
        consumer_standards: loadArrayData(data, 'consumer_standards'),
        mortgage_standards: loadArrayData(data, 'mortgage_standards'),
        ci_demand: loadArrayData(data, 'ci_demand'),
        ci_loans: loadArrayData(data, 'ci_loans'),
        consumer_credit: loadArrayData(data, 'consumer_credit'),
        yield_curve: loadArrayData(data, 'yield_curve'),
        recession: loadArrayData(data, 'recession')
    };
}

/**
 * Load mortgage rates data - extracts multiple signals
 */
export function loadMortgageData(data) {
    return {
        mortgage_30y: loadArrayData(data, 'mortgage_30y'),
        mortgage_15y: loadArrayData(data, 'mortgage_15y'),
        treasury_10y: loadArrayData(data, 'treasury_10y'),
        fed_funds: loadArrayData(data, 'fed_funds'),
        mortgage_spread: loadArrayData(data, 'mortgage_spread')
    };
}

/**
 * Load housing data - extracts multiple signals
 */
export function loadHousingData(data) {
    return {
        inventory: loadArrayData(data, 'inventory'),
        median_price: loadArrayData(data, 'median_price'),
        new_home_sales: loadArrayData(data, 'new_home_sales'),
        months_supply: loadArrayData(data, 'months_supply'),
        recession: loadArrayData(data, 'recession')
    };
}

/**
 * Resample monthly data to quarterly (or vice versa)
 * mode: 'monthly_to_quarterly' or 'quarterly_to_monthly'
 */
export function resampleData(data, mode = 'monthly_to_quarterly') {
    const result = new Map();
    
    if (mode === 'monthly_to_quarterly') {
        // Average 3 months into quarters
        const entries = [...data.entries()].sort((a, b) => a[0] - b[0]);
        
        for (let i = 0; i < entries.length; i += 3) {
            const chunk = entries.slice(i, i + 3);
            if (chunk.length === 3) {
                const avgValue = chunk.reduce((sum, e) => sum + e[1], 0) / 3;
                result.set(chunk[0][0], avgValue);
            }
        }
    } else if (mode === 'quarterly_to_monthly') {
        // Linear interpolation from quarterly to monthly
        const entries = [...data.entries()].sort((a, b) => a[0] - b[0]);
        
        for (let i = 0; i < entries.length - 1; i++) {
            const [t0, v0] = entries[i];
            const [t1, v1] = entries[i + 1];
            
            // Add intermediate monthly values
            result.set(t0, v0);
            result.set(t0 + 1, v0 + (v1 - v0) / 3);
            result.set(t0 + 2, v0 + 2 * (v1 - v0) / 3);
        }
        
        // Add last value
        if (entries.length > 0) {
            const last = entries[entries.length - 1];
            result.set(last[0], last[1]);
        }
    }
    
    return result;
}

/**
 * Find common time range across multiple data series
 */
export function findCommonTimeRange(dataMaps) {
    let minTime = -Infinity;
    let maxTime = Infinity;
    
    dataMaps.forEach(dataMap => {
        if (dataMap.size > 0) {
            const times = [...dataMap.keys()];
            minTime = Math.max(minTime, Math.min(...times));
            maxTime = Math.min(maxTime, Math.max(...times));
        }
    });
    
    return { minTime, maxTime };
}

/**
 * Align data to common time range
 */
export function alignToTimeRange(dataMap, minTime, maxTime) {
    const result = new Map();
    
    for (const [time, value] of dataMap) {
        if (time >= minTime && time <= maxTime) {
            result.set(time, value);
        }
    }
    
    return result;
}

// Export utilities
export { dateToTime, timeToDate, normalizeDate };
