import * as d3 from "https://esm.sh/d3@7";

export const ReviewCard = ({ review, React }) => (
  <div style={{ marginTop: 16, paddingBottom: 16, borderBottom: '1px solid rgba(26,26,26,0.1)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 'bold', color: '#1a1a1a', fontSize: 14 }}>
        {review.reviewer}
      </span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#1a1a1a', fontSize: 12 }}>
        {review.stars}/5 &middot; {review.date}
      </span>
    </div>
    <div style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a', fontSize: 14, lineHeight: 1.4 }}>
      {review.text}
    </div>
  </div>
);

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(model.get("data") || []);
  const [reviews, setReviews] = React.useState(model.get("reviews") || []);
  const [basemapImage, setBasemapImage] = React.useState(model.get("basemap_image") || "");

  const [selectedShopId, setSelectedShopId] = React.useState(null);
  const [hoverState, setHoverState] = React.useState(null);

  const svgRef = React.useRef(null);
  const marksRef = React.useRef([]);
  const rectRef = React.useRef(null);

  const width = 814;
  const height = 548;
  const mapWidth = width * 0.58; // 472.12
  const panelWidth = width - mapWidth; // 341.88

  // Subscribe to model changes
  React.useEffect(() => {
    const onData = () => setData(model.get("data") || []);
    const onReviews = () => setReviews(model.get("reviews") || []);
    const onBasemap = () => setBasemapImage(model.get("basemap_image") || "");

    model.on("change:data", onData);
    model.on("change:reviews", onReviews);
    model.on("change:basemap_image", onBasemap);

    return () => {
      model.off("change:data", onData);
      model.off("change:reviews", onReviews);
      model.off("change:basemap_image", onBasemap);
    };
  }, [model]);

  // Cache SVG bounding rect as requested
  React.useEffect(() => {
    const updateRect = () => {
      if (svgRef.current) {
        rectRef.current = svgRef.current.getBoundingClientRect();
      }
    };
    
    // Initial measure after mount
    const timer = setTimeout(updateRect, 50);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true); 
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, []);

  // Base map and marks rendering
  React.useEffect(() => {
    if (!svgRef.current || !data.length || !basemapImage) return;

    const svg = d3.select(svgRef.current);

    const projection = d3.geoMercator()
      .fitExtent([[0, 0], [mapWidth, height]], {
        type: "MultiPoint",
        coordinates: [[-95.615, 29.600], [-95.255, 29.880]]
      });

    const [x1, y1] = projection([-95.615, 29.880]); // NW
    const [x2, y2] = projection([-95.255, 29.600]); // SE

    // Render Image
    let image = svg.select("image.basemap");
    if (image.empty()) {
      image = svg.append("image").attr("class", "basemap");
    }
    image.attr("href", basemapImage)
      .attr("x", x1)
      .attr("y", y1)
      .attr("width", x2 - x1)
      .attr("height", y2 - y1)
      .attr("preserveAspectRatio", "none");

    // Project and store marks data
    const marksData = data.map(d => {
      const [cx, cy] = projection([d.longitude, d.latitude]);
      return { ...d, cx, cy };
    });
    marksRef.current = marksData;

    // Render Marks Layer
    let marksLayer = svg.select("g.marks-layer");
    if (marksLayer.empty()) {
      marksLayer = svg.append("g").attr("class", "marks-layer");
    }

    marksLayer.selectAll("circle.shop-mark")
      .data(marksData, d => d.shop_id)
      .join("circle")
      .attr("class", "shop-mark")
      .attr("cx", d => d.cx)
      .attr("cy", d => d.cy)
      .attr("r", 5)
      .attr("fill", "#6b7280")
      .attr("stroke", "#1a1a1a")
      .attr("stroke-width", 1)
      .style("transition", "fill 0.15s, r 0.15s");

  }, [data, basemapImage, mapWidth, height]);

  // Selection styling update
  React.useEffect(() => {
    if (!svgRef.current) return;
    const marks = d3.select(svgRef.current).selectAll("circle.shop-mark");
    
    marks
      .attr("fill", d => d.shop_id === selectedShopId ? "#ea580c" : "#6b7280")
      .attr("r", d => d.shop_id === selectedShopId ? 8 : 5);
      
    marks.filter(d => d.shop_id === selectedShopId).raise();
  }, [selectedShopId, data]);

  // Manual pointer event handlers
  const handlePointerMove = (e) => {
    if (!rectRef.current && svgRef.current) {
      rectRef.current = svgRef.current.getBoundingClientRect();
    }
    if (!rectRef.current) return;

    const x = e.clientX - rectRef.current.left;
    const y = e.clientY - rectRef.current.top;

    let closest = null;
    let minDist = 12; // Snap radius

    for (const mark of marksRef.current) {
      const dist = Math.hypot(mark.cx - x, mark.cy - y);
      if (dist < minDist) {
        minDist = dist;
        closest = mark;
      }
    }

    if (closest) {
      setHoverState({ shop: closest, x: closest.cx, y: closest.cy });
    } else {
      setHoverState(null);
    }
  };

  const handlePointerDown = () => {
    if (hoverState) {
      setSelectedShopId(hoverState.shop.shop_id);
    } else {
      setSelectedShopId(null);
    }
  };

  const selectedShop = React.useMemo(() => 
    data.find(d => d.shop_id === selectedShopId) || null
  , [data, selectedShopId]);

  const shopReviews = React.useMemo(() => {
    if (!selectedShopId) return [];
    return reviews
      .filter(r => r.shop_id === selectedShopId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [reviews, selectedShopId]);

  return (
    <div style={{ 
      display: 'flex', 
      width: width, 
      height: height, 
      background: '#f2f0e9', 
      overflow: 'hidden',
      userSelect: 'none'
    }}>
      <style>{`
        .reviews-scroll::-webkit-scrollbar { display: none; }
        .reviews-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Map Column */}
      <div style={{ position: 'relative', width: mapWidth, height: height }}>
        <svg 
          ref={svgRef} 
          width={mapWidth} 
          height={height} 
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerLeave={() => setHoverState(null)}
          style={{ cursor: hoverState ? 'pointer' : 'default', display: 'block' }}
        />
        
        {/* Tooltip Overlay */}
        {hoverState && (
          <div style={{
            position: 'absolute',
            left: Math.min(hoverState.x + 14, mapWidth - 160),
            top: Math.min(hoverState.y + 14, height - 60),
            background: '#f7f0e6',
            border: '1px solid #1a1a1a',
            boxShadow: '4px 4px 0px rgba(26,26,26,0.15)',
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' }}>
              {hoverState.shop.name}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#1a1a1a', marginTop: 2 }}>
              {hoverState.shop.neighborhood}
            </div>
          </div>
        )}
      </div>

      {/* Panel Column */}
      <div style={{ 
        width: panelWidth, 
        height: height, 
        borderLeft: '2px solid #1a1a1a', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        {!selectedShop ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <span style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a', fontSize: 14 }}>
              Click a shop on the map to pull its reviews.
            </span>
          </div>
        ) : (
          <>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 }}>
                {selectedShop.name}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#1a1a1a', marginBottom: 12 }}>
                {selectedShop.neighborhood}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ background: '#f7f0e6', border: '2px solid #1a1a1a', boxShadow: '2px 2px 0 #1a1a1a', padding: '8px 12px', flex: 1 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, textTransform: 'uppercase', color: '#4b5563', letterSpacing: 0.5 }}>Rating</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600, color: '#1a1a1a' }}>{selectedShop.rating}</div>
                </div>
                <div style={{ background: '#f7f0e6', border: '2px solid #1a1a1a', boxShadow: '2px 2px 0 #1a1a1a', padding: '8px 12px', flex: 1 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, textTransform: 'uppercase', color: '#4b5563', letterSpacing: 0.5 }}>Price Level</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600, color: '#1a1a1a' }}>{'$'.repeat(selectedShop.price_level)}</div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 24px 8px', background: '#e8e5d9', flexShrink: 0 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, color: '#1a1a1a' }}>
                REVIEWS
              </span>
            </div>
            
            <div className="reviews-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px', background: '#e8e5d9' }}>
              {shopReviews.length === 0 ? (
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6b7280', fontSize: 14, marginTop: 16 }}>
                  No reviews yet
                </div>
              ) : (
                shopReviews.map(r => (
                  <ReviewCard key={r.review_id} review={r} React={React} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}