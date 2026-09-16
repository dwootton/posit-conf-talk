import * as d3 from "https://esm.sh/d3@7";

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(model.get("data") || []);
  const [basemap, setBasemap] = React.useState(model.get("basemap_image") || "");

  React.useEffect(() => {
    const onDataChange = () => setData(model.get("data") || []);
    const onBasemapChange = () => setBasemap(model.get("basemap_image") || "");
    
    model.on("change:data", onDataChange);
    model.on("change:basemap_image", onBasemapChange);
    
    return () => {
      model.off("change:data", onDataChange);
      model.off("change:basemap_image", onBasemapChange);
    };
  }, [model]);

  const svgRef = React.useRef(null);
  const [dragStart, setDragStart] = React.useState(null);
  const [dragCurrent, setDragCurrent] = React.useState(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const projection = React.useMemo(() => {
    return d3.geoMercator().fitExtent(
      [[0, 0], [352, 400]],
      { type: "MultiPoint", coordinates: [[-95.615, 29.600], [-95.255, 29.880]] }
    );
  }, []);

  const pNW = projection([-95.615, 29.880]);
  const pSE = projection([-95.255, 29.600]);

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    const rect = svgRef.current.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragStart(pos);
    setDragCurrent(pos);
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const rect = svgRef.current.getBoundingClientRect();
    setDragCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const bbox = (dragStart && dragCurrent) ? {
    x: Math.min(dragStart.x, dragCurrent.x),
    y: Math.min(dragStart.y, dragCurrent.y),
    width: Math.abs(dragCurrent.x - dragStart.x),
    height: Math.abs(dragCurrent.y - dragStart.y)
  } : null;

  const projectedData = React.useMemo(() => {
    return data.map(d => {
      const [x, y] = projection([d.longitude, d.latitude]);
      return { ...d, x, y };
    });
  }, [data, projection]);

  const selectedShops = React.useMemo(() => {
    if (!bbox) return [];
    return projectedData.filter(d =>
      d.x >= bbox.x && d.x <= bbox.x + bbox.width &&
      d.y >= bbox.y && d.y <= bbox.y + bbox.height
    );
  }, [projectedData, bbox]);

  const count = selectedShops.length;
  const avgWait = count > 0
    ? (selectedShops.reduce((sum, d) => sum + d.weekend_wait_min, 0) / count).toFixed(1)
    : "-";

  return (
    <div style={{ width: 352, height: 400, position: "relative", background: "#f2f0e9", overflow: "hidden", userSelect: "none" }}>
      <svg
        ref={svgRef}
        width={352}
        height={400}
        style={{ position: "absolute", top: 0, left: 0, touchAction: "none", cursor: "crosshair" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {basemap && (
          <image
            href={basemap}
            x={pNW[0]}
            y={pNW[1]}
            width={pSE[0] - pNW[0]}
            height={pSE[1] - pNW[1]}
            preserveAspectRatio="none"
            pointerEvents="none"
          />
        )}
        
        {bbox && (
          <rect
            x={bbox.x}
            y={bbox.y}
            width={bbox.width}
            height={bbox.height}
            fill="#ea580c"
            fillOpacity={0.15}
            stroke="#ea580c"
            strokeWidth={2}
            strokeDasharray="4 4"
            pointerEvents="none"
          />
        )}

        {projectedData.map(d => {
          const isSel = bbox && d.x >= bbox.x && d.x <= bbox.x + bbox.width && d.y >= bbox.y && d.y <= bbox.y + bbox.height;
          return (
            <circle
              key={d.shop_id}
              cx={d.x}
              cy={d.y}
              r={isSel ? 4 : 2.5}
              fill={isSel ? "#ea580c" : "transparent"}
              stroke={isSel ? "#ffffff" : "#64748b"}
              strokeWidth={1.5}
              pointerEvents="none"
            />
          );
        })}
      </svg>

      <div style={{ position: "absolute", top: 12, left: 12, pointerEvents: "none", fontFamily: "'JetBrains Mono', monospace" }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a", lineHeight: 1, textShadow: "0 1px 2px rgba(255,255,255,0.8)" }}>
          {count}
        </div>
        <div style={{ fontSize: 13, color: "#334155", marginTop: 4, fontWeight: 600, textShadow: "0 1px 2px rgba(255,255,255,0.8)" }}>
          {avgWait} min wait
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 12, left: 12, pointerEvents: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#475569", fontWeight: 500, textShadow: "0 1px 2px rgba(255,255,255,0.8)" }}>
        drag to select
      </div>
    </div>
  );
}