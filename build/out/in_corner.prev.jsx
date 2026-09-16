import * as d3 from "https://esm.sh/d3@7";

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(() => model.get("data") || []);
  const [basemapImage, setBasemapImage] = React.useState(() => model.get("basemap_image") || "");

  React.useEffect(() => {
    const handleData = () => setData(model.get("data") || []);
    const handleImage = () => setBasemapImage(model.get("basemap_image") || "");

    model.on("change:data", handleData);
    model.on("change:basemap_image", handleImage);

    return () => {
      model.off("change:data", handleData);
      model.off("change:basemap_image", handleImage);
    };
  }, [model]);

  // Interaction state: 0 = init, 1 = first click (preview), 2 = second click (complete)
  const [clickState, setClickState] = React.useState(0);
  const [p1, setP1] = React.useState(null);
  const [p2, setP2] = React.useState(null);
  const svgRef = React.useRef(null);

  const width = 352;
  const height = 400;

  const projection = React.useMemo(() => {
    return d3.geoMercator().fitExtent(
      [[0, 0], [width, height]],
      { type: "MultiPoint", coordinates: [[-95.615, 29.600], [-95.255, 29.880]] }
    );
  }, [width, height]);

  const nw = React.useMemo(() => projection([-95.615, 29.880]), [projection]);
  const se = React.useMemo(() => projection([-95.255, 29.600]), [projection]);

  const handlePointerDown = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (clickState === 0 || clickState === 2) {
      setP1({ x, y });
      setP2({ x, y });
      setClickState(1);
    } else if (clickState === 1) {
      setP2({ x, y });
      setClickState(2);
    }
  };

  const handlePointerMove = (e) => {
    if (clickState === 1 && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setP2({ x, y });
    }
  };

  const projectedData = React.useMemo(() => {
    return data.map((d) => {
      const [x, y] = projection([d.longitude, d.latitude]);
      return { ...d, px: x, py: y };
    });
  }, [data, projection]);

  const isSelected = React.useCallback((d) => {
    if (clickState === 0 || !p1 || !p2) return false;
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    return d.px >= minX && d.px <= maxX && d.py >= minY && d.py <= maxY;
  }, [clickState, p1, p2]);

  const selectedShops = projectedData.filter(isSelected);
  const count = clickState > 0 ? selectedShops.length : 0;
  const meanWait = count > 0
    ? (selectedShops.reduce((sum, d) => sum + d.weekend_wait_min, 0) / count).toFixed(1)
    : "--";

  const instructionText = clickState === 1 ? "click the opposite corner" : "click two corners";

  return (
    <div
      style={{
        width,
        height,
        background: "#f2f0e9",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#0f172a",
        userSelect: "none"
      }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        style={{ position: "absolute", top: 0, left: 0, touchAction: "none", cursor: "crosshair" }}
      >
        {basemapImage && (
          <image
            href={basemapImage}
            x={nw[0]}
            y={nw[1]}
            width={se[0] - nw[0]}
            height={se[1] - nw[1]}
            preserveAspectRatio="none"
          />
        )}

        {clickState >= 1 && p1 && (
          <g>
            <line x1={p1.x - 5} y1={p1.y} x2={p1.x + 5} y2={p1.y} stroke="#ea580c" strokeWidth={2} />
            <line x1={p1.x} y1={p1.y - 5} x2={p1.x} y2={p1.y + 5} stroke="#ea580c" strokeWidth={2} />
            {p2 && (
              <rect
                x={Math.min(p1.x, p2.x)}
                y={Math.min(p1.y, p2.y)}
                width={Math.abs(p2.x - p1.x)}
                height={Math.abs(p2.y - p1.y)}
                fill={clickState === 2 ? "rgba(234, 88, 12, 0.15)" : "none"}
                stroke="#ea580c"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
          </g>
        )}

        {projectedData.map((d, i) => {
          const selected = isSelected(d);
          return (
            <circle
              key={d.shop_id || i}
              cx={d.px}
              cy={d.py}
              r={selected ? 4 : 2.5}
              fill={selected ? "#ea580c" : "none"}
              stroke={selected ? "#fff" : "#94a3b8"}
              strokeWidth={selected ? 1.5 : 1.5}
            />
          );
        })}
      </svg>

      <div style={{ position: "absolute", top: 12, left: 12, pointerEvents: "none", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: "#1e293b", lineHeight: 1 }}>
          {count}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#475569", lineHeight: 1 }}>
          {meanWait} min wait
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 12, left: 12, pointerEvents: "none", fontSize: 13, fontWeight: 600, color: "#1e293b", textShadow: "0 1px 2px rgba(242, 240, 233, 0.8)" }}>
        {instructionText}
      </div>
    </div>
  );
}