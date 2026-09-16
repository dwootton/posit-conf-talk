import * as d3 from "https://esm.sh/d3@7";

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(model.get("data") || []);
  const [basemapImage, setBasemapImage] = React.useState(model.get("basemap_image") || "");

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

  const width = 352;
  const height = 400;

  const proj = React.useMemo(() => {
    return d3.geoMercator().fitExtent(
      [[0, 0], [width, height]],
      { type: "MultiPoint", coordinates: [[-95.615, 29.600], [-95.255, 29.880]] }
    );
  }, []);

  const imgBounds = React.useMemo(() => {
    const nw = proj([-95.615, 29.880]);
    const se = proj([-95.255, 29.600]);
    return { x: nw[0], y: nw[1], w: se[0] - nw[0], h: se[1] - nw[1] };
  }, [proj]);

  const projectedData = React.useMemo(() => {
    return data.map(d => {
      const [x, y] = proj([d.longitude, d.latitude]);
      return { ...d, x, y };
    });
  }, [data, proj]);

  const svgRef = React.useRef(null);
  const [selection, setSelection] = React.useState(null);
  const dragState = React.useRef({ type: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, selStart: null });
  const selectionRef = React.useRef(selection);

  React.useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const getCoords = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e) => {
    const { x, y } = getCoords(e);
    if (svgRef.current) {
      svgRef.current.setPointerCapture(e.pointerId);
      svgRef.current.focus();
    }

    if (selection && x >= selection.x && x <= selection.x + selection.w && y >= selection.y && y <= selection.y + selection.h) {
      dragState.current = {
        type: 'move',
        offsetX: x - selection.x,
        offsetY: y - selection.y,
        selStart: { ...selection }
      };
    } else {
      dragState.current = { type: 'draw', startX: x, startY: y };
      setSelection({ x, y, w: 0, h: 0 });
    }
  };

  const onPointerMove = (e) => {
    const { x, y } = getCoords(e);

    if (dragState.current.type === 'draw') {
      const startX = dragState.current.startX;
      const startY = dragState.current.startY;
      setSelection({
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        w: Math.abs(x - startX),
        h: Math.abs(y - startY)
      });
    } else if (dragState.current.type === 'move') {
      const sel = dragState.current.selStart;
      let newX = x - dragState.current.offsetX;
      let newY = y - dragState.current.offsetY;
      
      newX = Math.max(0, Math.min(newX, width - sel.w));
      newY = Math.max(0, Math.min(newY, height - sel.h));
      
      setSelection({ ...sel, x: newX, y: newY });
    } else {
      if (svgRef.current) {
        if (selection && x >= selection.x && x <= selection.x + selection.w && y >= selection.y && y <= selection.y + selection.h) {
          if (svgRef.current.style.cursor !== 'move') svgRef.current.style.cursor = 'move';
        } else {
          if (svgRef.current.style.cursor !== 'crosshair') svgRef.current.style.cursor = 'crosshair';
        }
      }
    }
  };

  const onPointerUp = (e) => {
    if (svgRef.current) svgRef.current.releasePointerCapture(e.pointerId);
    if (dragState.current.type === 'draw') {
      const sel = selectionRef.current;
      if (sel && (sel.w < 2 || sel.h < 2)) {
        setSelection(null);
      }
    }
    dragState.current.type = null;
  };

  const onKeyDown = (e) => {
    if (!selection) return;

    let dx = 0;
    let dy = 0;
    const step = e.shiftKey ? 32 : 8;

    switch (e.key) {
      case 'ArrowUp':
        dy = -step;
        break;
      case 'ArrowDown':
        dy = step;
        break;
      case 'ArrowLeft':
        dx = -step;
        break;
      case 'ArrowRight':
        dx = step;
        break;
      default:
        return;
    }

    e.preventDefault();

    setSelection(prev => {
      if (!prev) return prev;
      let newX = prev.x + dx;
      let newY = prev.y + dy;
      
      newX = Math.max(0, Math.min(newX, width - prev.w));
      newY = Math.max(0, Math.min(newY, height - prev.h));
      
      return { ...prev, x: newX, y: newY };
    });
  };

  const selected = [];
  const unselected = [];

  projectedData.forEach(d => {
    if (selection && d.x >= selection.x && d.x <= selection.x + selection.w && d.y >= selection.y && d.y <= selection.y + selection.h) {
      selected.push(d);
    } else {
      unselected.push(d);
    }
  });

  const count = selection ? selected.length : 0;
  const meanWait = selection && count > 0 ? d3.mean(selected, d => d.weekend_wait_min).toFixed(1) : "--";

  return (
    <div style={{ width, height, position: 'relative', background: '#f2f0e9', overflow: 'hidden' }}>
      <style>{`
        .map-svg:focus {
          outline: none;
        }
        .map-svg:focus-visible {
          outline: 2px solid #ea580c;
          outline-offset: -2px;
        }
      `}</style>
      <svg
        ref={svgRef}
        className="map-svg"
        tabIndex="0"
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0, touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {basemapImage && (
          <image
            href={basemapImage}
            x={imgBounds.x}
            y={imgBounds.y}
            width={imgBounds.w}
            height={imgBounds.h}
            preserveAspectRatio="none"
            pointerEvents="none"
          />
        )}
        
        {selection && (
          <rect
            x={selection.x}
            y={selection.y}
            width={selection.w}
            height={selection.h}
            fill="rgba(234, 88, 12, 0.15)"
            stroke="#ea580c"
            strokeWidth={2}
            pointerEvents="none"
          />
        )}

        {unselected.map(d => (
          <circle 
            key={d.shop_id} 
            cx={d.x} 
            cy={d.y} 
            r={2.5} 
            fill="transparent" 
            stroke="#94a3b8" 
            strokeWidth={1.5} 
            pointerEvents="none" 
          />
        ))}

        {selected.map(d => (
          <circle 
            key={d.shop_id} 
            cx={d.x} 
            cy={d.y} 
            r={4} 
            fill="#ea580c" 
            stroke="#ffffff" 
            strokeWidth={1.5} 
            pointerEvents="none" 
          />
        ))}
      </svg>

      <div style={{
        position: 'absolute', 
        top: 12, 
        left: 12, 
        pointerEvents: 'none',
        fontFamily: "'JetBrains Mono', monospace", 
        color: '#1e293b'
      }}>
        <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 14, marginTop: 4, fontWeight: 500, color: '#475569' }}>{meanWait} min wait</div>
      </div>

      <div style={{
        position: 'absolute', 
        bottom: 12, 
        left: 12, 
        pointerEvents: 'none',
        fontFamily: "'Space Grotesk', sans-serif", 
        fontSize: 15, 
        color: '#64748b'
      }}>
        drag it, or use the arrow keys
      </div>
    </div>
  );
}