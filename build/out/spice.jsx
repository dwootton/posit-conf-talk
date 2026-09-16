import * as d3 from "https://esm.sh/d3@7";

export const Toggle = ({ checked, onChange, label, React }) => {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
      fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', color: '#1a1a1a', textTransform: 'uppercase',
      background: '#f7f0e6', padding: '6px 8px', border: '2px solid #1a1a1a', boxShadow: '2px 2px 0 #1a1a1a'
    }}>
      {label}
      <div style={{
        width: '24px', height: '14px', borderRadius: '7px',
        background: checked ? '#f97316' : '#cbd5e1',
        border: '2px solid #1a1a1a',
        position: 'relative', transition: 'background 0.2s'
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%', background: '#f7f0e6',
          border: '2px solid #1a1a1a',
          position: 'absolute', top: '2px', left: checked ? '12px' : '2px',
          transition: 'left 0.2s'
        }} />
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
    </label>
  );
};

export const Tooltip = ({ shop, x, y, React }) => {
  if (!shop) return null;

  const isRight = x > 176;
  const isBottom = y > 200;

  const style = {
    position: 'absolute',
    left: isRight ? 'auto' : `${x + 12}px`,
    right: isRight ? `${352 - x + 12}px` : 'auto',
    top: isBottom ? 'auto' : `${y + 12}px`,
    bottom: isBottom ? `${400 - y + 12}px` : 'auto',
    background: '#f7f0e6',
    border: '2px solid #1a1a1a',
    boxShadow: '4px 4px 0 #1a1a1a',
    padding: '10px 12px',
    pointerEvents: 'none',
    zIndex: 20,
    width: 'max-content',
    maxWidth: '250px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  };

  return (
    <div style={style}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '15px', color: '#1a1a1a', lineHeight: 1.1 }}>
        {shop.name}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', color: '#64748b', textTransform: 'uppercase' }}>
        {shop.neighborhood}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', color: '#1a1a1a', marginTop: '2px' }}>
        {shop.signature_donut}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '28px', color: '#f97316', fontWeight: 'bold' }}>
        ★ {Number(shop.rating).toFixed(1)}
      </div>
    </div>
  );
};

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(model.get("data") || []);
  const [basemapImage, setBasemapImage] = React.useState(model.get("basemap_image") || "");
  const [pumpkinSpiceOnly, setPumpkinSpiceOnly] = React.useState(false);
  const [hoveredShop, setHoveredShop] = React.useState(null);
  
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const onDataChange = () => setData(model.get("data") || []);
    const onBasemapImageChange = () => setBasemapImage(model.get("basemap_image") || "");

    model.on("change:data", onDataChange);
    model.on("change:basemap_image", onBasemapImageChange);

    return () => {
      model.off("change:data", onDataChange);
      model.off("change:basemap_image", onBasemapImageChange);
    };
  }, [model]);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const width = 352;
    const height = 400;

    const container = d3.select(containerRef.current);
    container.selectAll("*").remove();

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("background", "transparent");

    const projection = d3.geoMercator().fitExtent(
      [[10, 40], [width - 10, height - 10]],
      { type: "MultiPoint", coordinates: [[-95.615, 29.600], [-95.255, 29.880]] }
    );

    if (basemapImage) {
      const [nwX, nwY] = projection([-95.615, 29.880]);
      const [seX, seY] = projection([-95.255, 29.600]);

      svg.append("image")
        .attr("href", basemapImage)
        .attr("x", nwX)
        .attr("y", nwY)
        .attr("width", seX - nwX)
        .attr("height", seY - nwY)
        .attr("preserveAspectRatio", "none");
    }

    const visibleShops = pumpkinSpiceOnly ? data.filter(d => d.pumpkin_spice) : data;

    const shopGroups = svg.append("g")
      .selectAll("g.shop")
      .data(visibleShops, d => d.shop_id)
      .join("g")
      .attr("class", "shop")
      .attr("transform", d => `translate(${projection([d.longitude, d.latitude])})`);

    shopGroups.append("circle")
      .attr("r", 4.5)
      .attr("fill", "#9f2d1f")
      .attr("stroke", "#1a1a1a")
      .attr("stroke-width", 1.5);

    const placedBoxes = [];

    shopGroups.append("text")
      .text(d => d.name)
      .attr("font-family", "'Space Grotesk', sans-serif")
      .attr("font-size", "15px")
      .attr("fill", "#1a1a1a")
      .attr("font-weight", "600")
      .attr("stroke", "#f7f0e6")
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .attr("paint-order", "stroke")
      .style("pointer-events", "none")
      .each(function(d) {
        const node = d3.select(this);
        const [cx, cy] = projection([d.longitude, d.latitude]);
        
        let w = d.name.length * 9;
        try {
          const bbox = this.getBBox();
          if (bbox.width) w = bbox.width;
        } catch(e) {}
        
        const h = 15;
        const gap = 10;

        const candidates = [
          { x: gap, y: 0, anchor: "start", baseline: "central", box: [cx + gap, cy - h/2, cx + gap + w, cy + h/2] },
          { x: -gap, y: 0, anchor: "end", baseline: "central", box: [cx - gap - w, cy - h/2, cx - gap, cy + h/2] },
          { x: 0, y: -gap, anchor: "middle", baseline: "auto", box: [cx - w/2, cy - gap - h, cx + w/2, cy - gap] },
          { x: 0, y: gap, anchor: "middle", baseline: "hanging", box: [cx - w/2, cy + gap, cx + w/2, cy + gap + h] }
        ];

        let placed = false;
        for (const cand of candidates) {
          const [x1, y1, x2, y2] = cand.box;
          
          if (x1 < 0 || y1 < 0 || x2 > width || y2 > height) continue;
          
          let overlap = false;
          for (const p of placedBoxes) {
            if (!(x2 + 1 < p[0] || x1 - 1 > p[2] || y2 + 1 < p[1] || y1 - 1 > p[3])) {
              overlap = true;
              break;
            }
          }
          
          if (!overlap) {
            placedBoxes.push(cand.box);
            node.attr("x", cand.x)
                .attr("y", cand.y)
                .attr("text-anchor", cand.anchor)
                .attr("dominant-baseline", cand.baseline);
            placed = true;
            break;
          }
        }

        if (!placed) {
          node.remove();
        }
      });

    shopGroups.append("circle")
      .attr("r", 12)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseenter", (e, d) => {
        const [x, y] = projection([d.longitude, d.latitude]);
        setHoveredShop({ shop: d, x, y });
      })
      .on("mouseleave", () => {
        setHoveredShop(null);
      });

    return () => {
      container.selectAll("*").remove();
    };
  }, [data, basemapImage, pumpkinSpiceOnly]);

  return (
    <div style={{ width: 352, height: 400, position: 'relative', background: '#f7f0e6', overflow: 'hidden', margin: 0, padding: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
        <Toggle
          label="pumpkin spice only"
          checked={pumpkinSpiceOnly}
          onChange={(e) => setPumpkinSpiceOnly(e.target.checked)}
          React={React}
        />
      </div>

      <Tooltip 
        shop={hoveredShop?.shop} 
        x={hoveredShop?.x} 
        y={hoveredShop?.y} 
        React={React} 
      />
    </div>
  );
}