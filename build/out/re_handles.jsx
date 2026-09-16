import * as d3 from "https://esm.sh/d3@7";

export default function Widget({ model, React }) {
  const { useState, useEffect, useRef, useMemo } = React;

  // 1. Data & State Initialization
  const [data, setData] = useState(model.get("data") || []);
  const [basemapImage, setBasemapImage] = useState(model.get("basemap_image") || "");

  useEffect(() => {
    const onData = () => setData(model.get("data") || []);
    const onImage = () => setBasemapImage(model.get("basemap_image") || "");
    model.on("change:data", onData);
    model.on("change:basemap_image", onImage);
    return () => {
      model.off("change:data", onData);
      model.off("change:basemap_image", onImage);
    };
  }, [model]);

  const width = 352;
  const height = 400;

  // 2. Projection & Geometry
  const projection = useMemo(() => {
    return d3.geoMercator().fitExtent(
      [[0, 0], [width, height]],
      { type: "MultiPoint", coordinates: [[-95.615, 29.600], [-95.255, 29.880]] }
    );
  }, [width, height]);

  const imageBounds = useMemo(() => {
    const pNW = projection([-95.615, 29.880]);
    const pSE = projection([-95.255, 29.600]);
    return {
      x: pNW[0],
      y: pNW[1],
      width: pSE[0] - pNW[0],
      height: pSE[1] - pNW[1]
    };
  }, [projection]);

  const shops = useMemo(() => {
    return data.map(d => {
      const [x, y] = projection([d.longitude, d.latitude]);
      return { ...d, x, y };
    });
  }, [data, projection]);

  // 3. Interaction State
  const svgRef = useRef(null);
  const [box, setBox] = useState(null); // {x1, y1, x2, y2}
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ mode: 'none', startX: 0, startY: 0, startBox: null, target: null });
  const [hoverCursor, setHoverCursor] = useState("crosshair");

  // Helper to normalize box coordinates
  const getNormBox = (b) => {
    if (!b) return null;
    return {
      minX: Math.min(b.x1, b.x2),
      maxX: Math.max(b.x1, b.x2),
      minY: Math.min(b.y1, b.y2),
      maxY: Math.max(b.y1, b.y2),
    };
  };

  const normBox = getNormBox(box);

  // Hit testing for handles and interior
  const getHitTarget = (x, y, nb) => {
    if (!nb) return 'none';
    const r = 8; // hit radius for handles
    const dist = (x1, y1, x2, y2) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

    // Corners
    if (dist(x, y, nb.minX, nb.minY) < r) return 'nw';
    if (dist(x, y, nb.maxX, nb.minY) < r) return 'ne';
    if (dist(x, y, nb.minX, nb.maxY) < r) return 'sw';
    if (dist(x, y, nb.maxX, nb.maxY) < r) return 'se';

    // Edges
    const midX = (nb.minX + nb.maxX) / 2;
    const midY = (nb.minY + nb.maxY) / 2;
    if (dist(x, y, midX, nb.minY) < r) return 'n';
    if (dist(x, y, midX, nb.maxY) < r) return 's';
    if (dist(x, y, nb.maxX, midY) < r) return 'e';
    if (dist(x, y, nb.minX, midY) < r) return 'w';

    // Interior
    if (x >= nb.minX && x <= nb.maxX && y >= nb.minY && y <= nb.maxY) return 'inside';
    return 'none';
  };

  // Safe coordinate extraction
  const getCoords = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  // 4. Pointer Event Handlers
  const handlePointerDown = (e) => {
    if (svgRef.current) svgRef.current.setPointerCapture(e.pointerId);
    setIsDragging(true);
    
    const [x, y] = getCoords(e);
    const target = getHitTarget(x, y, normBox);

    if (target === 'none') {
      dragState.current = { mode: 'draw', target: null };
      setBox({ x1: x, y1: y, x2: x, y2: y });
    } else if (target === 'inside') {
      dragState.current = { mode: 'move', startX: x, startY: y, startBox: { ...box }, target: null };
    } else {
      dragState.current = { mode: 'resize', target };
      // Pin the opposite corner or edge as the anchor (x1, y1)
      if (target === 'nw') setBox({ x1: normBox.maxX, y1: normBox.maxY, x2: x, y2: y });
      if (target === 'ne') setBox({ x1: normBox.minX, y1: normBox.maxY, x2: x, y2: y });
      if (target === 'sw') setBox({ x1: normBox.maxX, y1: normBox.minY, x2: x, y2: y });
      if (target === 'se') setBox({ x1: normBox.minX, y1: normBox.minY, x2: x, y2: y });
      
      if (target === 'n') setBox({ x1: normBox.minX, y1: normBox.maxY, x2: normBox.maxX, y2: y });
      if (target === 's') setBox({ x1: normBox.minX, y1: normBox.minY, x2: normBox.maxX, y2: y });
      if (target === 'e') setBox({ x1: normBox.minX, y1: normBox.minY, x2: x, y2: normBox.maxY });
      if (target === 'w') setBox({ x1: normBox.maxX, y1: normBox.minY, x2: x, y2: normBox.maxY });
    }
  };

  const handlePointerMove = (e) => {
    const [x, y] = getCoords(e);
    const cx = Math.max(0, Math.min(width, x));
    const cy = Math.max(0, Math.min(height, y));

    if (isDragging) {
      const state = dragState.current;
      if (state.mode === 'draw') {
        setBox(prev => ({ ...prev, x2: cx, y2: cy }));
      } else if (state.mode === 'resize') {
        setBox(prev => {
          const newX2 = ['n', 's'].includes(state.target) ? prev.x2 : cx;
          const newY2 = ['e', 'w'].includes(state.target) ? prev.y2 : cy;
          return { ...prev, x2: newX2, y2: newY2 };
        });
      } else if (state.mode === 'move') {
        let dx = x - state.startX;
        let dy = y - state.startY;
        const nsb = getNormBox(state.startBox);

        // Clamp translation to map bounds
        if (nsb.minX + dx < 0) dx = -nsb.minX;
        if (nsb.maxX + dx > width) dx = width - nsb.maxX;
        if (nsb.minY + dy < 0) dy = -nsb.minY;
        if (nsb.maxY + dy > height) dy = height - nsb.maxY;

        setBox({
          x1: state.startBox.x1 + dx,
          y1: state.startBox.y1 + dy,
          x2: state.startBox.x2 + dx,
          y2: state.startBox.y2 + dy
        });
      }
    } else {
      const target = getHitTarget(x, y, normBox);
      if (target === 'nw' || target === 'se') setHoverCursor('nwse-resize');
      else if (target === 'ne' || target === 'sw') setHoverCursor('nesw-resize');
      else if (target === 'e' || target === 'w') setHoverCursor('ew-resize');
      else if (target === 'n' || target === 's') setHoverCursor('ns-resize');
      else if (target === 'inside') setHoverCursor('move');
      else setHoverCursor('crosshair');
    }
  };

  const handlePointerUp = (e) => {
    if (svgRef.current) svgRef.current.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    dragState.current = { mode: 'none', target: null };
    
    // Clear box if it's just a click (no area)
    if (box && Math.abs(box.x1 - box.x2) < 2 && Math.abs(box.y1 - box.y2) < 2) {
      setBox(null);
    }
  };

  const getCursor = () => {
    if (isDragging) {
      const { mode, target } = dragState.current;
      if (mode === 'move') return 'move';
      if (mode === 'draw') return 'crosshair';
      if (mode === 'resize') {
        if (['e', 'w'].includes(target)) return 'ew-resize';
        if (['n', 's'].includes(target)) return 'ns-resize';
        const dx = box.x2 - box.x1;
        const dy = box.y2 - box.y1;
        if (dx === 0 || dy === 0) return 'crosshair';
        return (dx * dy > 0) ? 'nwse-resize' : 'nesw-resize';
      }
    }
    return hoverCursor;
  };

  // 5. Data Selection & Aggregation
  const selectedShops = useMemo(() => {
    if (!normBox) return [];
    return shops.filter(s =>
      s.x >= normBox.minX && s.x <= normBox.maxX &&
      s.y >= normBox.minY && s.y <= normBox.maxY
    );
  }, [shops, normBox]);

  const meanWait = useMemo(() => {
    if (selectedShops.length === 0) return null;
    const sum = selectedShops.reduce((acc, s) => acc + s.weekend_wait_min, 0);
    return (sum / selectedShops.length).toFixed(1);
  }, [selectedShops]);

  // 6. Render
  return (
    <div style={{ position: 'relative', width, height, background: '#f2f0e9', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block', touchAction: 'none', cursor: getCursor() }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Basemap */}
        {basemapImage && (
          <image
            href={basemapImage}
            x={imageBounds.x}
            y={imageBounds.y}
            width={imageBounds.width}
            height={imageBounds.height}
            preserveAspectRatio="none"
            pointerEvents="none"
          />
        )}

        {/* Unselected Marks */}
        <g pointerEvents="none">
          {shops.map((shop, i) => {
            const isSelected = normBox &&
              shop.x >= normBox.minX && shop.x <= normBox.maxX &&
              shop.y >= normBox.minY && shop.y <= normBox.maxY;
            
            if (isSelected) return null;
            return (
              <circle
                key={shop.shop_id || i}
                cx={shop.x}
                cy={shop.y}
                r={3}
                fill="none"
                stroke="rgba(26,26,26,0.4)"
                strokeWidth={1.5}
              />
            );
          })}
        </g>

        {/* Selection Overlay & Handles */}
        {normBox && (
          <g pointerEvents="none">
            <rect
              x={normBox.minX}
              y={normBox.minY}
              width={normBox.maxX - normBox.minX}
              height={normBox.maxY - normBox.minY}
              fill="rgba(234, 88, 12, 0.15)"
              stroke="#ea580c"
              strokeWidth={2}
            />
            {[
              // Corners
              [normBox.minX, normBox.minY],
              [normBox.maxX, normBox.minY],
              [normBox.minX, normBox.maxY],
              [normBox.maxX, normBox.maxY],
              // Edges
              [(normBox.minX + normBox.maxX) / 2, normBox.minY],
              [(normBox.minX + normBox.maxX) / 2, normBox.maxY],
              [normBox.maxX, (normBox.minY + normBox.maxY) / 2],
              [normBox.minX, (normBox.minY + normBox.maxY) / 2]
            ].map(([hx, hy], i) => (
              <rect
                key={i}
                x={hx - 4.5}
                y={hy - 4.5}
                width={9}
                height={9}
                fill="#f7f0e6"
                stroke="#1a1a1a"
                strokeWidth={2}
              />
            ))}
          </g>
        )}

        {/* Selected Marks (drawn on top) */}
        <g pointerEvents="none">
          {shops.map((shop, i) => {
            const isSelected = normBox &&
              shop.x >= normBox.minX && shop.x <= normBox.maxX &&
              shop.y >= normBox.minY && shop.y <= normBox.maxY;
            
            if (!isSelected) return null;
            return (
              <circle
                key={shop.shop_id || i}
                cx={shop.x}
                cy={shop.y}
                r={4}
                fill="#ea580c"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            );
          })}
        </g>
      </svg>

      {/* Readout Card */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        pointerEvents: 'none',
        background: '#f7f0e6',
        border: '2px solid #1a1a1a',
        boxShadow: '4px 4px 0px rgba(26,26,26,0.15)',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 32, fontWeight: 600, color: '#1a1a1a', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {normBox ? selectedShops.length : 0}
        </div>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 18, color: '#4a4a4a', lineHeight: 1 }}>
          {normBox && selectedShops.length > 0 ? `${meanWait} min wait` : '-- min wait'}
        </div>
      </div>

      {/* Instruction */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        pointerEvents: 'none',
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 15,
        fontWeight: 500,
        color: '#1a1a1a',
        textShadow: '0 1px 2px rgba(242,240,233,0.9), 0 -1px 2px rgba(242,240,233,0.9), 1px 0 2px rgba(242,240,233,0.9), -1px 0 2px rgba(242,240,233,0.9)'
      }}>
        drag the box, a corner, or a side
      </div>
    </div>
  );
}