import * as d3 from "https://esm.sh/d3@7";

export const SummaryCard = ({ box, selected, unselected, React }) => {
  if (!box) return null;

  const minX = Math.min(box.x1, box.x2);
  const minY = Math.min(box.y1, box.y2);
  const maxX = Math.max(box.x1, box.x2);
  const maxY = Math.max(box.y1, box.y2);

  if (maxX - minX < 3 && maxY - minY < 3) return null;

  const cardW = 132;
  const cardH = 104;
  
  const left = Math.max(50, Math.min(minX, 332 - cardW));
  const top = Math.max(20, Math.min(minY, 350 - cardH));

  const hasSel = selected.length > 0;
  const hasUnsel = unselected.length > 0;

  const inWait = hasSel ? selected.reduce((s, d) => s + d.weekend_wait_min, 0) / selected.length : NaN;
  const outWait = hasUnsel ? unselected.reduce((s, d) => s + d.weekend_wait_min, 0) / unselected.length : NaN;
  const inRev = hasSel ? selected.reduce((s, d) => s + d.review_count, 0) / selected.length : NaN;
  const outRev = hasUnsel ? unselected.reduce((s, d) => s + d.review_count, 0) / unselected.length : NaN;

  const waitDiff = inWait - outWait;
  const revDiff = inRev - outRev;

  const fmt = (v, d) => isNaN(v) ? "-" : v.toFixed(d);
  const fmtDiff = (v, d) => {
    if (isNaN(v)) return "-";
    return (v > 0 ? "+" : "") + v.toFixed(d);
  };

  return (
    <div style={{
      position: 'absolute',
      left, top,
      width: cardW,
      backgroundColor: '#f7f0e6',
      border: '2px solid #1a1a1a',
      boxShadow: '3px 3px 0px #1a1a1a',
      padding: '8px',
      boxSizing: 'border-box',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', lineHeight: 1 }}>
          {selected.length}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', color: '#1a1a1a', marginTop: 4 }}>
          {selected.length === 1 ? 'shop' : 'shops'}
        </div>
      </div>
      <div style={{ height: 1, backgroundColor: '#1a1a1a', opacity: 0.2 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr', gap: '4px', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', alignItems: 'center' }}>
        <div style={{ textAlign: 'left', color: '#6b7280' }}></div>
        <div style={{ color: '#6b7280' }}>IN</div>
        <div style={{ color: '#6b7280' }}>OUT</div>
        <div style={{ color: '#6b7280' }}>Δ</div>

        <div style={{ textAlign: 'left', fontWeight: 'bold', color: '#1a1a1a' }}>WAIT</div>
        <div style={{ color: '#1a1a1a' }}>{fmt(inWait, 1)}</div>
        <div style={{ color: '#6b7280' }}>{fmt(outWait, 1)}</div>
        <div style={{ color: waitDiff > 0 ? '#ea580c' : (waitDiff < 0 ? '#059669' : '#1a1a1a') }}>{fmtDiff(waitDiff, 1)}</div>

        <div style={{ textAlign: 'left', fontWeight: 'bold', color: '#1a1a1a' }}>REV</div>
        <div style={{ color: '#1a1a1a' }}>{fmt(inRev, 0)}</div>
        <div style={{ color: '#6b7280' }}>{fmt(outRev, 0)}</div>
        <div style={{ color: revDiff > 0 ? '#ea580c' : (revDiff < 0 ? '#059669' : '#1a1a1a') }}>{fmtDiff(revDiff, 0)}</div>
      </div>
    </div>
  );
};

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(() => model.get("data") || []);
  
  React.useEffect(() => {
    const handler = () => setData(model.get("data") || []);
    model.on("change:data", handler);
    return () => model.off("change:data", handler);
  }, [model]);

  const parsedData = React.useMemo(() => {
    return data.map(d => ({
      ...d,
      review_count: Number(d.review_count),
      weekend_wait_min: Number(d.weekend_wait_min)
    }));
  }, [data]);

  const svgRef = React.useRef(null);
  const [box, setBox] = React.useState(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const xMax = React.useMemo(() => d3.max(parsedData, d => d.review_count) || 100, [parsedData]);
  const yMax = React.useMemo(() => d3.max(parsedData, d => d.weekend_wait_min) || 100, [parsedData]);
  
  const xScale = React.useMemo(() => d3.scaleLinear().domain([0, xMax]).range([50, 332]), [xMax]);
  const yScale = React.useMemo(() => d3.scaleLinear().domain([0, yMax]).range([350, 20]), [yMax]);

  const handlePointerDown = React.useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setBox({ x1: x, y1: y, x2: x, y2: y });
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = React.useCallback((e) => {
    if (!isDragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setBox(prev => ({ ...prev, x2: x, y2: y }));
  }, [isDragging]);

  const handlePointerUp = React.useCallback((e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
    if (box && Math.abs(box.x1 - box.x2) < 3 && Math.abs(box.y1 - box.y2) < 3) {
      setBox(null);
    }
  }, [isDragging, box]);

  const minX = box ? Math.min(box.x1, box.x2) : 0;
  const maxX = box ? Math.max(box.x1, box.x2) : 0;
  const minY = box ? Math.min(box.y1, box.y2) : 0;
  const maxY = box ? Math.max(box.y1, box.y2) : 0;
  const hasBox = box && (maxX - minX >= 3 || maxY - minY >= 3);

  const selected = [];
  const unselected = [];
  
  parsedData.forEach(d => {
    const cx = xScale(d.review_count);
    const cy = yScale(d.weekend_wait_min);
    if (hasBox && cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
      selected.push(d);
    } else {
      unselected.push(d);
    }
  });

  return (
    <div style={{ width: 352, height: 400, backgroundColor: '#f2f0e9', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
      <svg
        ref={svgRef}
        width={352} height={400}
        style={{ position: 'absolute', top: 0, left: 0, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <line x1={50} x2={332} y1={350} y2={350} stroke="#1a1a1a" />
        <line x1={50} x2={50} y1={20} y2={350} stroke="#1a1a1a" />

        {xScale.ticks(5).map(tick => (
          <g key={`x-${tick}`} transform={`translate(${xScale(tick)}, 350)`}>
            <line y2={4} stroke="#1a1a1a" />
            <text y={16} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono, monospace" fill="#1a1a1a">{tick}</text>
          </g>
        ))}
        {yScale.ticks(5).map(tick => (
          <g key={`y-${tick}`} transform={`translate(50, ${yScale(tick)})`}>
            <line x2={-4} stroke="#1a1a1a" />
            <text x={-8} dominantBaseline="middle" textAnchor="end" fontSize={10} fontFamily="JetBrains Mono, monospace" fill="#1a1a1a">{tick}</text>
          </g>
        ))}

        <text x={50} y={388} fontSize={10} fontFamily="JetBrains Mono, monospace" fill="#1a1a1a" fontWeight="bold">REVIEWS</text>
        <text x={16} y={350} transform="rotate(-90, 16, 350)" fontSize={10} fontFamily="JetBrains Mono, monospace" fill="#1a1a1a" fontWeight="bold">WEEKEND WAIT / MIN</text>

        {parsedData.map((d, i) => {
          const cx = xScale(d.review_count);
          const cy = yScale(d.weekend_wait_min);
          const isSel = hasBox && cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
          const fill = !hasBox ? '#6b7280' : (isSel ? '#ea580c' : '#cbd5e1');
          const op = !hasBox ? 0.8 : (isSel ? 1 : 0.7);
          const str = !hasBox ? '#1a1a1a' : (isSel ? 'white' : '#1a1a1a');
          
          return (
            <circle 
              key={i} cx={cx} cy={cy} r={5} 
              fill={fill} fillOpacity={op} 
              stroke={str} strokeWidth={1} 
              pointerEvents="none" 
            />
          );
        })}

        {hasBox && (
          <rect
            x={minX} y={minY} width={maxX - minX} height={maxY - minY}
            fill="#ea580c" fillOpacity={0.15}
            stroke="#ea580c" strokeWidth={2} strokeDasharray="4 4"
            pointerEvents="none"
          />
        )}
      </svg>

      <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, fontFamily: 'Space Grotesk, sans-serif', color: '#6b7280', pointerEvents: 'none' }}>
        drag a region
      </div>

      <SummaryCard box={hasBox ? box : null} selected={selected} unselected={unselected} React={React} />
    </div>
  );
}