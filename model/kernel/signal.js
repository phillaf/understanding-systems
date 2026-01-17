/**
 * Signal - Represents a single economic variable (time series node)
 * 
 * A signal can be:
 * - Observed: Real data is injected from external sources (input nodes)
 * - Computed: Value is calculated from incoming edges
 * 
 * Any signal can optionally have groundTruth data for comparison/fitting
 */
export class Signal {
  /**
   * @param {Object} config
   * @param {string} config.name - Unique identifier
   * @param {boolean} [config.observed=false] - If true, uses injected real data
   * @param {string} [config.description] - Human-readable description
   * @param {string} [config.unit] - Unit of measurement (e.g., '%', 'USD', 'index')
   * @param {function} [config.activation] - Optional activation function (e.g., clamp)
   * @param {number} [config.min] - Minimum value (for clamping)
   * @param {number} [config.max] - Maximum value (for clamping)
   * @param {string[]} [config.tags] - Blog post tags referencing this signal
   */
  constructor({ name, observed = false, description = '', unit = '', activation = null, min = null, max = null, tags = [] }) {
    this.name = name;
    this.observed = observed;
    this.description = description;
    this.unit = unit;
    this.activation = activation;
    this.min = min;
    this.max = max;
    this.tags = tags;
    
    // Time series data: Map<timestep, value>
    // For observed signals: this holds the real input data
    // For computed signals: this holds the model's computed values
    this.history = new Map();
    
    // Ground truth data: Map<timestep, value>
    // For signals we want to fit against real data
    // E.g., recession_probability can have NBER recession dates as ground truth
    this.groundTruth = new Map();
  }

  /**
   * Get value at a specific timestep
   * @param {number} t - Timestep
   * @returns {number|null} - Value or null if not available
   */
  getValue(t) {
    return this.history.has(t) ? this.history.get(t) : null;
  }

  /**
   * Set value at a specific timestep
   * @param {number} t - Timestep
   * @param {number} value - Value to set
   */
  setValue(t, value) {
    // Apply activation/clamping if defined
    let finalValue = value;
    
    if (this.activation) {
      finalValue = this.activation(finalValue);
    }
    
    if (this.min !== null && finalValue < this.min) {
      finalValue = this.min;
    }
    if (this.max !== null && finalValue > this.max) {
      finalValue = this.max;
    }
    
    this.history.set(t, finalValue);
  }

  /**
   * Inject observed data (for observed signals)
   * @param {Array<{t: number, value: number}>} data - Time series data
   */
  injectData(data) {
    if (!this.observed) {
      console.warn(`Signal "${this.name}" is not observed, but data is being injected`);
    }
    for (const { t, value } of data) {
      this.history.set(t, value);
    }
  }

  /**
   * Set ground truth data for fitting/comparison
   * @param {Array<{t: number, value: number}>} data - Time series data
   */
  setGroundTruth(data) {
    this.groundTruth.clear();
    for (const { t, value } of data) {
      this.groundTruth.set(t, value);
    }
  }

  /**
   * Check if this signal has ground truth data
   * @returns {boolean}
   */
  hasGroundTruth() {
    return this.groundTruth.size > 0;
  }

  /**
   * Get ground truth as sorted array
   * @returns {Array<{t: number, value: number}>}
   */
  getGroundTruthArray() {
    return Array.from(this.groundTruth.entries())
      .map(([t, value]) => ({ t, value }))
      .sort((a, b) => a.t - b.t);
  }

  /**
   * Get the current value (latest timestep)
   * @returns {number|null}
   */
  get currentValue() {
    if (this.history.size === 0) return null;
    const maxT = Math.max(...this.history.keys());
    return this.history.get(maxT);
  }

  /**
   * Get all history as sorted array
   * @returns {Array<{t: number, value: number}>}
   */
  getHistoryArray() {
    return Array.from(this.history.entries())
      .map(([t, value]) => ({ t, value }))
      .sort((a, b) => a.t - b.t);
  }

  /**
   * Clear all history
   */
  reset() {
    this.history.clear();
  }
}
