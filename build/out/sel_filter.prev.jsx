import * as d3 from "https://esm.sh/d3@7";

export default function Widget({ model, React }) {
  const rawData = model.get("data") || [];
  
  const data = React.useMemo(() => {
    return rawData.map(d => ({
      ...d,
      review_count: Number(d.review_count),
      weekend_wait_min: Number(d.weekend_wait_min)
    }));
  }, [rawData]);

  const width = 352;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 45, left: 55 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const [removedIds, setRemovedIds] = React.useState(new Set());
  const [brush, setBrush] = React.useState(null);
  const [tooltip, setTooltip] = React.useState({ visible: false, x: 0, y: 0, data: null });

  const containerRef = React.useRef(null);
  const xAxisRef = React.useRef(null);
  const yAxisRef = React.useRef(null);

  const visibleData = data.filter(d => !removedIds.has(d.shop_id));

  const xMax = d3.max(visibleData, d => d.review_count) || 10;
  const yMax = d3.max(visibleData, d => d.weekend_wait_min) || 10;

  const xScale = d3.scaleLinear().domain([0, xMax]).range([0, innerWidth]);
  const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

  React.useEffect(() => {
    if (!xAxisRef.current || !yAxisRef.current) return;

    const xAxis = d3.axisBottom(xScale).ticks(4).tickSizeOuter(0);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickSizeOuter(0);

    const xGroup = d3.select(xAxisRef.current);
    const yGroup = d3.select(yAxisRef.current);

    xGroup.transition().duration(400).ease(d3.easeCubicOut).call(xAxis);
    yGroup.transition().duration(400).ease(d3.easeCubicOut).call(yAxis);

    const styleAxis = (group) => {
      group.selectAll('.domain').attr('stroke', '#1a1a1a').attr('stroke-width', 1);
      group.selectAll('.tick line').attr('stroke', '#1a1a1a');
      group.selectAll('.tick text')
        .attr('font-family', '"JetBrains Mono", monospace')
        .attr('font-size', '10px')
        .attr('fill', '#1a1a1a');
    };

    styleAxis(xGroup);
    styleAxis(yGroup);
  }, [xMax, yMax, innerWidth, innerHeight]);

  const getPointerCoords = (e) => {
    if (!containerRef.current) return { x: 0, y: 0, rawX: 0, rawY: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    return {
      x: rawX - margin.left,
      y: rawY - margin.top,
      rawX,
      rawY
    };
  };

  const handlePointerDown = (e) => {
    const { x, y } = getPointerCoords(e);
    if (x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight) {
      setBrush({ x1: x, y1: y, x2: x, y2: y, active: true });
      e.target.setPointerCapture(e.pointerId);
      setTooltip({ visible: false, x: 0, y: 0, data: null });
    }
  };

  const handlePointerMove = (e) => {
    if (!brush?.active) return;
    const { x, y } = getPointerCoords(e);
    const cx = Math.max(0, Math.min(x, innerWidth));
    const cy = Math.max(0, Math.min(y, innerHeight));
    setBrush(prev => ({ ...prev, x2: cx, y2: cy }));
  };

  const handlePointerUp = (e) => {
    if (!brush?.active) return;
    e.target.releasePointerCapture(e.pointerId);

    const xMin = Math.min(brush.x1, brush.x2);
    const xMax = Math.max(brush.x1, brush.x2);
    const yMin = Math.min(brush.y1, brush.y2);
    const yMax = Math.max(brush.y1, brush.y2);

    if (xMax > xMin && yMax > yMin) {
      const newlyRemoved = new Set(removedIds);
      visibleData.forEach(d => {
        const cx = xScale(d.review_count);
        const cy = yScale(d.weekend_wait_min);
        if (cx >= xMin && cx <= xMax && cy >= yMin && cy <= yMax) {
          newlyRemoved.add(d.shop_id);
        }
      });
      setRemovedIds(newlyRemoved);
    }
    setBrush(null);
  };

  const handleCircleEnter = (e, d) => {
    if (brush?.active) return;
    const { rawX, rawY } = getPointerCoords(e);
    setTooltip({ visible: true, data: d, x: rawX, y: rawY });
  };

  let tipX = tooltip.x + 12;
  let tipY = tooltip.y + 12;
  if (tipX + 180 > width) tipX = tooltip.x - 192;
  if (tipY + 100 > height) tipY = tooltip.y - 112;

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        background: '#f2f0e9',
        position: 'relative',
        fontFamily: '"Space Grotesk", sans-serif',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      <svg
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ position: 'absolute', top: 0, left: 0, cursor: brush?.active ? 'crosshair' : 'default' }}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          <g ref={xAxisRef} transform={`translate(0,${innerHeight})`} />
          <g ref={yAxisRef} />

          <text
            x={innerWidth / 2}
            y={innerHeight + 32}
            textAnchor="middle"
            fill="#1a1a1a"
            style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 600 }}
          >
            REVIEWS
          </text>
          <text
            transform="rotate(-90)"
            x={-innerHeight / 2}
            y={-38}
            textAnchor="middle"
            fill="#1a1a1a"
            style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 600 }}
          >
            WEEKEND WAIT / MIN
          </text>

          {data.map(d => {
            const isRemoved = removedIds.has(d.shop_id);
            const cx = xScale(d.review_count);
            const cy = yScale(d.weekend_wait_min);

            let isHoveredByBrush = false;
            if (brush?.active && !isRemoved) {
              const xMin = Math.min(brush.x1, brush.x2);
              const xMax = Math.max(brush.x1, brush.x2);
              const yMin = Math.min(brush.y1, brush.y2);
              const yMax = Math.max(brush.y1, brush.y2);
              if (cx >= xMin && cx <= xMax && cy >= yMin && cy <= yMax) {
                isHoveredByBrush = true;
              }
            }

            return (
              <circle
                key={d.shop_id}
                cx={cx}
                cy={cy}
                r={5}
                fill={isHoveredByBrush ? '#ea580c' : '#6b7280'}
                stroke="#1a1a1a"
                strokeWidth={1}
                opacity={isRemoved ? 0 : 0.8}
                style={{
                  transition: 'cx 400ms cubic-bezier(0.215, 0.61, 0.355, 1), cy 400ms cubic-bezier(0.215, 0.61, 0.355, 1), opacity 300ms ease, fill 100ms',
                  pointerEvents: isRemoved || brush?.active ? 'none' : 'auto',
                  cursor: 'pointer'
                }}
                onPointerEnter={(e) => handleCircleEnter(e, d)}
                onPointerLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
              />
            );
          })}

          {brush?.active && (
            <rect
              x={Math.min(brush.x1, brush.x2)}
              y={Math.min(brush.y1, brush.y2)}
              width={Math.abs(brush.x2 - brush.x1)}
              height={Math.abs(brush.y2 - brush.y1)}
              fill="#ea580c"
              fillOpacity={0.15}
              stroke="#ea580c"
              strokeWidth={2}
              strokeDasharray="4 4"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      </svg>

      {tooltip.visible && tooltip.data && !brush?.active && (
        <div style={{
          position: 'absolute',
          left: tipX,
          top: tipY,
          background: '#f7f0e6',
          border: '2px solid #1a1a1a',
          padding: '8px 12px',
          boxShadow: '4px 4px 0px #1a1a1a',
          pointerEvents: 'none',
          zIndex: 10,
          minWidth: 160
        }}>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#1a1a1a', marginBottom: 2, lineHeight: 1.2 }}>
            {tooltip.data.name.replace(/'/g, '')}
          </div>
          <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: 8, fontFamily: '"JetBrains Mono", monospace' }}>
            {tooltip.data.neighborhood.replace(/'/g, '')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', color: '#1a1a1a' }}>
            <span>REVIEWS:</span>
            <span style={{ fontWeight: 700 }}>{tooltip.data.review_count}</span>
            <span>WAIT (WKND):</span>
            <span style={{ fontWeight: 700 }}>{tooltip.data.weekend_wait_min}m</span>
          </div>
        </div>
      )}

      {removedIds.size > 0 && (
        <button
          onClick={() => setRemovedIds(new Set())}
          onPointerDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: '#f7f0e6',
            border: '2px solid #1a1a1a',
            padding: '4px 8px',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            fontWeight: 700,
            color: '#1a1a1a',
            cursor: 'pointer',
            boxShadow: '2px 2px 0px #1a1a1a',
            zIndex: 20,
            borderRadius: 0
          }}
        >
          RESET
        </button>
      )}
    </div>
  );
}