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
    
    // Pan handlers
    this.svg.addEventListener('mousedown', (e) => {
      if (e.target === this.svg) {
        this.isPanning = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.svg.style.cursor = 'grabbing';
      }
    });
    
    document.addEventListener('mousemove', (e) => {
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

  computeLayout() {
    const signals = Array.from(this.graph.signals.values());
    const observed = signals.filter(s => s.observed);
    const computed = signals.filter(s => !s.observed);
    
    const padding = 70;
    const nodeRadius = 40;
    
    const leftX = padding + nodeRadius;
    const observedSpacing = (this.height - 2 * padding) / Math.max(observed.length, 1);
    observed.forEach((signal, i) => {
      this.nodePositions.set(signal.name, {
        x: leftX,
        y: padding + observedSpacing * (i + 0.5),
        signal
      });
    });
    
    const depths = this.computeDepths();
    const maxDepth = Math.max(...Array.from(depths.values()), 1);
    const colWidth = (this.width - 2 * padding - 2 * nodeRadius) / maxDepth;
    
    const byDepth = new Map();
    for (const signal of computed) {
      const d = depths.get(signal.name) || 1;
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d).push(signal);
    }
    
    for (const [depth, sigs] of byDepth) {
      const x = leftX + colWidth * depth;
      const spacing = (this.height - 2 * padding) / Math.max(sigs.length, 1);
      sigs.forEach((signal, i) => {
        this.nodePositions.set(signal.name, {
          x,
          y: padding + spacing * (i + 0.5),
          signal
        });
      });
    }
  }

  computeDepths() {
    const depths = new Map();
    for (const [name, signal] of this.graph.signals) {
      if (signal.observed) depths.set(name, 0);
    }
    
    let changed = true;
    while (changed) {
      changed = false;
      for (const edge of this.graph.edges) {
        const fromDepth = depths.get(edge.from);
        if (fromDepth !== undefined) {
          const currentDepth = depths.get(edge.to);
          const newDepth = fromDepth + 1;
          if (currentDepth === undefined || newDepth > currentDepth) {
            depths.set(edge.to, newDepth);
            changed = true;
          }
        }
      }
    }
    return depths;
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
    
    const nodeRadius = 40;
    const isSelected = this.selectedEdge === index;
    
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;
    
    const x1 = fromPos.x + nx * nodeRadius;
    const y1 = fromPos.y + ny * nodeRadius;
    const x2 = toPos.x - nx * (nodeRadius + 12);
    const y2 = toPos.y - ny * (nodeRadius + 12);
    
    const color = edge.weight >= 0 ? '#22c55e' : '#ef4444';
    const absWeight = Math.abs(edge.weight);
    const strokeWidth = Math.max(2, Math.min(8, absWeight * 3 + 1));
    
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.style.cursor = 'pointer';
    group.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectEdge(index);
    });
    
    // Hit area
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitArea.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
    hitArea.setAttribute('stroke', 'transparent');
    hitArea.setAttribute('stroke-width', '25');
    hitArea.setAttribute('fill', 'none');
    group.appendChild(hitArea);
    
    // Visible path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
    path.setAttribute('stroke', isSelected ? '#fbbf24' : color);
    path.setAttribute('stroke-width', isSelected ? strokeWidth + 2 : strokeWidth);
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', `url(#arrow-${isSelected ? 'selected' : (edge.weight >= 0 ? 'positive' : 'negative')})`);
    group.appendChild(path);
    
    // Label
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const perpX = -ny * 18;
    const perpY = nx * 18;
    
    const labelText = `w=${edge.weight.toFixed(2)}`;
    const labelWidth = 70;
    
    const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    labelBg.setAttribute('x', midX + perpX - labelWidth / 2);
    labelBg.setAttribute('y', midY + perpY - 12);
    labelBg.setAttribute('width', labelWidth);
    labelBg.setAttribute('height', 24);
    labelBg.setAttribute('rx', 4);
    labelBg.setAttribute('fill', isSelected ? '#fbbf24' : '#1e293b');
    labelBg.setAttribute('stroke', isSelected ? '#fbbf24' : '#475569');
    group.appendChild(labelBg);
    
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', midX + perpX);
    label.setAttribute('y', midY + perpY + 5);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', isSelected ? '#1e293b' : '#e2e8f0');
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
    const { x, y, signal } = pos;
    const radius = 40;
    const isSelected = this.selectedNode === signal.name;
    
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.style.cursor = 'pointer';
    group.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectNode(signal.name);
    });
    
    // Glow effect for selected
    if (isSelected) {
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('cx', x);
      glow.setAttribute('cy', y);
      glow.setAttribute('r', radius + 8);
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
    circle.setAttribute('stroke', isSelected ? '#fbbf24' : (signal.observed ? '#3b82f6' : '#475569'));
    circle.setAttribute('stroke-width', isSelected ? '3' : '2');
    group.appendChild(circle);
    
    // Name
    const lines = signal.name.split('_');
    lines.forEach((line, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', y + (i - (lines.length - 1) / 2) * 14 + 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#f8fafc');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', '500');
      text.textContent = line;
      group.appendChild(text);
    });
    
    this.nodeGroup.appendChild(group);
    
    // Type label below
    const typeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    typeLabel.setAttribute('x', x);
    typeLabel.setAttribute('y', y + radius + 18);
    typeLabel.setAttribute('text-anchor', 'middle');
    typeLabel.setAttribute('fill', signal.observed ? '#3b82f6' : '#64748b');
    typeLabel.setAttribute('font-size', '10');
    typeLabel.textContent = signal.observed ? '● INPUT' : '○ COMPUTED';
    this.labelGroup.appendChild(typeLabel);
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
}
