import * as d3 from "https://esm.sh/d3@7";

export default function Widget({ model, React }) {
  const [data, setData] = React.useState(model.get("data") || []);
  const [basemapImage, setBasemapImage] = React.useState(model.get("basemap_image") || "");
  const [hovered, setHovered] = React.useState(null);
  const [tooltipPos, setTooltipPos] = React.useState({ left: 0, top: 0 });
  const containerRef = React.useRef(null);

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

  React.useEffect(() => {
    if (!containerRef.current || !data.length) return;

    const width = 352;
    const height = 400;

    const container = d3.select(containerRef.current);
    container.selectAll("*").remove();

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("display", "block");

    const projection = d3
      .geoMercator()
      .fitExtent(
        [
          [10, 10],
          [width - 10, height - 20],
        ],
        {
          type: "MultiPoint",
          coordinates: [
            [-95.615, 29.600],
            [-95.255, 29.880],
          ],
        }
      );

    const waitExtent = d3.extent(data, (d) => d.weekend_wait_min);
    const rScale = d3.scaleSqrt().domain(waitExtent).range([3, 11]);

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

    const gMarks = svg.append("g").attr("class", "marks");
    const gLabels = svg.append("g").attr("class", "labels");
    const gLegend = svg.append("g").attr("transform", "translate(16, 380)");

    gMarks
      .selectAll(".shop")
      .data(data)
      .join("circle")
      .attr("class", "shop")
      .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
      .attr("cy", (d) => projection([d.longitude, d.latitude])[1])
      .attr("r", (d) => rScale(d.weekend_wait_min))
      .attr("fill", "#0f766e")
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 1)
      .attr("fill-opacity", 0.9)
      .style("cursor", "pointer")
      .on("mouseenter", (e, d) => {
        d3.select(e.currentTarget)
          .attr("stroke", "#f97316")
          .attr("stroke-width", 2)
          .raise();
        
        const rect = svg.node().getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const tw = 160;
        const th = 70;
        const pad = 12;
        let left = x + pad;
        let top = y + pad;
        if (left + tw > width) left = x - tw - pad;
        if (top + th > height) top = y - th - pad;
        
        setTooltipPos({ left, top });
        setHovered(d);
      })
      .on("mouseleave", (e) => {
        d3.select(e.currentTarget)
          .attr("stroke", "#1e293b")
          .attr("stroke-width", 1);
        setHovered(null);
      });

    const top5 = [...data]
      .sort((a, b) => b.weekend_wait_min - a.weekend_wait_min)
      .slice(0, 5);

    const placedBBoxes = [];

    gLabels
      .selectAll(".top-label")
      .data(top5)
      .join("text")
      .attr("class", "top-label")
      .text((d) => d.name)
      .attr("font-family", "'Space Grotesk', sans-serif")
      .attr("font-size", "10px")
      .attr("font-weight", "600")
      .attr("fill", "#1e293b")
      .style("pointer-events", "none")
      .style("paint-order", "stroke")
      .style("stroke", "#f7f0e6")
      .style("stroke-width", "3px")
      .style("stroke-linecap", "round")
      .style("stroke-linejoin", "round")
      .each(function(d) {
        const el = d3.select(this);
        const [cx, cy] = projection([d.longitude, d.latitude]);
        const r = rScale(d.weekend_wait_min);
        const gap = 4;

        const candidates = [
          { x: cx + r + gap, y: cy, anchor: "start", dy: "0.35em" },
          { x: cx - r - gap, y: cy, anchor: "end", dy: "0.35em" },
          { x: cx, y: cy - r - gap, anchor: "middle", dy: "-0.4em" },
          { x: cx, y: cy + r + gap, anchor: "middle", dy: "1.1em" }
        ];

        let placed = false;

        for (let c of candidates) {
          el.attr("x", c.x)
            .attr("y", c.y)
            .attr("text-anchor", c.anchor)
            .attr("dy", c.dy);
          
          const bbox = this.getBBox();
          const pad = 2;
          const box = {
            x: bbox.x - pad,
            y: bbox.y - pad,
            width: bbox.width + pad * 2,
            height: bbox.height + pad * 2
          };

          const inBounds = 
            box.x >= 0 && 
            box.y >= 0 && 
            (box.x + box.width) <= width && 
            (box.y + box.height) <= height;
          
          let overlaps = false;
          for (let p of placedBBoxes) {
            if (
              !(box.x + box.width < p.x || 
                box.x > p.x + p.width || 
                box.y + box.height < p.y || 
                box.y > p.y + p.height)
            ) {
              overlaps = true;
              break;
            }
          }

          if (inBounds && !overlaps) {
            placedBBoxes.push(box);
            placed = true;
            break;
          }
        }

        if (!placed) {
          el.remove();
        }
      });

    const legendValues = [40, 25, 10];
    
    gLegend
      .append("text")
      .attr("x", 0)
      .attr("y", -rScale(40) * 2 - 12)
      .text("WAIT (MIN)")
      .attr("font-family", "'JetBrains Mono', monospace")
      .attr("font-size", "9px")
      .attr("fill", "#1e293b")
      .attr("font-weight", "bold");

    gLegend
      .selectAll("circle")
      .data(legendValues)
      .join("circle")
      .attr("cy", (d) => -rScale(d))
      .attr("r", (d) => rScale(d))
      .attr("fill", "none")
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 1);

    gLegend
      .selectAll("line")
      .data(legendValues)
      .join("line")
      .attr("x1", 0)
      .attr("y1", (d) => -rScale(d) * 2)
      .attr("x2", 16)
      .attr("y2", (d) => -rScale(d) * 2)
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2");

    gLegend
      .selectAll(".legend-val")
      .data(legendValues)
      .join("text")
      .attr("class", "legend-val")
      .attr("x", 20)
      .attr("y", (d) => -rScale(d) * 2)
      .attr("dy", "0.35em")
      .text((d) => d)
      .attr("font-family", "'JetBrains Mono', monospace")
      .attr("font-size", "9px")
      .attr("fill", "#1e293b");

    return () => {
      container.selectAll("*").remove();
    };
  }, [data, basemapImage]);

  return (
    <div
      style={{
        position: "relative",
        width: 352,
        height: 400,
        backgroundColor: "#f7f0e6",
        overflow: "hidden",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      
      {hovered && (
        <div
          style={{
            position: "absolute",
            left: tooltipPos.left,
            top: tooltipPos.top,
            backgroundColor: "#f7f0e6",
            border: "2px solid #1e293b",
            boxShadow: "4px 4px 0px #1e293b",
            padding: "10px",
            pointerEvents: "none",
            zIndex: 10,
            minWidth: "140px",
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              color: "#1e293b",
              lineHeight: 1.2,
            }}
          >
            {hovered.name}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              color: "#475569",
              marginTop: "2px",
              textTransform: "uppercase",
            }}
          >
            {hovered.neighborhood}
          </div>
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "#1e293b",
            }}
          >
            <span>
              Wait:{" "}
              <span style={{ color: "#f97316", fontWeight: 700 }}>
                {hovered.weekend_wait_min}m
              </span>
            </span>
            <span>★ {hovered.rating}</span>
          </div>
        </div>
      )}
    </div>
  );
}