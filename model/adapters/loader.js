/**
 * Model Loader - Loads YAML model definitions and creates Graph instances
 */

import { Signal, Edge, Graph } from '../kernel/index.js';

/**
 * Parse YAML model definition and create a Graph
 * @param {Object} modelDef - Parsed YAML/JSON model definition
 * @returns {Graph}
 */
export function createGraphFromDefinition(modelDef) {
  const graph = new Graph();

  // Create signals
  for (const [name, config] of Object.entries(modelDef.signals || {})) {
    const signal = new Signal({
      name,
      observed: config.observed || false,
      description: config.description || '',
      min: config.min ?? null,
      max: config.max ?? null
    });
    graph.addSignal(signal);
  }

  // Create edges
  for (const edgeDef of modelDef.edges || []) {
    const edge = new Edge({
      from: edgeDef.from,
      to: edgeDef.to,
      weight: edgeDef.weight,
      transform: edgeDef.transform || 'linear',
      delay: edgeDef.delay || 0,
      description: edgeDef.description || ''
    });
    graph.addEdge(edge);
  }

  // Store metadata on graph
  graph.metadata = modelDef.metadata || {};

  return graph;
}

/**
 * Load model from YAML file (browser)
 * @param {string} url - URL to YAML file
 * @returns {Promise<Graph>}
 */
export async function loadModelFromUrl(url) {
  const response = await fetch(url);
  const yamlText = await response.text();
  
  // Use js-yaml if available, otherwise expect JSON
  if (typeof jsyaml !== 'undefined') {
    const modelDef = jsyaml.load(yamlText);
    return createGraphFromDefinition(modelDef);
  } else {
    // Fallback: assume JSON
    const modelDef = JSON.parse(yamlText);
    return createGraphFromDefinition(modelDef);
  }
}
