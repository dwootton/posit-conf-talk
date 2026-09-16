import * as d3 from "https://esm.sh/d3@7";

export const PriceLegend = ({ filterPrice, setFilterPrice, React }) => {
  return (
    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, zIndex: 5 }}>
      {[1, 2, 3].map(level => {
        const isActive = filterPrice === level;
        return (
          <div
            key={level}
            onClick={() => setFilterPrice(isActive ? null : level)}
            style={{
              cursor: 'pointer',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              padding: '2px 8px',
              background: isActive ? '#f97316' : '#f7f0e6',
              color: isActive ? '#fff' : '#1a1a1a',
              border: '2px solid #1a1a1a',
              boxShadow: isActive ? 'none' : '2px 2px 0px #1a1a1a',
              transform: isActive ? 'translate(2px, 2px)' : 'none',
              transition: 'all 0.1s',
              userSelect: 'none',
              fontWeight: 'bold'
            }}
          >
            {'$'.repeat(level)}
          </div>
        );
      })}
    </div>
  );
};

export const HoverTooltip = ({ data, pointer, width, height, React }) => {
  if (!data) return null;
  const ttWidth = 160;
  const ttHeight = 64;
  
  // Ensure tooltip stays within widget bounds
  const x = pointer.x + 12 > width - ttWidth ? pointer.x - ttWidth - 4 : pointer.x + 12;
  const y = pointer.y + 12 > height - ttHeight ? pointer.y - ttHeight - 4 : pointer.y + 12;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        background: '#f7f0e6',
        border: '2px solid #1a1a1a',
        padding: '8px',
        pointerEvents: 'none',
        boxShadow: '4px 4px 0px #1a1a1a',
        width: ttWidth,
        zIndex: 10,
        boxSizing: 'border-box'
      }}
    >
      <div style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 6,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {data.name}
      </div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#1a1a1a', display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span>RATING</span>
        <span style={{ fontWeight: 'bold' }}>{data.rating.toFixed(1)}</span>
      </div>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#1a1a1a', display: 'flex', justifyContent: 'space-between' }}>
        <span>REVIEWS</span>
        <span style={{ fontWeight: 'bold' }}>{data.review_count}</span>
      </div>
    </div>
  );
};

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(model.get("data") || []);
  const [hoveredId, setHoveredId] = React.useState(null);
  const [filterPrice, setFilterPrice] = React.useState(null);
  const [pointer, setPointer] = React.useState({ x: 0, y: 0 });
  const svgRef = React.useRef(null);

  React.useEffect(() => {
    const handler = () => setData(model.get("data") || []);
    model.on("change:data", handler);
    return () => model.off("change:data", handler);
  }, [model]);

  const width = 352;
  const height = 400;
  const margin = { top: 24, right: 24, bottom: 32, left: 36 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xDomain = React.useMemo(() => {
    const extent = d3.extent(data, d => d.review_count);
    return extent[0] ? extent : [100, 2000];
  }, [data]);

  const xScale = React.useMemo(() => d3.scaleLog().domain(xDomain).range([0, innerW]).nice(), [xDomain, innerW]);
  const yScale = React.useMemo(() => d3.scaleLinear().domain([3.8, 5.0]).range([innerH, 0]), [innerH]);

  const handlePointerMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPointer({ x, y });

    const chartX = x - margin.left;
    const chartY = y - margin.top;

    let closest = null;
    let minD = 12;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (filterPrice && d.price_level !== filterPrice) continue;
      const px = xScale(d.review_count);
      const py = yScale(d.rating);
      const dist = Math.hypot(px - chartX, py - chartY);
      if (dist < minD) {
        minD = dist;
        closest = d.shop_id;
      }
    }
    setHoveredId(closest);
  };

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      if (a.shop_id === hoveredId) return 1;
      if (b.shop_id === hoveredId) return -1;
      return 0;
    });
  }, [data, hoveredId]);

  // Filter log scale ticks to prevent crowding
  const xTicks = xScale.ticks().filter(t => {
    const s = t.toString();
    return s.startsWith('1') || s.startsWith('5');
  });
  const yTicks = yScale.ticks(6);

  const hoveredData = React.useMemo(() => data.find(d => d.shop_id === hoveredId), [data, hoveredId]);

  return (
    <div
      style={{
        width,
        height,
        background: '#f2f0e9',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <PriceLegend filterPrice={filterPrice} setFilterPrice={setFilterPrice} React={React} />

      <svg
        ref={svgRef}
        width={width}
        height={height}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredId(null)}
        style={{ position: 'absolute', top: 0, left: 0, touchAction: 'none' }}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {yTicks.map(t => (
            <g key={t} transform={`translate(0,${yScale(t)})`}>
              <line x2={-5} stroke="#1a1a1a" strokeWidth={2} />
              <text
                x={-8}
                y={4}
                textAnchor="end"
                fill="#1a1a1a"
                fontFamily='"JetBrains Mono", monospace'
                fontSize={10}
              >
                {t.toFixed(1)}
              </text>
              <line x1={0} x2={innerW} stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 4" opacity={0.4} />
            </g>
          ))}
          <line x1={0} x2={0} y1={0} y2={innerH} stroke="#1a1a1a" strokeWidth={2} />
          <text
            x={8}
            y={12}
            textAnchor="start"
            fill="#1a1a1a"
            fontFamily='"JetBrains Mono", monospace'
            fontSize={10}
            fontWeight="bold"
          >
            RATING
          </text>

          {xTicks.map(t => (
            <g key={t} transform={`translate(${xScale(t)},${innerH})`}>
              <line y2={5} stroke="#1a1a1a" strokeWidth={2} />
              <text
                y={16}
                textAnchor="middle"
                fill="#1a1a1a"
                fontFamily='"JetBrains Mono", monospace'
                fontSize={10}
              >
                {d3.format("~s")(t)}
              </text>
            </g>
          ))}
          <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="#1a1a1a" strokeWidth={2} />
          <text
            x={innerW}
            y={innerH - 8}
            textAnchor="end"
            fill="#1a1a1a"
            fontFamily='"JetBrains Mono", monospace'
            fontSize={10}
            fontWeight="bold"
          >
            REVIEWS
          </text>

          {sortedData.map(d => {
            const isHovered = d.shop_id === hoveredId;
            const isFilteredOut = filterPrice && d.price_level !== filterPrice;
            if (isFilteredOut) return null;

            return (
              <circle
                key={d.shop_id}
                cx={xScale(d.review_count)}
                cy={yScale(d.rating)}
                r={5}
                fill={isHovered ? '#f97316' : '#6b7280'}
                fillOpacity={isHovered ? 1 : 0.8}
                stroke="#1a1a1a"
                strokeWidth={1}
                style={{ transition: 'fill 0.1s, fill-opacity 0.1s' }}
              />
            );
          })}
        </g>
      </svg>

      <HoverTooltip data={hoveredData} pointer={pointer} width={width} height={height} React={React} />
    </div>
  );
}