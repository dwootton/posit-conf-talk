import * as d3 from "https://esm.sh/d3@7";

export const Tooltip = ({ hoverState }) => {
  if (!hoverState) return null;
  const { shop, x, y } = hoverState;

  const tooltipW = 210;
  const tooltipH = 100;
  let left = x + 15;
  let top = y + 15;

  if (left + tooltipW > 352) left = x - tooltipW - 15;
  if (top + tooltipH > 400) top = y - tooltipH - 15;

  return (
    <div style={{
      position: 'absolute',
      left,
      top,
      background: '#f7f0e6',
      border: '1px solid #1a1a1a',
      boxShadow: '3px 3px 0px rgba(26,26,26,1)',
      padding: '10px',
      pointerEvents: 'none',
      zIndex: 10,
      width: tooltipW,
      boxSizing: 'border-box'
    }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {shop.name}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', color: '#1a1a1a', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.6 }}>AREA</span>
          <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{shop.neighborhood}</span>
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

  const filteredData = useMemo(() => {
    return data.filter(d => d.review_count <= 3000);
  }, [data]);

  const topNeighborhoods = useMemo(() => {
    const counts = d3.rollup(filteredData, v => v.length, d => d.neighborhood);
    return Array.from(counts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(d => d.name);
  }, [filteredData]);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [hoverState, setHoverState] = useState(null);
  
  const svgRef = useRef(null);
  const rectRef = useRef(null);

  const width = 352;
  const chartH = 400;
  
  const margin = { top: 20, right: 25, bottom: 60, left: 50 };
  const innerW = width - margin.left - margin.right;
  const innerH = chartH - margin.top - margin.bottom;

  const xScale = useMemo(() => {
    const maxRev = d3.max(filteredData, d => d.review_count) || 0;
    const pad = maxRev > 0 ? (maxRev / innerW) * 15 : 0;
    return d3.scaleLinear().domain([0, maxRev + pad]).nice().range([0, innerW]);
  }, [filteredData, innerW]);

  const yScale = useMemo(() => {
    const minWait = d3.min(filteredData, d => d.weekend_wait_min) || 0;
    const maxWait = d3.max(filteredData, d => d.weekend_wait_min) || 0;
    const rangeWait = maxWait - minWait || maxWait || 1;
    const pad = (rangeWait / innerH) * 15;
    return d3.scaleLinear()
      .domain([Math.max(0, minWait - pad), maxWait + pad])
      .nice()
      .range([innerH, 0]);
  }, [filteredData, innerH]);

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
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dataX = x - margin.left;
    const dataY = y - margin.top;

    let closest = null;
    let minDist = 15;
    
    for (const d of filteredData) {
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
    if (!selectedGroup) return "#6b7280";
    if (selectedGroup === "price_1") return Number(d.price_level) === 1 ? "#0f766e" : "#cbd5e1";
    if (selectedGroup === "price_2") return Number(d.price_level) === 2 ? "#0f766e" : "#cbd5e1";
    if (selectedGroup === "price_3") return Number(d.price_level) === 3 ? "#0f766e" : "#cbd5e1";
    if (selectedGroup.startsWith("nb_")) {
      return d.neighborhood === selectedGroup.slice(3) ? "#0f766e" : "#cbd5e1";
    }
    return "#cbd5e1";
  };

  const xTicks = xScale.ticks(4);
  const yTicks = yScale.ticks(4);

  return (
    <div style={{ width, background: '#f2f0e9', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ width, height: chartH, position: 'relative' }}>
        <svg
          ref={svgRef}
          width={width}
          height={chartH}
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
                <text y={20} textAnchor="middle" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fill: '#1a1a1a' }}>
                  {tick}
                </text>
              </g>
            ))}
            
            {/* Y Axis */}
            <line x1={0} y1={0} x2={0} y2={innerH} stroke="#1a1a1a" strokeWidth={1} />
            {yTicks.map(tick => (
              <g key={tick} transform={`translate(0,${yScale(tick)})`}>
                <line x1={-5} stroke="#1a1a1a" strokeWidth={1} />
                <text x={-8} y={5} textAnchor="end" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fill: '#1a1a1a' }}>
                  {tick}
                </text>
              </g>
            ))}
            
            {/* Axis Titles */}
            <text x={innerW} y={innerH + 45} textAnchor="end" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', fill: '#1a1a1a' }}>
              REVIEWS
            </text>
            <text transform="rotate(-90)" x={0} y={-38} textAnchor="end" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', fill: '#1a1a1a' }}>
              WEEKEND WAIT / MIN
            </text>

            {/* Scatter Marks */}
            {filteredData.map(d => (
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

      <div style={{ padding: '0 15px 20px 15px', width: '100%', boxSizing: 'border-box' }}>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          style={{
            width: '100%',
            display: 'block',
            borderRadius: 0,
            border: '2px solid #1a1a1a',
            background: '#fbfaf6',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '15px',
            padding: '8px',
            color: '#1a1a1a',
            outline: 'none',
            cursor: 'pointer',
            boxSizing: 'border-box'
          }}
        >
          <option value="">Highlight a group...</option>
          <option value="price_1">$ shops</option>
          <option value="price_2">$$ shops</option>
          <option value="price_3">$$$ shops</option>
          {topNeighborhoods.map(nb => (
            <option key={nb} value={`nb_${nb}`}>{nb}</option>
          ))}
        </select>
      </div>
    </div>
  );
}