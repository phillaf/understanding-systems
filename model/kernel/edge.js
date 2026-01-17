/**
 * Edge - Represents a causal relationship between two signals
 * 
 * Semantics: "How source affects target"
 * The edge reads from source at (t - delay) and contributes to target at t
 */

// Built-in transform functions
export const transforms = {
  /**
   * Linear passthrough (identity)
   */
  linear: (x) => x,

  /**
   * Sigmoid: squashes input to (0, 1)
   * Useful for probability-like outputs
   */
  sigmoid: (x) => 1 / (1 + Math.exp(-x)),

  /**
   * Tanh: squashes input to (-1, 1)
   * Useful for signals that can be positive or negative
   */
  tanh: (x) => Math.tanh(x),

  /**
   * ReLU: zero for negative, linear for positive
   * Useful for "only positive influence" relationships
   */
  relu: (x) => Math.max(0, x),

  /**
   * Threshold: binary output (simple version for string lookup)
   * Converts to 1 if positive, 0 otherwise
   */
  threshold: (x) => x > 0.5 ? 1 : 0,

  /**
   * Inverse: higher input = lower output
   * Useful for inverse relationships (e.g., rates up → demand down)
   */
  inverse: (x) => -x,
  
  /**
   * Derivative: signals that this edge needs rate-of-change computation
   * The actual derivative is computed in the graph propagation
   * Here we just pass through - the graph handles the derivative logic
   */
  derivative: (x) => x,

  /**
   * Log transform: compresses large values
   * Useful for growth rates, percentages
   */
  log: (x) => x > 0 ? Math.log(x + 1) : -Math.log(-x + 1),
};

export class Edge {
  /**
   * @param {Object} config
   * @param {string} config.from - Source signal name
   * @param {string} config.to - Target signal name
   * @param {number} config.weight - Signed weight (-1 to 1 typical)
   * @param {string|function} [config.transform='linear'] - Transform function name or function
   * @param {number} [config.delay=0] - Time delay in steps
   * @param {number} [config.bias=0] - Constant offset added to the contribution
   * @param {string} [config.description] - Human-readable description
   */
  constructor({ from, to, weight, transform = 'linear', delay = 0, bias = 0, description = '' }) {
    this.from = from;
    this.to = to;
    this.weight = weight;
    this.delay = delay;
    this.bias = bias;
    this.description = description;

    // Resolve transform function
    if (typeof transform === 'function') {
      this.transform = transform;
      this.transformName = 'custom';
    } else if (typeof transform === 'string') {
      if (transforms[transform]) {
        this.transform = transforms[transform];
        this.transformName = transform;
      } else {
        console.warn(`Unknown transform "${transform}", using linear`);
        this.transform = transforms.linear;
        this.transformName = 'linear';
      }
    } else {
      this.transform = transforms.linear;
      this.transformName = 'linear';
    }
  }

  /**
   * Compute the contribution of this edge at timestep t
   * @param {Signal} sourceSignal - The source signal
   * @param {number} t - Current timestep
   * @returns {number|null} - Contribution or null if source data unavailable
   */
  computeContribution(sourceSignal, t) {
    const readTime = t - this.delay;
    const sourceValue = sourceSignal.getValue(readTime);
    
    if (sourceValue === null) {
      return null; // Can't compute without source data
    }

    // Handle derivative transform specially - needs previous value
    if (this.transformName === 'derivative') {
      const prevValue = sourceSignal.getValue(readTime - 1);
      if (prevValue === null) {
        return null;
      }
      // Return rate of change (derivative)
      return this.weight * (sourceValue - prevValue) + this.bias;
    }

    return this.weight * this.transform(sourceValue) + this.bias;
  }

  /**
   * Get a human-readable description of this edge
   * @returns {string}
   */
  toString() {
    const sign = this.weight >= 0 ? '+' : '';
    const delayStr = this.delay > 0 ? ` (delay: ${this.delay})` : '';
    return `${this.from} → ${this.to}: ${sign}${this.weight.toFixed(2)} [${this.transformName}]${delayStr}`;
  }
}
