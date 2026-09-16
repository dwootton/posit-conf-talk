import * as d3 from "https://esm.sh/d3@7";

export const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getMode = (arr) => {
  if (!arr || arr.length === 0) return null;
  const counts = {};
  let maxCount = 0;
  let mode = arr[0];
  for (const val of arr) {
    counts[val] = (counts[val] || 0) + 1;
    if (counts[val] > maxCount) {
      maxCount = counts[val];
      mode = val;
    }
  }
  return mode;
};

export const StatTile = ({ React, label, value }) => (
  <div style={{
    background: "#f7f0e6",
    border: "2px solid #1a1a1a",
    padding: "8px 12px",
    boxShadow: "2px 2px 0 #1a1a1a",
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  }}>
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "15px",
      textTransform: "uppercase",
      color: "#4b5563",
      letterSpacing: "0.5px"
    }}>
      {label}
    </div>
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "28px",
      fontWeight: 600,
      color: "#1a1a1a"
    }}>
      {value}
    </div>
  </div>
);

export const SliderRow = ({ React, value, onChange }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "8px", borderBottom: "2px solid #1a1a1a" }}>
    <input
      type="range"
      min="0.25"
      max="4"
      step="0.05"
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{ flex: 1, accentColor: "#f97316", cursor: "pointer" }}
    />
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "28px",
      fontWeight: 600,
      color: "#1a1a1a",
      width: "140px",
      textAlign: "right"
    }}>
      {value.toFixed(2)} mi
    </div>
  </div>
);

const WIDTH = 472;
// The widget frame is 814x548 border-box with a 2px border, so the map column's
// content box is 4px shorter than the frame. The SVG has to match that, not the
// frame, or it overhangs and the panel beside it is clipped at the bottom.
const HEIGHT = 544;
const NW = [-95.615, 29.880];
const SE = [-95.255, 29.600];

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(model.get("data") || []);
  const [basemapImage, setBasemapImage] = React.useState(model.get("basemap_image") || "");

  React.useEffect(() => {
    const handleData = () => setData(model.get("data") || []);
    const handleBasemapImage = () => setBasemapImage(model.get("basemap_image") || "");

    model.on("change:data", handleData);
    model.on("change:basemap_image", handleBasemapImage);

    return () => {
      model.off("change:data", handleData);
      model.off("change:basemap_image", handleBasemapImage);
    };
  }, [model]);

  const [target, setTarget] = React.useState([-95.3862, 29.7452]);
  const [radius, setRadius] = React.useState(0.8);
  const [hovered, setHovered] = React.useState(null);

  const mapRef = React.useRef(null);
  const sceneRef = React.useRef(null);
  const setTargetRef = React.useRef(setTarget);
  setTargetRef.current = setTarget;

  React.useEffect(() => {
    model.set("target_lon", target[0]);
    model.set("target_lat", target[1]);
    model.set("search_radius", radius);
    model.save_changes();
  }, [target, radius, model]);

  const shopsWithDist = React.useMemo(() => {
    return data.map(s => ({
      ...s,
      distance: haversine(target[1], target[0], s.latitude, s.longitude)
    }));
  }, [data, target]);

  const inRange = React.useMemo(() => {
    return shopsWithDist
      .filter(s => s.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [shopsWithDist, radius]);

  const handleKeyDown = (e) => {
    const step = 0.005;
    if (e.key === 'ArrowUp') { e.preventDefault(); setTarget(t => [t[0], t[1] + step]); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setTarget(t => [t[0], t[1] - step]); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setTarget(t => [t[0] - step, t[1]]); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setTarget(t => [t[0] + step, t[1]]); }
  };

  React.useEffect(() => {
    if (!mapRef.current) return;

    const container = d3.select(mapRef.current);
    container.selectAll("*").remove();

    const svg = container.append("svg")
      .attr("width", WIDTH)
      .attr("height", HEIGHT)
      .style("background", "#f7f0e6");

    const projection = d3.geoMercator().fitExtent(
      [[16, 16], [WIDTH - 16, HEIGHT - 16]],
      { type: "MultiPoint", coordinates: [NW, SE] }
    );
    const path = d3.geoPath().projection(projection);

    const drag = d3.drag().on("drag", (event) => {
      const svgNode = svg.node();
      const rect = svgNode.getBoundingClientRect();
      const srcEvent = event.sourceEvent;

      let clientX = srcEvent.clientX;
      let clientY = srcEvent.clientY;
      if (srcEvent.touches && srcEvent.touches.length > 0) {
        clientX = srcEvent.touches[0].clientX;
        clientY = srcEvent.touches[0].clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const [lon, lat] = projection.invert([x, y]);
      const cLon = Math.max(NW[0], Math.min(SE[0], lon));
      const cLat = Math.max(SE[1], Math.min(NW[1], lat));
      setTargetRef.current([cLon, cLat]);
    });

    svg.append("rect")
      .attr("width", WIDTH)
      .attr("height", HEIGHT)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .call(drag);

    if (basemapImage) {
      const nw = projection(NW);
      const se = projection(SE);

      svg.append("image")
        .attr("href", basemapImage)
        .attr("x", nw[0])
        .attr("y", nw[1])
        .attr("width", se[0] - nw[0])
        .attr("height", se[1] - nw[1])
        .attr("preserveAspectRatio", "none")
        .style("pointer-events", "none");
    }

    const regionPath = svg.append("path")
      .attr("fill", "#475569")
      .attr("fill-opacity", 0.15)
      .attr("stroke", "#475569")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 4")
      .style("pointer-events", "none");

    const crosshair = svg.append("g").style("pointer-events", "none");
    crosshair.append("circle")
      .attr("r", 4).attr("fill", "none").attr("stroke", "#f97316").attr("stroke-width", 2);
    crosshair.append("line")
      .attr("x1", -8).attr("x2", 8).attr("y1", 0).attr("y2", 0)
      .attr("stroke", "#f97316").attr("stroke-width", 2);
    crosshair.append("line")
      .attr("x1", 0).attr("x2", 0).attr("y1", -8).attr("y2", 8)
      .attr("stroke", "#f97316").attr("stroke-width", 2);

    const marksLayer = svg.append("g");

    sceneRef.current = { svg, projection, path, regionPath, crosshair, marksLayer };

    return () => {
      svg.remove();
      sceneRef.current = null;
    };
  }, [basemapImage]);

  React.useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const { projection, path, regionPath, crosshair, marksLayer } = scene;

    const circleGeo = d3.geoCircle()
      .center(target)
      .radius(radius / 3958.8 * 180 / Math.PI)();
    regionPath.attr("d", path(circleGeo));

    const [tx, ty] = projection(target);
    crosshair.attr("transform", `translate(${tx},${ty})`);

    marksLayer.selectAll("circle")
      .data(shopsWithDist, d => d.shop_id)
      .join("circle")
      .attr("cx", d => projection([d.longitude, d.latitude])[0])
      .attr("cy", d => projection([d.longitude, d.latitude])[1])
      .attr("r", d => d.distance <= radius ? 5 : 3)
      .attr("fill", d => d.distance <= radius ? "#475569" : "transparent")
      .attr("stroke", d => d.distance <= radius ? "#f7f0e6" : "#4b5563")
      .attr("stroke-width", d => d.distance <= radius ? 1.5 : 1)
      .style("cursor", "pointer")
      .on("mouseenter", (e, d) => {
        const [px, py] = projection([d.longitude, d.latitude]);
        setHovered({ shop: d, px, py });
      })
      .on("mouseleave", () => setHovered(null));
  }, [shopsWithDist, radius, target, basemapImage]);

  let ttLeft = 0, ttTop = 0;
  if (hovered) {
    ttLeft = hovered.px + 12;
    ttTop = hovered.py + 12;
    if (ttLeft + 280 > WIDTH) ttLeft = hovered.px - 292;
    if (ttTop + 100 > HEIGHT) ttTop = hovered.py - 112;
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        display: "flex",
        width: "814px",
        height: "548px",
        background: "#f7f0e6",
        border: "2px solid #1a1a1a",
        boxSizing: "border-box",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#1a1a1a",
        outline: "none"
      }}
    >
      <div style={{ width: "472px", height: "100%", position: "relative", flexShrink: 0 }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {hovered && (
          <div style={{
            position: "absolute",
            left: ttLeft,
            top: ttTop,
            background: "#f7f0e6",
            border: "2px solid #1a1a1a",
            boxShadow: "2px 2px 0 #1a1a1a",
            padding: "12px",
            pointerEvents: "none",
            zIndex: 10,
            width: "max-content",
            maxWidth: "280px"
          }}>
            <div style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1.2, marginBottom: "4px" }}>
              {hovered.shop.name}
            </div>
            <div style={{ fontSize: "15px", color: "#4b5563", marginBottom: "8px" }}>
              {hovered.shop.neighborhood}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "28px", color: "#f97316", fontWeight: 600 }}>
              {hovered.shop.distance.toFixed(2)} mi
            </div>
          </div>
        )}
      </div>

      <div style={{ width: "2px", height: "100%", background: "#1a1a1a", flexShrink: 0 }} />

      <div style={{
        flex: 1,
        height: "100%",
        boxSizing: "border-box",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        <SliderRow React={React} value={radius} onChange={setRadius} />

        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {inRange.length === 0 ? (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", color: "#6b7280", fontSize: "15px" }}>
              No shops in range
            </div>
          ) : (
            inRange.slice(0, 4).map(s => (
              <div key={s.shop_id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px dashed #a0a5a8",
                paddingBottom: "4px"
              }}>
                <div style={{ overflow: "hidden", paddingRight: "12px" }}>
                  <div style={{ fontWeight: 600, fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: "15px", color: "#4b5563", marginTop: "2px" }}>
                    {s.neighborhood}
                  </div>
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "28px",
                  color: "#1a1a1a",
                  flexShrink: 0
                }}>
                  {s.distance.toFixed(2)} mi
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}