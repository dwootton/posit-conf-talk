import * as d3 from "https://esm.sh/d3@7";

export const SummaryCard = ({ box, selected, unselected, React }) => {
  if (!box) return null;

  const minX = Math.min(box.x1, box.x2);
  const minY = Math.min(box.y1, box.y2);
  const maxX = Math.max(box.x1, box.x2);
  const maxY = Math.max(box.y1, box.y2);

  if (maxX - minX < 3 && maxY - minY < 3) return null;

  const cardW = 180;
  const cardH = 92;
  
  const midX = minX + (maxX - minX) / 2;
  let left = midX - cardW / 2;
  left = Math.max(50, Math.min(left, 332 - cardW));

  let top = minY - cardH - 12;
  if (top < 20) {
    top = maxY + 12;
  }
  top = Math.max(20, Math.min(top, 350 - cardH));

  const hasSel = selected.length > 0;
  const hasUnsel = unselected.length > 0;

  const inWait = hasSel ? selected.reduce((s, d) => s + d.weekend_wait_min, 0) / selected.length : NaN;
  const outWait = hasUnsel ? unselected.reduce((s, d) => s + d.weekend_wait_min, 0) / unselected.length : NaN;
  const inRev = hasSel ? selected.reduce((s, d) => s + d.review_count, 0) / selected.length : NaN;
  const outRev = hasUnsel ? unselected.reduce((s, d) => s + d.review_count, 0) / unselected.length : NaN;

  const waitDiff = inWait - outWait;
  const revDiff = inRev - outRev;

  const renderRow = (diff, unit, decimals) => {
    if (!hasSel || isNaN(diff)) {
      return <div style={{ fontSize: 16, lineHeight: '22px' }}>-</div>;
    }
    
    const isUp = diff > 0;
    const isDown = diff < 0;
    const color = isUp ? '#ea580c' : (isDown ? '#3f8bdb' : '#1a1a1a');
    
    const valStr = Math.abs(diff).toFixed(decimals);
    const displayVal = (isUp ? "+" : (isDown ? "-" : "")) + valStr;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 16, lineHeight: '22px' }}>
        {isUp || isDown ? (
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
            {isUp ? (
              <polygon points="1,9 11,9 6,2" fill={color} />
            ) : (
              <polygon points="1,3 11,3 6,10" fill={color} />
            )}
          </svg>
        ) : <div style={{ width: 12, height: 12 }} />}
        <span>{displayVal} {unit}</span>
      </div>
    );
  };

  return (
    <div style={{
      position: 'absolute',
      left, top,
      width: cardW,
      backgroundColor: '#f7f0e6',
      border: '2px solid #1a1a1a',
      boxShadow: '3px 3px 0px #1a1a1a',
      padding: '8px 12px',
      boxSizing: 'border-box',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace',
      color: '#1a1a1a',
      whiteSpace: 'nowrap'
    }}>
      <div style={{ fontSize: 28, fontWeight: 'bold', lineHeight: '32px', marginBottom: 4 }}>
        {selected.length} {selected.length === 1 ? 'shop' : 'shops'}
      </div>
      {renderRow(waitDiff, 'min', 1)}
      {renderRow(revDiff, 'reviews', 0)}
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
    return data
      .map(d => ({
        ...d,
        review_count: Number(d.review_count),
        weekend_wait_min: Number(d.weekend_wait_min)
      }))
      .filter(d => d.review_count <= 3000);
  }, [data]);

  const svgRef = React.useRef(null);
  const [box, setBox] = React.useState(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const xMax = React.useMemo(() => d3.max(parsedData, d => d.review_count) || 100, [parsedData]);
  const yMax = React.useMemo(() => d3.max(parsedData, d => d.weekend_wait_min) || 100, [parsedData]);
  
  const xScale = React.useMemo(() => d3.scaleLinear().domain([0, xMax * 1.05]).nice().range([50, 332]), [xMax]);
  const yScale = React.useMemo(() => d3.scaleLinear().domain([0, yMax * 1.05]).nice().range([350, 20]), [yMax]);

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
    <div style={{ width: 352, height: 400, backgroundColor: '#f7f0e6', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
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

        {xScale.ticks(4).map(tick => (
          <g key={`x-${tick}`} transform={`translate(${xScale(tick)}, 350)`}>
            <line y2={4} stroke="#1a1a1a" />
            <text y={20} textAnchor="middle" fontSize={14} fontFamily="JetBrains Mono, monospace" fill="#1a1a1a">{tick}</text>
          </g>
        ))}
        {yScale.ticks(4).map(tick => (
          <g key={`y-${tick}`} transform={`translate(50, ${yScale(tick)})`}>
            <line x2={-4} stroke="#1a1a1a" />
            <text x={-8} dominantBaseline="middle" textAnchor="end" fontSize={14} fontFamily="JetBrains Mono, monospace" fill="#1a1a1a">{tick}</text>
          </g>
        ))}

        <text x={50} y={392} fontSize={15} fontFamily="JetBrains Mono, monospace" fill="#1a1a1a" fontWeight="bold">REVIEWS</text>
        <text x={14} y={350} transform="rotate(-90, 14, 350)" fontSize={15} fontFamily="JetBrains Mono, monospace" fill="#1a1a1a" fontWeight="bold">WEEKEND WAIT / MIN</text>

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

      <SummaryCard box={hasBox ? box : null} selected={selected} unselected={unselected} React={React} />
    </div>
  );
}