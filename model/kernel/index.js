/**
 * Economic Signal Graph - Kernel
 * 
 * This is the core computation engine (~250 lines total).
 * It knows nothing about data sources, learning, or visualization.
 */

export { Signal } from './signal.js';
export { Edge, transforms } from './edge.js';
export { Graph } from './graph.js';
export { ModelFit, calculateSignalMetrics, mse, mae, correlation, findBestLag } from './model-fit.js';
