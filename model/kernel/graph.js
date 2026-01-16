/**
 * Graph - The computation engine for the signal graph
 * 
 * Responsibilities:
 * - Holds signals and edges
 * - Advances the system one timestep
 * - Applies simultaneous updates
 * 
 * NOT responsible for: IO, learning, visualization
 */

import { Signal } from './signal.js';
import { Edge } from './edge.js';

export class Graph {
  constructor() {
    /** @type {Map<string, Signal>} */
    this.signals = new Map();
    
    /** @type {Edge[]} */
    this.edges = [];
    
    /** @type {number} */
    this.currentTime = 0;
  }

  /**
   * Add a signal to the graph
   * @param {Signal} signal
   */
  addSignal(signal) {
    if (this.signals.has(signal.name)) {
      throw new Error(`Signal "${signal.name}" already exists`);
    }
    this.signals.set(signal.name, signal);
  }

  /**
   * Add an edge to the graph
   * @param {Edge} edge
   */
  addEdge(edge) {
    // Validate that source and target signals exist
    if (!this.signals.has(edge.from)) {
      throw new Error(`Edge source signal "${edge.from}" not found`);
    }
    if (!this.signals.has(edge.to)) {
      throw new Error(`Edge target signal "${edge.to}" not found`);
    }
    this.edges.push(edge);
  }

  /**
   * Get a signal by name
   * @param {string} name
   * @returns {Signal|undefined}
   */
  getSignal(name) {
    return this.signals.get(name);
  }

  /**
   * Get all edges targeting a specific signal
   * @param {string} signalName
   * @returns {Edge[]}
   */
  getIncomingEdges(signalName) {
    return this.edges.filter(e => e.to === signalName);
  }

  /**
   * Get all edges originating from a specific signal
   * @param {string} signalName
   * @returns {Edge[]}
   */
  getOutgoingEdges(signalName) {
    return this.edges.filter(e => e.from === signalName);
  }

  /**
   * Advance the graph by one timestep
   * 
   * Update rule:
   * 1. For each non-observed signal, compute incoming contributions
   * 2. Apply all updates simultaneously
   * 
   * @param {number} [t] - Target timestep (defaults to currentTime + 1)
   * @returns {Object} - Map of signal names to their new values
   */
  step(t = null) {
    if (t === null) {
      t = this.currentTime + 1;
    }

    const updates = {};

    // Compute new values for all non-observed signals
    for (const [name, signal] of this.signals) {
      // Skip observed signals - they get their values from external data
      if (signal.observed) {
        const existingValue = signal.getValue(t);
        if (existingValue !== null) {
          updates[name] = existingValue;
        }
        continue;
      }

      // Get all incoming edges
      const incomingEdges = this.getIncomingEdges(name);
      
      if (incomingEdges.length === 0) {
        // No incoming edges - signal stays at previous value or 0
        const prevValue = signal.getValue(t - 1);
        updates[name] = prevValue !== null ? prevValue : 0;
        continue;
      }

      // Sum contributions from all incoming edges
      let sum = 0;
      let validContributions = 0;

      for (const edge of incomingEdges) {
        const sourceSignal = this.signals.get(edge.from);
        const contribution = edge.computeContribution(sourceSignal, t);
        
        if (contribution !== null) {
          sum += contribution;
          validContributions++;
        }
      }

      // Only update if we have at least one valid contribution
      if (validContributions > 0) {
        updates[name] = sum;
      } else {
        // Fall back to previous value
        const prevValue = signal.getValue(t - 1);
        updates[name] = prevValue !== null ? prevValue : 0;
      }
    }

    // Apply all updates simultaneously
    for (const [name, value] of Object.entries(updates)) {
      const signal = this.signals.get(name);
      signal.setValue(t, value);
    }

    this.currentTime = t;
    return updates;
  }

  /**
   * Run simulation for multiple timesteps
   * @param {number} startT - Starting timestep
   * @param {number} endT - Ending timestep (inclusive)
   * @returns {Array<Object>} - Array of updates for each timestep
   */
  simulate(startT, endT) {
    const results = [];
    
    for (let t = startT; t <= endT; t++) {
      const updates = this.step(t);
      results.push({ t, values: updates });
    }

    return results;
  }

  /**
   * Reset all signals and time
   */
  reset() {
    for (const signal of this.signals.values()) {
      signal.reset();
    }
    this.currentTime = 0;
  }

  /**
   * Get current state of all signals
   * @returns {Object}
   */
  getState() {
    const state = {};
    for (const [name, signal] of this.signals) {
      state[name] = {
        value: signal.currentValue,
        observed: signal.observed,
        history: signal.getHistoryArray()
      };
    }
    return state;
  }

  /**
   * Export graph structure (for visualization)
   * @returns {Object}
   */
  toJSON() {
    return {
      signals: Array.from(this.signals.values()).map(s => ({
        name: s.name,
        observed: s.observed,
        description: s.description,
        currentValue: s.currentValue
      })),
      edges: this.edges.map(e => ({
        from: e.from,
        to: e.to,
        weight: e.weight,
        transform: e.transformName,
        delay: e.delay,
        description: e.description
      }))
    };
  }
}
