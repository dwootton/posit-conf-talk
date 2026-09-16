import * as d3 from "https://esm.sh/d3@7";

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(model.get("data") || []);
  const [basemapImage, setBasemapImage] = React.useState(model.get("basemap_image") || "");
  const [center, setCenter] = React.useState(null);

  const svgRef = React.useRef(null);
  const rectRef = React.useRef(null);

  React.useEffect(() => {
    const handleData = () => setData(model.get("data") || []);
    const handleBasemap = () => setBasemapImage(model.get("basemap_image") || "");
    
    model.on("change:data", handleData);
    model.on("change:basemap_image", handleBasemap);
    
    return () => {
      model.off("change:data", handleData);
      model.off("change:basemap_image", handleBasemap);
    };
  }, [model]);

  React.useEffect(() => {
    const updateRect = () => {
      if (svgRef.current) {
        rectRef.current = svgRef.current.getBoundingClientRect();
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, []);

  const width = 352;
  const height = 400;
  const rectW = 106; // ~30% of 352
  const rectH = 120; // 30% of 400

  const projection = React.useMemo(() => {
    return d3.geoMercator().fitExtent(
      [[0, 0], [width, height]],
      { type: "MultiPoint", coordinates: [[-95.615, 29.600], [-95.255, 29.880]] }
    );
  }, [width, height]);

  const { imgX, imgY, imgW, imgH } = React.useMemo(() => {
    const nw = projection([-95.615, 29.880]);
    const se = projection([-95.255, 29.600]);
    return {
      imgX: nw[0],
      imgY: nw[1],
      imgW: se[0] - nw[0],
      imgH: se[1] - nw[1]
    };
  }, [projection]);

  const shops = React.useMemo(() => {
    return data.map(d => {
      const [x, y] = projection([d.longitude, d.latitude]);
      return { ...d, x, y };
    });
  }, [data, projection]);

  const { selectedShops, unselectedShops, meanWait } = React.useMemo(() => {
    if (!center) {
      return { selectedShops: [], unselectedShops: shops, meanWait: "-- min wait" };
    }
    
    const selected = [];
    const unselected = [];
    let waitSum = 0;

    for (const s of shops) {
      if (Math.abs(s.x - center.x) <= rectW / 2 && Math.abs(s.y - center.y) <= rectH / 2) {
        selected.push(s);
        waitSum += s.weekend_wait_min;
      } else {
        unselected.push(s);
      }
    }

    const mean = selected.length > 0 ? (waitSum / selected.length).toFixed(1) : "--";
    return { selectedShops: selected, unselectedShops: unselected, meanWait: `${mean} min wait` };
  }, [shops, center, rectW, rectH]);

  React.useEffect(() => {
    model.set("selected_count", selectedShops.length);
    model.set("mean_wait", meanWait);
    model.save_changes();
  }, [selectedShops.length, meanWait, model]);

  const handlePointerDown = (e) => {
    if (!rectRef.current && svgRef.current) {
      rectRef.current = svgRef.current.getBoundingClientRect();
    }
    if (!rectRef.current) return;

    const rect = rectRef.current;
    let cx = e.clientX - rect.left;
    let cy = e.clientY - rect.top;

    cx = Math.max(rectW / 2, Math.min(width - rectW / 2, cx));
    cy = Math.max(rectH / 2, Math.min(height - rectH / 2, cy));

    setCenter({ x: cx, y: cy });
  };

  const textHalo = '0 0 4px #f2f0e9, 0 0 4px #f2f0e9, 0 0 6px #f2f0e9';

  return (
    <div style={{
      width,
      height,
      backgroundColor: '#f2f0e9',
      overflow: 'hidden',
      position: 'relative',
      margin: 0,
      padding: 0
    }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
      >
        {basemapImage && (
          <image
            href={basemapImage}
            x={imgX}
            y={imgY}
            width={imgW}
            height={imgH}
            preserveAspectRatio="none"
          />
        )}

        {unselectedShops.map(s => (
          <circle
            key={s.shop_id}
            cx={s.x}
            cy={s.y}
            r={2.5}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.5}
          />
        ))}

        {selectedShops.map(s => (
          <circle
            key={s.shop_id}
            cx={s.x}
            cy={s.y}
            r={4}
            fill="#ea580c"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        ))}

        {center && (
          <g style={{
            transform: `translate(${center.x}px, ${center.y}px)`,
            transition: 'transform 180ms ease-out'
          }}>
            <rect
              x={-rectW / 2}
              y={-rectH / 2}
              width={rectW}
              height={rectH}
              fill="#ea580c"
              fillOpacity={0.15}
              stroke="#ea580c"
              strokeWidth={2}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
            <line x1={-6} y1={0} x2={6} y2={0} stroke="#ea580c" strokeWidth={2} pointerEvents="none" />
            <line x1={0} y1={-6} x2={0} y2={6} stroke="#ea580c" strokeWidth={2} pointerEvents="none" />
          </g>
        )}
      </svg>

      <div style={{
        position: 'absolute',
        top: 14,
        left: 16,
        pointerEvents: 'none',
        fontFamily: "'JetBrains Mono', monospace",
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        textShadow: textHalo
      }}>
        <span style={{ fontSize: 40, lineHeight: 1, fontWeight: 600, letterSpacing: '-0.02em' }}>
          {selectedShops.length}
        </span>
        <span style={{ fontSize: 14, color: '#334155', fontWeight: 600 }}>
          {meanWait}
        </span>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 14,
        left: 16,
        pointerEvents: 'none',
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 13,
        color: '#0f172a',
        fontWeight: 600,
        textShadow: textHalo
      }}>
        click to place
      </div>
    </div>
  );
}