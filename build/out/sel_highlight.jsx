import * as d3 from "https://esm.sh/d3@7";

export const Sidebar = ({ neighborhoods, selected, onSelect }) => (
  <div style={{ width: 90, display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: 15, paddingLeft: 8, paddingRight: 8, flexShrink: 0 }}>
    {neighborhoods.map(nb => (
      <div
        key={nb}
        onClick={() => onSelect(nb === selected ? null : nb)}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          padding: '4px 6px',
          cursor: 'pointer',
          borderLeft: nb === selected ? '2px solid #1a1a1a' : '2px solid transparent',
          fontWeight: nb === selected ? 'bold' : 'normal',
          color: '#1a1a1a',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.2
        }}
        title={nb}
      >
        {nb}
      </div>
    ))}
  </div>
);

export const Tooltip = ({ hoverState }) => {
  if (!hoverState) return null;
  const { shop, x, y } = hoverState;

  const tooltipW = 140;
  const tooltipH = 70;
  let left = x + 15;
  let top = y + 15;

  // Keep within chart bounds (chart width is 262, height 400)
  if (left + tooltipW > 262) left = x - tooltipW - 15;
  if (top + tooltipH > 400) top = y - tooltipH - 15;

  return (
    <div style={{
      position: 'absolute',
      left,
      top,
      background: '#f7f0e6',
      border: '1px solid #1a1a1a',
      boxShadow: '3px 3px 0px rgba(26,26,26,1)',
      padding: '8px',
      pointerEvents: 'none',
      zIndex: 10,
      width: tooltipW,
      boxSizing: 'border-box'
    }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {shop.name}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#1a1a1a', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.6 }}>AREA</span>
          <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{shop.neighborhood}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.6 }}>REVIEWS</span>
          <span>{shop.review_count}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.6 }}>WAIT</span>
          <span>{shop.weekend_wait_min}m</span>
        </div>
      </div>
    </div>
  );
};

export default function Widget({ model, React }) {
  const { useState, useMemo, useRef, useEffect } = React;
  
  const [data, setData] = useState(model.get("data") || []);
  useEffect(() => {
    const onDataChange = () => setData(model.get("data") || []);
    model.on("change:data", onDataChange);
    return () => model.off("change:data", onDataChange);
  }, [model]);

  const topNeighborhoods = useMemo(() => {
    const counts = d3.rollup(data, v => v.length, d => d.neighborhood);
    return Array.from(counts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(d => d.name);
  }, [data]);

  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [hoverState, setHoverState] = useState(null);
  
  const svgRef = useRef(null);
  const rectRef = useRef(null);

  const width = 352;
  const height = 400;
  const sidebarW = 90;
  const chartW = width - sidebarW;
  
  // Increased right and top margins to ensure marks and axes don't clip the SVG boundaries
  const margin = { top: 20, right: 25, bottom: 45, left: 40 };
  const innerW = chartW - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = useMemo(() => {
    const maxRev = d3.max(data, d => d.review_count) || 0;
    // Add ~15px equivalent padding in data units so the rightmost circle + stroke clears the edge
    const pad = maxRev > 0 ? (maxRev / innerW) * 15 : 0;
    return d3.scaleLinear().domain([0, maxRev + pad]).nice().range([0, innerW]);
  }, [data, innerW]);

  const yScale = useMemo(() => {
    const minWait = d3.min(data, d => d.weekend_wait_min) || 0;
    const maxWait = d3.max(data, d => d.weekend_wait_min) || 0;
    const rangeWait = maxWait - minWait || maxWait || 1;
    // Add ~15px equivalent padding for top and bottom circles
    const pad = (rangeWait / innerH) * 15;
    return d3.scaleLinear()
      .domain([Math.max(0, minWait - pad), maxWait + pad])
      .nice()
      .range([innerH, 0]);
  }, [data, innerH]);

  useEffect(() => {
    const updateRect = () => {
      if (svgRef.current) {
        rectRef.current = svgRef.current.getBoundingClientRect();
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, []);

  const handlePointerMove = (e) => {
    if (!rectRef.current) return;
    const rect = rectRef.current;
    
    // Compute raw offset from SVG container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to data coordinate space
    const dataX = x - margin.left;
    const dataY = y - margin.top;

    let closest = null;
    let minDist = 15; // Hover snap distance
    
    for (const d of data) {
      const cx = xScale(d.review_count);
      const cy = yScale(d.weekend_wait_min);
      const dist = Math.sqrt((cx - dataX) ** 2 + (cy - dataY) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closest = d;
      }
    }

    if (closest) {
      setHoverState({ shop: closest, x, y });
    } else {
      setHoverState(null);
    }
  };

  const getFill = (d) => {
    if (!selectedNeighborhood) return "#6b7280";
    return d.neighborhood === selectedNeighborhood ? "#0f766e" : "#cbd5e1";
  };

  const xTicks = xScale.ticks(4);
  const yTicks = yScale.ticks(5);

  return (
    <div style={{ width, height, background: '#f2f0e9', display: 'flex', margin: 0, padding: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
      <Sidebar
        neighborhoods={topNeighborhoods}
        selected={selectedNeighborhood}
        onSelect={setSelectedNeighborhood}
      />
      
      <div style={{ width: chartW, height, position: 'relative' }}>
        <svg
          ref={svgRef}
          width={chartW}
          height={height}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverState(null)}
          style={{ display: 'block', touchAction: 'none' }}
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            
            {/* X Axis */}
            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#1a1a1a" strokeWidth={1} />
            {xTicks.map(tick => (
              <g key={tick} transform={`translate(${xScale(tick)},${innerH})`}>
                <line y2={5} stroke="#1a1a1a" strokeWidth={1} />
                <text y={15} textAnchor="middle" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fill: '#1a1a1a' }}>
                  {tick}
                </text>
              </g>
            ))}
            
            {/* Y Axis */}
            <line x1={0} y1={0} x2={0} y2={innerH} stroke="#1a1a1a" strokeWidth={1} />
            {yTicks.map(tick => (
              <g key={tick} transform={`translate(0,${yScale(tick)})`}>
                <line x1={-5} stroke="#1a1a1a" strokeWidth={1} />
                <text x={-8} y={3} textAnchor="end" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fill: '#1a1a1a' }}>
                  {tick}
                </text>
              </g>
            ))}
            
            {/* Axis Titles */}
            <text x={innerW} y={innerH + 30} textAnchor="end" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fill: '#1a1a1a' }}>
              REVIEWS
            </text>
            <text transform="rotate(-90)" x={0} y={-25} textAnchor="end" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fill: '#1a1a1a' }}>
              WEEKEND WAIT / MIN
            </text>

            {/* Scatter Marks */}
            {data.map(d => (
              <circle
                key={d.shop_id}
                cx={xScale(d.review_count)}
                cy={yScale(d.weekend_wait_min)}
                r={5}
                fill={getFill(d)}
                fillOpacity={0.75}
                stroke="#1a1a1a"
                strokeWidth={1}
                style={{ transition: 'fill 200ms ease' }}
              />
            ))}
          </g>
        </svg>
        
        <Tooltip hoverState={hoverState} />
      </div>
    </div>
  );
}