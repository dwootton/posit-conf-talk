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
    }, [model, React]);

    const width = 352;
    const height = 400;

    const projection = React.useMemo(() => {
        return d3.geoMercator().fitExtent(
            [[0, 0], [width, height]],
            { type: "MultiPoint", coordinates: [[-95.615, 29.600], [-95.255, 29.880]] }
        );
    }, []);

    const [nwX, nwY] = projection([-95.615, 29.880]);
    const [seX, seY] = projection([-95.255, 29.600]);

    const svgRef = React.useRef(null);
    const svgRectRef = React.useRef(null);

    const updateRect = React.useCallback(() => {
        if (svgRef.current) {
            svgRectRef.current = svgRef.current.getBoundingClientRect();
        }
    }, []);

    React.useEffect(() => {
        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [updateRect]);

    const [dragState, setDragState] = React.useState({
        active: false,
        start: null,
        current: null,
        finalized: null
    });

    const getCoords = (e) => {
        if (!svgRectRef.current) updateRect();
        const rect = svgRectRef.current;
        return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const handlePointerDown = (e) => {
        updateRect();
        e.target.setPointerCapture(e.pointerId);
        const coords = getCoords(e);
        setDragState({
            active: true,
            start: coords,
            current: coords,
            finalized: null
        });
    };

    const handlePointerMove = (e) => {
        if (!dragState.active) return;
        setDragState(prev => ({ ...prev, current: getCoords(e) }));
    };

    const handlePointerUp = (e) => {
        if (!dragState.active) return;
        e.target.releasePointerCapture(e.pointerId);
        const coords = getCoords(e);
        setDragState(prev => ({
            active: false,
            start: null,
            current: null,
            finalized: [prev.start, coords]
        }));
    };

    let activeBounds = null;
    if (dragState.active && dragState.start && dragState.current) {
        activeBounds = [
            [Math.min(dragState.start[0], dragState.current[0]), Math.min(dragState.start[1], dragState.current[1])],
            [Math.max(dragState.start[0], dragState.current[0]), Math.max(dragState.start[1], dragState.current[1])]
        ];
    } else if (dragState.finalized) {
        activeBounds = [
            [Math.min(dragState.finalized[0][0], dragState.finalized[1][0]), Math.min(dragState.finalized[0][1], dragState.finalized[1][1])],
            [Math.max(dragState.finalized[0][0], dragState.finalized[1][0]), Math.max(dragState.finalized[0][1], dragState.finalized[1][1])]
        ];
    }

    const selectedShops = React.useMemo(() => {
        if (!activeBounds) return [];
        return data.filter(d => {
            const [x, y] = projection([d.longitude, d.latitude]);
            return x >= activeBounds[0][0] && x <= activeBounds[1][0] &&
                   y >= activeBounds[0][1] && y <= activeBounds[1][1];
        });
    }, [data, projection, activeBounds]);

    const count = selectedShops.length;
    const meanWait = count > 0 ? d3.mean(selectedShops, d => d.weekend_wait_min) : null;
    const meanWaitStr = meanWait !== null ? `${meanWait.toFixed(1)} min wait` : "-- min wait";

    const textShadow = '1px 1px 0 #f2f0e9, -1px -1px 0 #f2f0e9, 1px -1px 0 #f2f0e9, -1px 1px 0 #f2f0e9, 0px 2px 4px rgba(0,0,0,0.15)';

    return (
        <div style={{ width: 352, height: 400, backgroundColor: '#f2f0e9', overflow: 'hidden', position: 'relative', userSelect: 'none' }}>
            <svg
                ref={svgRef}
                width={352}
                height={400}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ position: 'absolute', top: 0, left: 0, touchAction: 'none', cursor: 'crosshair' }}
            >
                {basemapImage && (
                    <image
                        href={basemapImage}
                        x={nwX}
                        y={nwY}
                        width={seX - nwX}
                        height={seY - nwY}
                        preserveAspectRatio="none"
                        style={{ pointerEvents: 'none' }}
                    />
                )}
                
                {data.map(d => {
                    const [x, y] = projection([d.longitude, d.latitude]);
                    const isSelected = activeBounds && selectedShops.includes(d);
                    return (
                        <circle
                            key={d.shop_id}
                            cx={x}
                            cy={y}
                            r={isSelected ? 5 : 3}
                            fill={isSelected ? '#ea580c' : 'transparent'}
                            stroke={isSelected ? '#ffffff' : '#94a3b8'}
                            strokeWidth={1.5}
                            style={{ pointerEvents: 'none' }}
                        />
                    );
                })}

                {dragState.active && dragState.start && dragState.current && (
                    <rect
                        x={Math.min(dragState.start[0], dragState.current[0])}
                        y={Math.min(dragState.start[1], dragState.current[1])}
                        width={Math.abs(dragState.current[0] - dragState.start[0])}
                        height={Math.abs(dragState.current[1] - dragState.start[1])}
                        fill="rgba(234, 88, 12, 0.15)"
                        stroke="#ea580c"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        style={{ pointerEvents: 'none' }}
                    />
                )}
            </svg>

            <div style={{ position: 'absolute', top: 12, left: 12, pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 32, fontWeight: 700, color: '#1e293b', lineHeight: 1, textShadow }}>
                    {count}
                </span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 28, color: '#1e293b', marginTop: 4, fontWeight: 600, textShadow }}>
                    {meanWaitStr}
                </span>
            </div>
        </div>
    );
}