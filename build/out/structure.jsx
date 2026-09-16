import * as d3 from "https://esm.sh/d3@7";

export const ToolbarButton = ({ React, label, active, color, isAction, onClick }) => (
    <button
        onClick={onClick}
        style={{
            flex: isAction ? 0 : 1,
            padding: '6px 10px',
            border: '2px solid #1a1a1a',
            background: active ? color : (isAction ? '#e5e2d9' : 'transparent'),
            color: active ? '#f2f0e9' : '#1a1a1a',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '15px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontWeight: 'bold',
            outline: 'none',
            whiteSpace: 'nowrap',
            boxShadow: active ? 'inset 2px 2px 0px rgba(0,0,0,0.2)' : '2px 2px 0px rgba(26,26,26,0.15)',
            transform: active ? 'translate(1px, 1px)' : 'none',
            transition: 'all 0.1s'
        }}
    >
        {label}
    </button>
);

export const MetricCard = ({ React, name, color, metrics }) => (
    <div style={{ 
        flex: 1, 
        border: '2px solid #1a1a1a', 
        padding: '12px', 
        background: '#f7f0e6', 
        boxShadow: '4px 4px 0px rgba(26,26,26,0.15)', 
        display: 'flex', 
        flexDirection: 'column' 
    }}>
        <div style={{ color, fontWeight: 'bold', fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', marginBottom: 12 }}>
            {name}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', display: 'flex', flexDirection: 'column', gap: 12, color: '#1a1a1a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ color: '#57534e' }}>Shops</span> 
                <span style={{ fontWeight: 'bold', fontSize: '28px' }}>{metrics.count}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ color: '#57534e' }}>Mean Wait</span> 
                <span style={{ fontWeight: 'bold', fontSize: '28px' }}>{metrics.meanWait ? metrics.meanWait.toFixed(1) : '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ color: '#57534e' }}>Med Wait</span> 
                <span style={{ fontWeight: 'bold', fontSize: '28px' }}>{metrics.medWait || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ color: '#57534e' }}>Rating</span> 
                <span style={{ fontWeight: 'bold', fontSize: '28px' }}>{metrics.meanRating ? metrics.meanRating.toFixed(1) : '-'}</span>
            </div>
        </div>
    </div>
);

export default function Widget({ model, React }) {
    const [data, setData] = React.useState(model.get("data") || []);
    const [basemapImage, setBasemapImage] = React.useState(model.get("basemap_image") || "");

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
    
    const containerRef = React.useRef(null);
    const mapRef = React.useRef(null);
    
    const groupAHoods = ["The Heights", "Garden Oaks", "Washington Ave", "Near Northside", "Spring Branch"];
    const groupBHoods = ["Montrose", "Midtown", "Museum District", "Rice Village", "Upper Kirby"];
    
    const getPreset = React.useCallback(() => {
        const preset = {};
        data.forEach(d => {
            if (groupAHoods.includes(d.neighborhood)) preset[d.shop_id] = 'A';
            else if (groupBHoods.includes(d.neighborhood)) preset[d.shop_id] = 'B';
            else preset[d.shop_id] = null;
        });
        return preset;
    }, [data]);

    const [assignments, setAssignments] = React.useState(getPreset());
    const [activeTool, setActiveTool] = React.useState('A');
    const [history, setHistory] = React.useState([]);
    const [hover, setHover] = React.useState(null);

    const stateRefs = React.useRef({ assignments, activeTool, history });
    React.useEffect(() => {
        stateRefs.current = { assignments, activeTool, history };
    }, [assignments, activeTool, history]);

    const pushHistoryRef = React.useRef();
    pushHistoryRef.current = (newAssignments) => {
        setHistory(prev => [...prev, stateRefs.current.assignments]);
        setAssignments(newAssignments);
    };

    React.useEffect(() => {
        if (!mapRef.current || data.length === 0 || !basemapImage) return;
        
        const container = d3.select(mapRef.current);
        container.selectAll('svg').remove();
        
        const svgWidth = 472;
        const svgHeight = 548;

        const svg = container.append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .style('display', 'block')
            .style('touch-action', 'none');

        const projection = d3.geoMercator().fitExtent(
            [[20, 20], [452, 528]],
            { type: "LineString", coordinates: [[-95.615, 29.880], [-95.255, 29.600]] }
        );

        const [nwX, nwY] = projection([-95.615, 29.880]);
        const [seX, seY] = projection([-95.255, 29.600]);

        svg.append('image')
            .attr('href', basemapImage)
            .attr('x', nwX)
            .attr('y', nwY)
            .attr('width', seX - nwX)
            .attr('height', seY - nwY)
            .attr('preserveAspectRatio', 'none');

        const brushG = svg.append('g').attr('class', 'brush-layer');
        const selectionRect = brushG.append('rect')
            .attr('class', 'selection')
            .attr('fill', 'none')
            .attr('stroke', '#f97316')
            .attr('stroke-dasharray', '4 4')
            .attr('stroke-width', 2)
            .style('display', 'none');

        let isDragging = false;
        let startX = 0, startY = 0;

        const getCoords = (e) => {
            const rect = svg.node().getBoundingClientRect();
            const scaleX = rect.width ? svgWidth / rect.width : 1;
            const scaleY = rect.height ? svgHeight / rect.height : 1;
            return [
                (e.clientX - rect.left) * scaleX,
                (e.clientY - rect.top) * scaleY
            ];
        };

        svg.on('pointerdown', (e) => {
            if (e.button !== 0 && e.type !== 'touchstart') return;
            if (e.target.tagName === 'circle') return;
            
            isDragging = true;
            const [x, y] = getCoords(e);
            startX = x;
            startY = y;
            
            selectionRect
                .attr('x', x)
                .attr('y', y)
                .attr('width', 0)
                .attr('height', 0)
                .style('display', 'block');
                
            try { svg.node().setPointerCapture(e.pointerId); } catch(err) {}
        });

        svg.on('pointermove', (e) => {
            if (!isDragging) return;
            const [currX, currY] = getCoords(e);
            
            selectionRect
                .attr('x', Math.min(startX, currX))
                .attr('y', Math.min(startY, currY))
                .attr('width', Math.abs(currX - startX))
                .attr('height', Math.abs(currY - startY));
        });

        svg.on('pointerup pointercancel', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            try { svg.node().releasePointerCapture(e.pointerId); } catch(err) {}
            selectionRect.style('display', 'none');
            
            const [currX, currY] = getCoords(e);
            const x0 = Math.min(startX, currX);
            const x1 = Math.max(startX, currX);
            const y0 = Math.min(startY, currY);
            const y1 = Math.max(startY, currY);
            
            if (x1 - x0 > 2 && y1 - y0 > 2) {
                const { assignments: currAssig, activeTool: tool } = stateRefs.current;
                const nextAssig = { ...currAssig };
                let changed = false;

                data.forEach(d => {
                    const [px, py] = projection([d.longitude, d.latitude]);
                    if (px >= x0 && px <= x1 && py >= y0 && py <= y1) {
                        const val = tool === 'Clear' ? null : tool;
                        if (nextAssig[d.shop_id] !== val) {
                            nextAssig[d.shop_id] = val;
                            changed = true;
                        }
                    }
                });

                if (changed) pushHistoryRef.current(nextAssig);
            }
        });

        svg.append('g').attr('class', 'shops-layer');

        return () => container.selectAll('svg').remove();
    }, [data, basemapImage]);

    React.useEffect(() => {
        if (!mapRef.current) return;
        const svg = d3.select(mapRef.current).select('svg');
        if (svg.empty()) return;

        const projection = d3.geoMercator().fitExtent(
            [[20, 20], [452, 528]],
            { type: "LineString", coordinates: [[-95.615, 29.880], [-95.255, 29.600]] }
        );

        const shops = svg.select('.shops-layer')
            .selectAll('circle')
            .data(data, d => d.shop_id);

        shops.enter().append('circle')
            .attr('cx', d => projection([d.longitude, d.latitude])[0])
            .attr('cy', d => projection([d.longitude, d.latitude])[1])
            .style('cursor', 'pointer')
            .on('click', (e, d) => {
                const { assignments: currAssig, activeTool: tool } = stateRefs.current;
                const val = tool === 'Clear' ? null : tool;
                if (currAssig[d.shop_id] !== val) {
                    pushHistoryRef.current({ ...currAssig, [d.shop_id]: val });
                }
            })
            .on('mouseenter', (e, d) => {
                const [cx, cy] = projection([d.longitude, d.latitude]);
                setHover({
                    shop: d,
                    x: cx,
                    y: cy
                });
            })
            .on('mouseleave', () => setHover(null))
            .merge(shops)
            .attr('r', d => assignments[d.shop_id] ? 5 : 3)
            .attr('fill', d => {
                const g = assignments[d.shop_id];
                return g === 'A' ? '#478d4b' : g === 'B' ? '#9f2d1f' : 'transparent';
            })
            .attr('stroke', d => assignments[d.shop_id] ? '#ffffff' : '#1a1a1a')
            .attr('stroke-width', d => assignments[d.shop_id] ? 1.5 : 1.5);

        shops.exit().remove();
    }, [data, assignments]);

    const groupA = data.filter(d => assignments[d.shop_id] === 'A');
    const groupB = data.filter(d => assignments[d.shop_id] === 'B');

    const calcMetrics = (group) => {
        if (group.length === 0) return { count: 0, meanWait: 0, medWait: 0, meanRating: 0 };
        return {
            count: group.length,
            meanWait: d3.mean(group, d => d.weekend_wait_min),
            medWait: d3.median(group, d => d.weekend_wait_min),
            meanRating: d3.mean(group, d => d.rating)
        };
    };

    const metricsA = calcMetrics(groupA);
    const metricsB = calcMetrics(groupB);

    const maxWait = Math.max(metricsA.meanWait || 0, metricsB.meanWait || 0);
    const chartWidth = 292;
    const maxBarWidth = 240;
    const xDomainMax = maxWait > 0 ? maxWait * 1.2 : 10;
    const xScale = d3.scaleLinear().domain([0, xDomainMax]).range([0, maxBarWidth]);
    
    // Request 3 ticks to typically get 3-4 nice round numbers
    let ticks = xScale.ticks(3);
    if (ticks.length > 4) ticks = ticks.slice(0, 4);

    let comparisonNode = <span>Assign shops to both groups</span>;
    if (metricsA.count > 0 && metricsB.count > 0) {
        const diff = Math.abs(metricsA.meanWait - metricsB.meanWait).toFixed(1);
        if (metricsA.meanWait > metricsB.meanWait) {
            comparisonNode = <span>Group A waits <span style={{ fontSize: '28px', fontWeight: 'bold' }}>{diff}</span> min longer</span>;
        } else if (metricsB.meanWait > metricsA.meanWait) {
            comparisonNode = <span>Group B waits <span style={{ fontSize: '28px', fontWeight: 'bold' }}>{diff}</span> min longer</span>;
        } else {
            comparisonNode = <span>Both groups have the same wait time</span>;
        }
    }

    return (
        <div ref={containerRef} style={{
            width: 814,
            height: 548,
            display: 'flex',
            background: '#f7f0e6',
            color: '#1a1a1a',
            fontFamily: 'Space Grotesk, sans-serif',
            position: 'relative',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            <div ref={mapRef} style={{ width: 472, height: 548, position: 'relative' }} />
            
            <div style={{ width: 2, height: 548, background: '#1a1a1a' }} />
            
            <div style={{ width: 340, height: 548, padding: 16, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    <ToolbarButton React={React} label="Group A" active={activeTool === 'A'} color="#478d4b" onClick={() => setActiveTool('A')} />
                    <ToolbarButton React={React} label="Group B" active={activeTool === 'B'} color="#9f2d1f" onClick={() => setActiveTool('B')} />
                    <ToolbarButton React={React} label="Clear" active={activeTool === 'Clear'} color="#78716c" onClick={() => setActiveTool('Clear')} />
                    <div style={{ width: 4 }} />
                    <ToolbarButton React={React} label="Undo" isAction={true} onClick={() => {
                        if (history.length > 0) {
                            setAssignments(history[history.length - 1]);
                            setHistory(history.slice(0, -1));
                        }
                    }} />
                    <ToolbarButton React={React} label="Reset" isAction={true} onClick={() => {
                        setAssignments(getPreset());
                        setHistory([]);
                    }} />
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                    <MetricCard React={React} name="Group A" color="#478d4b" metrics={metricsA} />
                    <MetricCard React={React} name="Group B" color="#9f2d1f" metrics={metricsB} />
                </div>

                <div style={{ flex: 1 }}>
                    <svg width={chartWidth} height={90} style={{ overflow: 'visible' }}>
                        <line x1={0} y1={0} x2={0} y2={60} stroke="#1a1a1a" strokeWidth={2} />
                        
                        <rect x={2} y={10} width={xScale(metricsA.meanWait || 0)} height={16} fill="#478d4b" />
                        <rect x={2} y={34} width={xScale(metricsB.meanWait || 0)} height={16} fill="#9f2d1f" />
                        
                        <line x1={0} y1={60} x2={chartWidth} y2={60} stroke="#1a1a1a" strokeWidth={2} />

                        {ticks.map(t => (
                            <g key={t} transform={`translate(${xScale(t)}, 60)`}>
                                <line y2={6} stroke="#1a1a1a" strokeWidth={1.5} />
                                <text y={22} fontSize={14} fontFamily="JetBrains Mono, monospace" fill="#1a1a1a" textAnchor="middle">
                                    {t}
                                </text>
                            </g>
                        ))}
                    </svg>
                    
                    <div style={{ 
                        marginTop: 10, 
                        fontFamily: 'JetBrains Mono, monospace', 
                        fontSize: '15px', 
                        color: '#1a1a1a',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}>
                        {comparisonNode}
                    </div>
                </div>
            </div>

            {hover && (
                <div style={{
                    position: 'absolute',
                    left: hover.x,
                    top: hover.y - 12,
                    transform: 'translate(-50%, -100%)',
                    background: '#f7f0e6',
                    border: '2px solid #1a1a1a',
                    boxShadow: '4px 4px 0px rgba(26,26,26,0.15)',
                    padding: '12px 16px',
                    pointerEvents: 'none',
                    zIndex: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '15px',
                    color: '#1a1a1a',
                    width: 'max-content'
                }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', fontFamily: 'Space Grotesk, sans-serif' }}>
                        {hover.shop.name}
                    </div>
                    <div style={{ color: '#57534e', marginTop: 4 }}>{hover.shop.neighborhood}</div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <span>Weekend Wait</span>
                        <span style={{ fontWeight: 'bold' }}>{hover.shop.weekend_wait_min}m</span>
                    </div>
                    {assignments[hover.shop.shop_id] && (
                        <div style={{
                            color: assignments[hover.shop.shop_id] === 'A' ? '#478d4b' : '#9f2d1f',
                            fontWeight: 'bold',
                            marginTop: 8,
                            textTransform: 'uppercase'
                        }}>
                            Group {assignments[hover.shop.shop_id]}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}