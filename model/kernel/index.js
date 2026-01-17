/**
 * Economic Signal Graph - Kernel
 * 
 * This is the core computation engine (~250 lines total).
 * It knows nothing about data sources, learning, or visualization.
 */

// v2 - added getValueInterpolated to Signal
export { Signal } from './signal.js?v=2';
export { Edge, transforms } from './edge.js?v=2';
export { Graph } from './graph.js?v=2';
export { ModelFit, calculateSignalMetrics, mse, mae, correlation, findBestLag } from './model-fit.js?v=2';
