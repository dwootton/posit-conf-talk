import * as d3 from "https://esm.sh/d3@7";

function haversine(lon1, lat1, lon2, lat2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(model.get("data") || []);
  const [basemapImage, setBasemapImage] = React.useState(model.get("basemap_image") || "");

  const [markerPos, setMarkerPos] = React.useState([-95.3848, 29.7468]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [hoveredShop, setHoveredShop] = React.useState(null);
  const svgRef = React.useRef(null);

  React.useEffect(() => {
    const onDataChange = () => setData(model.get("data") || []);
    const onBasemapChange = () => setBasemapImage(model.get("basemap_image") || "");

    model.on("change:data", onDataChange);
    model.on("change:basemap_image", onBasemapChange);

    return () => {
      model.off("change:data", onDataChange);
      model.off("change:basemap_image", onBasemapChange);
    };
  }, [model]);

  const { projection, imgX, imgY, imgW, imgH, oneMilePx } = React.useMemo(() => {
    const width = 352;
    const height = 400;
    const nw = [-95.615, 29.880];
    const se = [-95.255, 29.600];
    const bboxGeoJSON = {
      type: "MultiPoint",
      coordinates: [nw, se]
    };
    
    const proj = d3.geoMercator().fitExtent([[15, 15], [width - 15, height - 15]], bboxGeoJSON);

    const [x1, y1] = proj(nw);
    const [x2, y2] = proj(se);

    const centerPx = proj([-95.435, 29.740]);
    const edgePx = proj([-95.435, 29.740 + 1 / 69.055]);
    const milePx = Math.abs(edgePx[1] - centerPx[1]);

    return { 
      projection: proj, 
      imgX: x1, 
      imgY: y1, 
      imgW: x2 - x1, 
      imgH: y2 - y1, 
      oneMilePx: milePx 
    };
  }, []);

  const { top5, others, markerPx } = React.useMemo(() => {
    const mPx = projection(markerPos);
    if (!data.length) return { top5: [], others: [], markerPx: mPx };

    const withDist = data.map(d => ({
      ...d,
      dist: haversine(markerPos[0], markerPos[1], d.longitude, d.latitude),
      px: projection([d.longitude, d.latitude])
    })).sort((a, b) => a.dist - b.dist);

    const t5 = withDist.slice(0, 5);
    const oths = withDist.slice(5);
    
    const placedLabels = [];
    
    for (const shop of t5) {
      const cx = shop.px[0];
      const cy = shop.px[1];
      const nameLen = shop.name.length;
      const distStr = `${shop.dist.toFixed(2)}mi`;
      const distLen = distStr.length;
      
      const w = Math.max(nameLen * 9.5, distLen * 17);
      const h = 48;
      const gap = 12;
      
      const candidates = [
        { box: [cx + gap, cy - h/2, w, h], anchor: "start", textX: cx + gap, textY: cy - h/2 + 15 },
        { box: [cx - gap - w, cy - h/2, w, h], anchor: "end", textX: cx - gap, textY: cy - h/2 + 15 },
        { box: [cx - w/2, cy - gap - h, w, h], anchor: "middle", textX: cx, textY: cy - gap - h + 15 },
        { box: [cx - w/2, cy + gap, w, h], anchor: "middle", textX: cx, textY: cy + gap + 15 },
        { box: [cx + gap + h, cy - h/2, w, h], anchor: "start", textX: cx + gap + h, textY: cy - h/2 + 15 },
        { box: [cx - gap - w - h, cy - h/2, w, h], anchor: "end", textX: cx - gap - h, textY: cy - h/2 + 15 },
        { box: [cx - w/2, cy - gap - h - h, w, h], anchor: "middle", textX: cx, textY: cy - gap - h - h + 15 },
        { box: [cx - w/2, cy + gap + h, w, h], anchor: "middle", textX: cx, textY: cy + gap + h + 15 }
      ];
      
      for (const cand of candidates) {
        const [bx, by, bw, bh] = cand.box;
        
        if (bx < 0 || bx + bw > 352 || by < 0 || by + bh > 400) continue;
        
        let intersect = false;
        for (const p of placedLabels) {
          const [px, py, pw, ph] = p;
          if (!(bx >= px + pw || bx + bw <= px || by >= py + ph || by + bh <= py)) {
            intersect = true;
            break;
          }
        }
        
        if (!intersect) {
          shop.label = { ...cand, distStr };
          placedLabels.push(cand.box);
          break;
        }
      }
    }

    return {
      top5: t5,
      others: oths,
      markerPx: mPx
    };
  }, [data, markerPos, projection]);

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const [lon, lat] = projection.invert([x, y]);
    setMarkerPos([lon, lat]);
  };

  const handlePointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  return (
    <div style={{
      width: 352,
      height: 400,
      background: '#f7f0e6',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Space Grotesk", sans-serif',
      margin: 0,
      padding: 0,
      userSelect: 'none'
    }}>
      <svg
        ref={svgRef}
        width={352}
        height={400}
        style={{ position: 'absolute', top: 0, left: 0, touchAction: 'none' }}
      >
        {basemapImage && (
          <image 
            href={basemapImage} 
            x={imgX} 
            y={imgY} 
            width={imgW} 
            height={imgH} 
            preserveAspectRatio="none" 
            pointerEvents="none"
          />
        )}

        <circle cx={markerPx[0]} cy={markerPx[1]} r={oneMilePx} stroke="#94a3b8" fill="none" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} pointerEvents="none" />
        <circle cx={markerPx[0]} cy={markerPx[1]} r={oneMilePx * 2} stroke="#94a3b8" fill="none" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} pointerEvents="none" />

        {top5.map(shop => (
          <line
            key={`line-${shop.shop_id}`}
            x1={markerPx[0]} y1={markerPx[1]}
            x2={shop.px[0]} y2={shop.px[1]}
            stroke="#334155"
            strokeWidth={1.5}
            opacity={0.4}
            pointerEvents="none"
          />
        ))}

        {others.map(shop => (
          <circle
            key={`other-${shop.shop_id}`}
            cx={shop.px[0]} cy={shop.px[1]}
            r={3.5}
            stroke="#64748b"
            fill="transparent"
            strokeWidth={1.5}
            onPointerEnter={() => setHoveredShop(shop)}
            onPointerLeave={() => setHoveredShop(null)}
            style={{ cursor: 'pointer' }}
          />
        ))}

        {top5.map(shop => (
          <g key={`top-${shop.shop_id}`}>
            <circle
              cx={shop.px[0]} cy={shop.px[1]}
              r={5}
              fill="#f97316"
              stroke="#f7f0e6"
              strokeWidth={1.5}
              onPointerEnter={() => setHoveredShop(shop)}
              onPointerLeave={() => setHoveredShop(null)}
              style={{ cursor: 'pointer' }}
            />
            {shop.label && (
              <text
                textAnchor={shop.label.anchor}
                fontFamily='"JetBrains Mono", monospace'
                style={{ pointerEvents: 'none', paintOrder: 'stroke' }}
                stroke="#f7f0e6"
                strokeWidth={3}
                strokeLinejoin="round"
              >
                <tspan x={shop.label.textX} y={shop.label.textY} fontSize={15} fill="#1e293b" fontWeight="bold">
                  {shop.name}
                </tspan>
                <tspan x={shop.label.textX} y={shop.label.textY + 28} fontSize={28} fill="#475569">
                  {shop.label.distStr}
                </tspan>
              </text>
            )}
          </g>
        ))}

        <g
          transform={`translate(${markerPx[0]}, ${markerPx[1]})`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <circle r={16} fill="transparent" />
          <circle r={6} fill="#f7f0e6" stroke="#1e293b" strokeWidth={2} />
          <circle r={2} fill="#1e293b" />
        </g>
      </svg>

      {hoveredShop && (
        <div style={{
          position: 'absolute',
          left: Math.min(hoveredShop.px[0] + 12, 352 - 200),
          top: Math.min(hoveredShop.px[1] + 12, 400 - 100),
          background: '#f7f0e6',
          border: '2px solid #1e293b',
          boxShadow: '4px 4px 0px #1e293b',
          padding: '12px 16px',
          pointerEvents: 'none',
          zIndex: 10,
          width: 'max-content',
          maxWidth: 220
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4, lineHeight: 1.2 }}>
            {hoveredShop.name}
          </div>
          <div style={{ fontSize: 15, fontFamily: '"JetBrains Mono", monospace', color: '#475569', marginBottom: 8 }}>
            {hoveredShop.neighborhood}
          </div>
          <div style={{ fontSize: 28, fontFamily: '"JetBrains Mono", monospace', color: '#f97316', fontWeight: 600, lineHeight: 1 }}>
            {hoveredShop.dist.toFixed(2)} mi
          </div>
        </div>
      )}
    </div>
  );
}