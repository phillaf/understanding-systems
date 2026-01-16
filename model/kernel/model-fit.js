/**
 * ModelFit - Calculates error metrics between computed signals and ground truth
 * 
 * Provides:
 * - Per-signal error metrics (MSE, MAE, correlation, etc.)
 * - Global loss function for optimization
 * - Utilities for optimizer integration
 */

/**
 * Calculate Mean Squared Error
 * @param {number[]} computed - Model's computed values
 * @param {number[]} truth - Ground truth values
 * @returns {number}
 */
export function mse(computed, truth) {
  if (computed.length !== truth.length || computed.length === 0) return Infinity;
  const sum = computed.reduce((acc, v, i) => acc + Math.pow(v - truth[i], 2), 0);
  return sum / computed.length;
}

/**
 * Calculate Mean Absolute Error
 * @param {number[]} computed - Model's computed values
 * @param {number[]} truth - Ground truth values
 * @returns {number}
 */
export function mae(computed, truth) {
  if (computed.length !== truth.length || computed.length === 0) return Infinity;
  const sum = computed.reduce((acc, v, i) => acc + Math.abs(v - truth[i]), 0);
  return sum / computed.length;
}

/**
 * Calculate Pearson correlation coefficient
 * @param {number[]} computed - Model's computed values
 * @param {number[]} truth - Ground truth values
 * @returns {number} - Between -1 and 1
 */
export function correlation(computed, truth) {
  if (computed.length !== truth.length || computed.length < 2) return 0;
  
  const n = computed.length;
  const meanC = computed.reduce((a, b) => a + b, 0) / n;
  const meanT = truth.reduce((a, b) => a + b, 0) / n;
  
  let num = 0, denC = 0, denT = 0;
  for (let i = 0; i < n; i++) {
    const dc = computed[i] - meanC;
    const dt = truth[i] - meanT;
    num += dc * dt;
    denC += dc * dc;
    denT += dt * dt;
  }
  
  const den = Math.sqrt(denC * denT);
  return den === 0 ? 0 : num / den;
}

/**
 * Calculate optimal lead/lag alignment
 * Returns how many timesteps the computed series should be shifted
 * to best align with truth (positive = computed leads, negative = lags)
 * @param {number[]} computed 
 * @param {number[]} truth 
 * @param {number} maxLag - Maximum lag to test (default 12)
 * @returns {{lag: number, correlation: number}}
 */
export function findBestLag(computed, truth, maxLag = 12) {
  let bestLag = 0;
  let bestCorr = correlation(computed, truth);
  
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    if (lag === 0) continue;
    
    const shifted = [];
    const truthAligned = [];
    
    for (let i = 0; i < computed.length; i++) {
      const j = i + lag;
      if (j >= 0 && j < truth.length) {
        shifted.push(computed[i]);
        truthAligned.push(truth[j]);
      }
    }
    
    const corr = correlation(shifted, truthAligned);
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  
  return { lag: bestLag, correlation: bestCorr };
}

/**
 * Calculate all metrics for a signal
 * @param {Signal} signal - Signal with history and groundTruth
 * @returns {Object|null} - Metrics object or null if no ground truth
 */
export function calculateSignalMetrics(signal) {
  if (!signal.hasGroundTruth()) return null;
  
  // Align computed and truth by timestep
  const computed = [];
  const truth = [];
  const timesteps = [];
  
  for (const [t, truthValue] of signal.groundTruth) {
    const computedValue = signal.history.get(t);
    if (computedValue !== undefined) {
      timesteps.push(t);
      computed.push(computedValue);
      truth.push(truthValue);
    }
  }
  
  if (computed.length === 0) {
    return {
      hasData: false,
      message: 'No overlapping timesteps'
    };
  }
  
  const lagResult = findBestLag(computed, truth);
  
  return {
    hasData: true,
    n: computed.length,
    mse: mse(computed, truth),
    rmse: Math.sqrt(mse(computed, truth)),
    mae: mae(computed, truth),
    correlation: correlation(computed, truth),
    bestLag: lagResult.lag,
    lagCorrelation: lagResult.correlation,
    // Normalized error (0-1 scale based on truth range)
    truthRange: Math.max(...truth) - Math.min(...truth),
    normalizedRmse: Math.sqrt(mse(computed, truth)) / (Math.max(...truth) - Math.min(...truth) || 1)
  };
}

/**
 * ModelFit class - manages fitting across all signals in a graph
 */
export class ModelFit {
  /**
   * @param {Graph} graph - The signal graph
   * @param {Object} weights - Per-signal weights for loss function
   */
  constructor(graph, weights = {}) {
    this.graph = graph;
    this.weights = weights;
  }

  /**
   * Set weight for a specific signal in the loss function
   * @param {string} signalName 
   * @param {number} weight 
   */
  setWeight(signalName, weight) {
    this.weights[signalName] = weight;
  }

  /**
   * Calculate metrics for all signals with ground truth
   * @returns {Map<string, Object>} - Signal name -> metrics
   */
  calculateAllMetrics() {
    const results = new Map();
    
    for (const [name, signal] of this.graph.signals) {
      const metrics = calculateSignalMetrics(signal);
      if (metrics) {
        results.set(name, metrics);
      }
    }
    
    return results;
  }

  /**
   * Calculate global loss (weighted sum of per-signal errors)
   * @param {string} errorType - 'mse', 'rmse', 'mae', or 'normalizedRmse'
   * @returns {number}
   */
  calculateLoss(errorType = 'normalizedRmse') {
    const metrics = this.calculateAllMetrics();
    let totalLoss = 0;
    let totalWeight = 0;
    
    for (const [name, m] of metrics) {
      if (!m.hasData) continue;
      
      const weight = this.weights[name] ?? 1;
      const error = m[errorType] ?? m.mse;
      
      totalLoss += weight * error;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalLoss / totalWeight : Infinity;
  }

  /**
   * Get a summary of fit quality across all signals
   * @returns {Object}
   */
  getSummary() {
    const metrics = this.calculateAllMetrics();
    const signalSummaries = [];
    
    for (const [name, m] of metrics) {
      if (!m.hasData) {
        signalSummaries.push({ name, status: 'no-data', message: m.message });
        continue;
      }
      
      // Classify fit quality
      let quality;
      if (m.correlation >= 0.8) quality = 'good';
      else if (m.correlation >= 0.5) quality = 'medium';
      else quality = 'poor';
      
      signalSummaries.push({
        name,
        status: 'fitted',
        quality,
        correlation: m.correlation,
        rmse: m.rmse,
        normalizedRmse: m.normalizedRmse,
        bestLag: m.bestLag,
        n: m.n
      });
    }
    
    return {
      signals: signalSummaries,
      globalLoss: this.calculateLoss(),
      signalsWithGroundTruth: metrics.size,
      signalsFitted: signalSummaries.filter(s => s.status === 'fitted').length
    };
  }

  /**
   * Get current edge parameters as a flat array (for optimizers)
   * @returns {number[]}
   */
  getEdgeParameters() {
    const params = [];
    for (const edge of this.graph.edges) {
      params.push(edge.weight);
      params.push(edge.delay);
    }
    return params;
  }

  /**
   * Set edge parameters from a flat array (for optimizers)
   * @param {number[]} params
   */
  setEdgeParameters(params) {
    let i = 0;
    for (const edge of this.graph.edges) {
      edge.weight = params[i++];
      edge.delay = Math.round(Math.max(0, params[i++]));
    }
  }

  /**
   * Create a parameter bounds array for optimizers
   * @returns {{min: number[], max: number[]}}
   */
  getParameterBounds() {
    const min = [];
    const max = [];
    for (const edge of this.graph.edges) {
      min.push(-5);  // weight min
      max.push(5);   // weight max
      min.push(0);   // delay min
      max.push(24);  // delay max (2 years)
    }
    return { min, max };
  }
}
