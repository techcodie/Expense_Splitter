import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { formatCurrency } from '../utils/money';

/**
 * DebtGraph — D3 force-directed graph for visualizing debts.
 *
 * Props:
 *   nodes      – group members array (objects with _id and name)
 *   edges      – debt edges [{ from, to, fromName, toName, amount }]
 *   colorTheme – 'orange' (before simplification) or 'green' (after)
 *   title      – graph card title
 */
const COLORS = {
  orange: {
    stroke: '#f97316',
    strokeLight: 'rgba(249, 115, 22, 0.25)',
    fill: '#fb923c',
    arrow: '#f97316',
    glow: 'rgba(249, 115, 22, 0.12)',
  },
  green: {
    stroke: '#22c55e',
    strokeLight: 'rgba(34, 197, 94, 0.25)',
    fill: '#4ade80',
    arrow: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.12)',
  },
};

export default function DebtGraph({ nodes: memberNodes, edges, colorTheme = 'orange', title }) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const theme = COLORS[colorTheme] || COLORS.orange;

  const draw = useCallback(() => {
    if (!svgRef.current) return;

    // ── Cleanup previous simulation ──
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 500;
    const height = 360;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // ── Empty state ──
    if (!edges || edges.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2 - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#4b5563')
        .attr('font-size', '32px')
        .text('✓');
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 20)
        .attr('text-anchor', 'middle')
        .attr('fill', '#6b7280')
        .attr('font-size', '13px')
        .text('No debts');
      return;
    }

    // ── Build nodes from edges ──
    const nodeIds = new Set();
    edges.forEach((e) => { nodeIds.add(e.from); nodeIds.add(e.to); });

    const nodes = Array.from(nodeIds).map((id) => {
      const m = memberNodes?.find((mem) => mem._id === id || mem.userId === id);
      return { id, name: m?.name || id.slice(-4) };
    });

    // ── Edge thickness scaling ──
    // strokeWidth = 2 + (amount / maxAmount) * 8
    const maxAmount = Math.max(...edges.map((e) => e.amount), 1);

    const links = edges.map((e) => ({
      source: e.from,
      target: e.to,
      amount: e.amount,
      thickness: 2 + (e.amount / maxAmount) * 8,
    }));

    // ── Force simulation ──
    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(160))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(45))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    simulationRef.current = simulation;

    // ── Defs: arrow marker + glow filter ──
    const defs = svg.append('defs');

    // Glow filter for edges
    const filter = defs.append('filter')
      .attr('id', `glow-${colorTheme}`)
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    filter.append('feMerge')
      .selectAll('feMergeNode')
      .data(['blur', 'SourceGraphic'])
      .join('feMergeNode')
      .attr('in', (d) => d);

    // Arrow marker
    defs.append('marker')
      .attr('id', `arrow-${colorTheme}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 30)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', theme.arrow);

    // ── Links (edges) ──
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', theme.strokeLight)
      .attr('stroke-width', (d) => d.thickness)
      .attr('stroke-linecap', 'round')
      .attr('marker-end', `url(#arrow-${colorTheme})`)
      .attr('filter', `url(#glow-${colorTheme})`);

    // ── Link amount labels ──
    const linkLabel = svg.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', theme.fill)
      .attr('text-anchor', 'middle')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#111827')
      .attr('stroke-width', '3px')
      .text((d) => formatCurrency(d.amount));

    // ── Nodes ──
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      )
      .style('cursor', 'grab');

    // Node glow circle
    node.append('circle')
      .attr('r', 26)
      .attr('fill', theme.glow)
      .attr('stroke', 'none');

    // Node main circle
    node.append('circle')
      .attr('r', 22)
      .attr('fill', '#1f2937')
      .attr('stroke', theme.stroke)
      .attr('stroke-width', 2.5);

    // Node label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text((d) => {
        const first = d.name.split(' ')[0];
        return first.length > 8 ? first.slice(0, 7) + '…' : first;
      });

    // ── Tick handler ──
    simulation.on('tick', () => {
      // Clamp nodes within bounds
      nodes.forEach((d) => {
        d.x = Math.max(30, Math.min(width - 30, d.x));
        d.y = Math.max(30, Math.min(height - 30, d.y));
      });

      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      linkLabel
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2 - 12);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });
  }, [edges, memberNodes, colorTheme, theme, title]);

  // ── Draw on mount / data change ──
  useEffect(() => {
    draw();

    // Cleanup: stop simulation on unmount
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [draw]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full"
          style={{ backgroundColor: theme.glow, color: theme.fill }}>
          {edges.length} edge{edges.length !== 1 ? 's' : ''}
        </span>
      </div>
      <svg ref={svgRef} className="w-full rounded-lg" style={{ height: 360, background: '#0d1117' }} />
    </div>
  );
}
