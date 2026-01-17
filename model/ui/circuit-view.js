/**
 * Circuit View - SVG-based visualization of the signal graph
 * 
 * Click nodes to see time series charts
 * Click edges to edit weight/transform/delay
 */

export class CircuitView {
  /**
   * @param {HTMLElement} container
   * @param {Graph} graph
   * @param {Object} callbacks - { onNodeSelect, onEdgeSelect }
   */
  constructor(container, graph, callbacks = {}) {
    this.container = container;
    this.graph = graph;
    this.callbacks = callbacks;
    this.width = container.clientWidth || 800;
    this.height = container.clientHeight || 350;
    
    this.nodePositions = new Map();
    this.selectedNode = null;
    this.selectedEdge = null;
    
    // Pan/zoom state
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    // Node dragging state
    this.isDraggingNode = false;
    this.draggedNodeName = null;
    
    // Expose export/import functions globally for console access
    window.exportNodePositions = () => this.exportPositions();
    window.importNodePositions = (positions) => this.importPositions(positions);
    window.resetNodeLayout = () => this.resetLayout();
    
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.cursor = 'grab';
    this.container.appendChild(this.svg);
    
    // Main group for pan/zoom transforms
    this.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.mainGroup);
    
    this.edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.mainGroup.appendChild(this.edgeGroup);
    this.mainGroup.appendChild(this.nodeGroup);
    this.mainGroup.appendChild(this.labelGroup);
    
    // Pan handlers (panning only on background)
    this.svg.addEventListener('mousedown', (e) => {
      if (e.target === this.svg) {
        this.isPanning = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.svg.style.cursor = 'grabbing';
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      // Node dragging takes priority
      if (this.isDraggingNode && this.draggedNodeName) {
        const rect = this.svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        // Convert to graph coordinates
        const graphX = (mouseX - this.panX) / this.zoom;
        const graphY = (mouseY - this.panY) / this.zoom;
        
        const pos = this.nodePositions.get(this.draggedNodeName);
        if (pos) {
          pos.x = graphX;
          pos.y = graphY;
          pos.pinned = true; // Mark as manually positioned
          this.render();
        }
        return;
      }
      
      if (!this.isPanning) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.panX += dx;
      this.panY += dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateTransform();
    });
    
    document.addEventListener('mouseup', () => {
      if (this.isDraggingNode) {
        this.isDraggingNode = false;
        this.draggedNodeName = null;
        this.svg.style.cursor = 'grab';
      }
      if (this.isPanning) {
        this.isPanning = false;
        this.svg.style.cursor = 'grab';
      }
    });
    
    // Zoom with wheel
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(3, this.zoom * delta));
      
      // Zoom towards mouse position
      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;
      this.updateTransform();
    });
    
    // Click on background to deselect
    this.svg.addEventListener('click', (e) => {
      if (e.target === this.svg) {
        this.selectedNode = null;
        this.selectedEdge = null;
        this.render();
        if (this.callbacks.onDeselect) this.callbacks.onDeselect();
      }
    });
    
    this.computeLayout();
    this.render();
    this.updateTransform();
  }

  /**
   * Simple force-directed graph layout
   * - Grid-based initial placement to avoid clustering
   * - Nodes repel each other
   * - Edges act as springs
   */
  computeLayout() {
    const signals = Array.from(this.graph.signals.values());
    const nodeCount = signals.length;
    
    // Canvas dimensions
    const canvasWidth = Math.max(this.width, 1200);
    const canvasHeight = Math.max(this.height, 900);
    const padding = 80;
    
    // Grid-based initial placement (avoids random clustering)
    const cols = Math.ceil(Math.sqrt(nodeCount * 1.5));
    const rows = Math.ceil(nodeCount / cols);
    const cellW = (canvasWidth - 2 * padding) / cols;
    const cellH = (canvasHeight - 2 * padding) / rows;
    
    signals.forEach((signal, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.nodePositions.set(signal.name, {
        x: padding + col * cellW + cellW / 2 + (Math.random() - 0.5) * cellW * 0.3,
        y: padding + row * cellH + cellH / 2 + (Math.random() - 0.5) * cellH * 0.3,
        vx: 0,
        vy: 0,
        signal
      });
    });
    
    // Force simulation parameters
    const repulsionStrength = 20000;
    const springStrength = 0.015;
    const springLength = 200;
    const damping = 0.9;
    const iterations = 300;
    
    // Run simulation
    for (let iter = 0; iter < iterations; iter++) {
      // Temperature decreases over time (simulated annealing)
      const temp = 1 - iter / iterations;
      
      // Calculate forces for each node
      for (const [name, node] of this.nodePositions) {
        let fx = 0, fy = 0;
        
        // Repulsion from all other nodes (Coulomb's law)
        for (const [otherName, other] of this.nodePositions) {
          if (name === otherName) continue;
          
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsionStrength / (dist * dist);
          
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
        
        // Spring forces from connected edges (Hooke's law)
        for (const edge of this.graph.edges) {
          let other = null;
          if (edge.from === name) other = this.nodePositions.get(edge.to);
          else if (edge.to === name) other = this.nodePositions.get(edge.from);
          
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const displacement = dist - springLength;
            const force = springStrength * displacement;
            
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        }
        
        // Update velocity with damping
        node.vx = (node.vx + fx) * damping * temp;
        node.vy = (node.vy + fy) * damping * temp;
      }
      
      // Update positions
      for (const [name, node] of this.nodePositions) {
        node.x += node.vx;
        node.y += node.vy;
        
        // Keep within bounds
        node.x = Math.max(padding, Math.min(canvasWidth - padding, node.x));
        node.y = Math.max(padding, Math.min(canvasHeight - padding, node.y));
      }
    }
    
    // Center the view on the final layout
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [, node] of this.nodePositions) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }
    
    const graphWidth = maxX - minX + 2 * padding;
    const graphHeight = maxY - minY + 2 * padding;
    
    // Set initial zoom to fit the graph
    this.zoom = Math.min(1, this.width / graphWidth, this.height / graphHeight) * 0.9;
    this.panX = (this.width - graphWidth * this.zoom) / 2 - minX * this.zoom + padding * this.zoom;
    this.panY = (this.height - graphHeight * this.zoom) / 2 - minY * this.zoom + padding * this.zoom;
  }

  render() {
    this.edgeGroup.innerHTML = '';
    this.nodeGroup.innerHTML = '';
    this.labelGroup.innerHTML = '';
    
    this.ensureArrowMarkers();
    
    this.graph.edges.forEach((edge, index) => {
      this.renderEdge(edge, index);
    });
    
    for (const [name, pos] of this.nodePositions) {
      this.renderNode(pos);
    }
  }

  renderEdge(edge, index) {
    const fromPos = this.nodePositions.get(edge.from);
    const toPos = this.nodePositions.get(edge.to);
    if (!fromPos || !toPos) return;
    
    const nodeRadius = 35;
    const isSelected = this.selectedEdge === index;
    
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;
    
    const x1 = fromPos.x + nx * nodeRadius;
    const y1 = fromPos.y + ny * nodeRadius;
    const x2 = toPos.x - nx * (nodeRadius + 10);
    const y2 = toPos.y - ny * (nodeRadius + 10);
    
    const color = edge.weight >= 0 ? '#22c55e' : '#ef4444';
    // Thin uniform stroke width for cleaner look
    const strokeWidth = 2;
    
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.style.cursor = 'pointer';
    group.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectEdge(index);
    });
    
    // Always use straight lines for cleaner schematic look
    const pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
    
    // Hit area
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitArea.setAttribute('d', pathD);
    hitArea.setAttribute('stroke', 'transparent');
    hitArea.setAttribute('stroke-width', '20');
    hitArea.setAttribute('fill', 'none');
    group.appendChild(hitArea);
    
    // Visible path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('stroke', isSelected ? '#fbbf24' : color);
    path.setAttribute('stroke-width', isSelected ? '3' : strokeWidth);
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', isSelected ? '1' : '0.8');
    path.setAttribute('marker-end', `url(#arrow-${isSelected ? 'selected' : (edge.weight >= 0 ? 'positive' : 'negative')})`);
    group.appendChild(path);
    
    // Label - only show on hover or if selected (to reduce clutter)
    if (isSelected) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const perpX = -ny * 15;
      const perpY = nx * 15;
      
      const labelText = `w=${edge.weight.toFixed(2)}`;
      const labelWidth = 60;
    
      const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      labelBg.setAttribute('x', midX + perpX - labelWidth / 2);
      labelBg.setAttribute('y', midY + perpY - 12);
      labelBg.setAttribute('width', labelWidth);
      labelBg.setAttribute('height', 24);
      labelBg.setAttribute('rx', 4);
      labelBg.setAttribute('fill', '#fbbf24');
      labelBg.setAttribute('stroke', '#fbbf24');
      group.appendChild(labelBg);
      
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', midX + perpX);
      label.setAttribute('y', midY + perpY + 5);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#1e293b');
      label.setAttribute('font-size', '12');
      label.setAttribute('font-family', 'monospace');
      label.textContent = labelText;
      group.appendChild(label);
      
      // Delay indicator
      if (edge.delay > 0) {
        const delayLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        delayLabel.setAttribute('x', midX + perpX);
        delayLabel.setAttribute('y', midY + perpY + 32);
        delayLabel.setAttribute('text-anchor', 'middle');
        delayLabel.setAttribute('fill', '#94a3b8');
        delayLabel.setAttribute('font-size', '10');
        delayLabel.textContent = `delay: ${edge.delay}mo`;
        group.appendChild(delayLabel);
      }
    }
    
    this.edgeGroup.appendChild(group);
  }

  ensureArrowMarkers() {
    if (this.svg.querySelector('defs')) return;
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const colors = { 'positive': '#22c55e', 'negative': '#ef4444', 'selected': '#fbbf24' };
    
    for (const [name, color] of Object.entries(colors)) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', `arrow-${name}`);
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', '5');
      marker.setAttribute('refY', '5');
      marker.setAttribute('markerWidth', '6');
      marker.setAttribute('markerHeight', '6');
      marker.setAttribute('orient', 'auto-start-reverse');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
      p.setAttribute('fill', color);
      marker.appendChild(p);
      defs.appendChild(marker);
    }
    
    this.svg.insertBefore(defs, this.svg.firstChild);
  }

  renderNode(pos) {
    const { x, y, signal, pinned } = pos;
    const radius = 35;
    const isSelected = this.selectedNode === signal.name;
    
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.style.cursor = 'grab';
    group.dataset.nodeName = signal.name;
    
    // Drag start handler
    group.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.isDraggingNode = true;
      this.draggedNodeName = signal.name;
      this.svg.style.cursor = 'grabbing';
    });
    
    // Click handler (only fires if not dragged)
    group.addEventListener('click', (e) => {
      e.stopPropagation();
      // Only select if we didn't drag
      if (!this.isDraggingNode) {
        this.selectNode(signal.name);
      }
    });
    
    // Pin indicator (small dot) for manually positioned nodes
    if (pinned) {
      const pin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pin.setAttribute('cx', x + radius - 8);
      pin.setAttribute('cy', y - radius + 8);
      pin.setAttribute('r', 5);
      pin.setAttribute('fill', '#f59e0b');
      pin.setAttribute('stroke', '#1e293b');
      pin.setAttribute('stroke-width', '1');
      group.appendChild(pin);
    }
    
    // Glow effect for selected
    if (isSelected) {
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('cx', x);
      glow.setAttribute('cy', y);
      glow.setAttribute('r', radius + 6);
      glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', '#fbbf24');
      glow.setAttribute('stroke-width', '3');
      glow.setAttribute('opacity', '0.5');
      group.appendChild(glow);
    }
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', signal.observed ? '#1e3a5f' : '#1e293b');
    circle.setAttribute('stroke', isSelected ? '#fbbf24' : (signal.observed ? '#3b82f6' : '#22c55e'));
    circle.setAttribute('stroke-width', isSelected ? '3' : '2');
    group.appendChild(circle);
    
    // Name - truncate long names
    const displayName = signal.name.length > 15 
      ? signal.name.replace(/_/g, ' ').slice(0, 12) + '...'
      : signal.name.replace(/_/g, ' ');
    const lines = displayName.split(' ').reduce((acc, word) => {
      const lastLine = acc[acc.length - 1];
      if (lastLine && lastLine.length + word.length < 10) {
        acc[acc.length - 1] = lastLine + ' ' + word;
      } else {
        acc.push(word);
      }
      return acc;
    }, []);
    
    lines.forEach((line, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', y + (i - (lines.length - 1) / 2) * 12 + 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#f8fafc');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-weight', '500');
      text.textContent = line;
      group.appendChild(text);
    });
    
    this.nodeGroup.appendChild(group);
  }

  selectNode(name) {
    this.selectedNode = name;
    this.selectedEdge = null;
    this.render();
    if (this.callbacks.onNodeSelect) {
      this.callbacks.onNodeSelect(name, this.graph.getSignal(name));
    }
  }

  selectEdge(index) {
    this.selectedEdge = index;
    this.selectedNode = null;
    this.render();
    if (this.callbacks.onEdgeSelect) {
      this.callbacks.onEdgeSelect(index, this.graph.edges[index]);
    }
  }

  deselectAll() {
    this.selectedEdge = null;
    this.selectedNode = null;
    this.render();
  }

  updateTransform() {
    this.mainGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
  }

  resetView() {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
    this.updateTransform();
  }

  update() {
    this.render();
  }

  /**
   * Export node positions to JSON
   * Call from console: exportNodePositions()
   */
  exportPositions() {
    const positions = {};
    for (const [name, pos] of this.nodePositions) {
      positions[name] = {
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        pinned: pos.pinned || false
      };
    }
    
    const json = JSON.stringify(positions, null, 2);
    console.log('Node positions (copy this):');
    console.log(json);
    
    // Also trigger download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'node-positions.json';
    a.click();
    URL.revokeObjectURL(url);
    
    return positions;
  }

  /**
   * Import node positions from JSON object
   * Call from console: importNodePositions({...})
   * @param {Object} positions - { signalName: { x, y, pinned? } }
   */
  importPositions(positions) {
    for (const [name, pos] of Object.entries(positions)) {
      const existing = this.nodePositions.get(name);
      if (existing) {
        existing.x = pos.x;
        existing.y = pos.y;
        existing.pinned = pos.pinned || true;
      }
    }
    this.render();
    console.log(`Imported positions for ${Object.keys(positions).length} nodes`);
  }

  /**
   * Reset all node positions to force-directed layout
   * Call from console: window.circuitView.resetLayout()
   */
  resetLayout() {
    this.computeLayout();
    this.render();
    console.log('Layout reset to force-directed');
  }
}
