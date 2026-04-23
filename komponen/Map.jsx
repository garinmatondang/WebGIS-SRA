import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function Map() {
  const mapRef = useRef(null);
  const mapEl = useRef(null);
  const activeRowRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;

    // Hilangkan margin default browser
    document.body.style.margin = "0";
    document.documentElement.style.margin = "0";

    // Inisialisasi Map
    const map = L.map(mapEl.current, {
      center: [-6.9147, 107.6098],
      zoom: 13,
      zoomControl: false,
      preferCanvas: false,
    });
    mapRef.current = map;

    const svgRenderer = L.svg();
    map.addLayer(svgRenderer);

    // Basemap Google Satellite
    L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "© Google",
    }).addTo(map);

    // Layers Control
    const layersControl = L.control
      .layers(null, null, { collapsed: true })
      .addTo(map);

    // ========= FUNGSI WARNA BERDASARKAN NILAI SRA =========
    const getSraColor = (value) => {
      const v = String(value || "").trim();
      if (v === "Sangat Rawan") return "#8B0000";
      if (v === "Rawan") return "#FF4500";
      if (v === "Normal") return "#FFD700";
      if (v === "Aman") return "#7CFC00";
      if (v === "Sangat Aman") return "#006400";
      return "#999999";
    };

    const getKategoriSra = (props) => {
      return props?.["nilai_sra"] || "";
    };

    const getSraStyle = (feature) => {
      const props = feature?.properties || {};
      const kategori = getKategoriSra(props);
      const fillColor = getSraColor(kategori);
      const oulineMap = {
        "Sangat Rawan": "#4A0000",
        Rawan: "#B22222",
        Normal: "#B8860B",
        Aman: "#2E8B57",
        "Sangat Aman": "#003300",
      };
      return {
        fillColor,
        fillOpacity: 0.75,
        color: oulineMap[kategori] || "#333333",
        weight: 1.5,
        opacity: 0.9,
      };
    };

    // ======================================================
    // Konfigurasi WFS dalam Array
    const geoserverBase = "http://localhost:8080/geoserver";
    const workspace = "Daftar-Aset-Holding";

    const featureStore = { "Aset-Holding": [] };
    const featureLayerStore = { "Aset-Holding": [] };

    const parseLayerName = (name) => name.replace(/-/g, " ");

    const buildLayerLabel = (layerName) => {
      const name = parseLayerName(layerName);
      let symbolHTML = "";
      if (layerName === "Aset-Holding") {
        symbolHTML = `<span style="width:14px; height:14px; display:inline-flex; align-items:center; justify-content:center; margin:0 6px 0 4px; border-radius:2px; background:linear-gradient(to right, #8B0000, #FF4500, #FFD700, #7CFC00, #006400); border:1px solid rgba(255,255,255,0.6);"></span>`;
      } else if (layerName === "Pos Security") {
        symbolHTML = `<span style="width:14px; height:14px; display:inline-flex; align-items:center; justify-content:center; margin:0 6px 0 4px; border-radius:50%; background:#8A2BE2; border:1px solid rgba(255,255,255,0.7);"></span>`;
      } else if (layerName === "Fasilitas Kepolisian") {
        symbolHTML = `<span style="width:14px; height:14px; display:inline-flex; align-items:center; justify-content:center; margin:0 6px 0 4px; border-radius:50%; background:#1E90FF; border:1px solid rgba(255,255,255,0.7);"></span>`;
      } else if (layerName === "Fasilitas TNI") {
        symbolHTML = `<span style="width:14px; height:14px; display:inline-flex; align-items:center; justify-content:center; margin:0 6px 0 4px; border-radius:50%; background:#FF8C00; border:1px solid rgba(255,255,255,0.7);"></span>`;
      }
      return `<span style="display:inline-flex; align-items:center; line-height:1;">${symbolHTML}<span style="line-height:1;">${name}</span></span>`;
    };

    const wfsConfigs = [
      {
        name: "Aset-Holding",
        typename: `${workspace}:Aset-Holding`,
        style: getSraStyle,
        pointStyle: null,
      },
      {
        name: "Pos Security",
        typename: `${workspace}:Kantor-Pos-Security`,
        style: null,
        pointStyle: {
          radius: 4,
          fillColor: "#8A2BE2",
          fillOpacity: 0.9,
          color: "#FFFFFF",
          weight: 1.2,
          opacity: 0.7,
        },
      },
      {
        name: "Fasilitas Kepolisian",
        typename: `${workspace}:Fasilitas_Kepolisian_TNI`,
        style: null,
        pointStyle: {
          radius: 4,
          fillColor: "#1E90FF",
          fillOpacity: 0.9,
          color: "#FFFFFF",
          weight: 1.3,
          opacity: 0.8,
        },
      },
      {
        name: "Fasilitas TNI",
        typename: `${workspace}:Fasilitas_TNI`,
        style: null,
        pointStyle: {
          radius: 4,
          fillColor: "#FF8C00",
          fillOpacity: 0.9,
          color: "#FFFFFF",
          weight: 1.3,
          opacity: 0.75,
        },
      },
    ];

    const buildWfsUrl = (typename, cql = null) => {
      const params = {
        service: "WFS",
        version: "1.1.0",
        request: "GetFeature",
        typename,
        outputFormat: "application/json",
        srsName: "EPSG:4326",
      };

      if (cql) {
        params.cql_filter = cql;
      }

      return (
        `${geoserverBase}/${workspace}/ows?` +
        new URLSearchParams(params).toString()
      );
    };

    const popupFields = {
      "Aset-Holding": [
        { colId: "ID2013_aset", key: "aset", label: "Aset" },
        { colId: "ID2013_ket", key: "desa", label: "Keterangan" },
        { colId: "ID2013_luas", key: "luas (ha)", label: "Luas (ha)" },
        { colId: "ID2013_kab", key: "kab_kota", label: "Kab Kota" },
        { colId: "ID2013_kec", key: "kecamatan", label: "Kecamatan" },
        { colId: "ID2013_desa", key: "desa", label: "Desa" },
        { colId: "ID2013_sra", key: "nilai_sra", label: "Nilai SRA" },
        { colId: "ID2013_tgl", key: "tgl_update", label: "Tgl Update" },
      ],
      "Pos Security": [
        { key: "Nama Pos", label: "Nama Pos" },
        { key: "Alamat", label: "Alamat" },
        { key: "Penata", label: "Penata" },
        { key: "No HP Pena", label: "No. HP Penata" },
        { key: "Jlh_Per", label: "Jumlah Personil" },
      ],
      "Fasilitas Kepolisian": [{ key: "name", label: "Nama Kantor" }],
      "Fasilitas TNI": [{ key: "name", label: "Nama Kantor" }],
    };

    const fieldKeyToColIdMap = {};
    popupFields["Aset-Holding"].forEach((f) => {
      if (f.key && f.colId) {
        fieldKeyToColIdMap[f.key] = f.colId;
      }
    });

    const sraCategories = [
      "Sangat Rawan",
      "Rawan",
      "Normal",
      "Aman",
      "Sangat Aman",
    ];
    let summaryDiv = null;
    let currentServerDate = null;

    const countBySra = (features) => {
      const counts = {};
      sraCategories.forEach((cat) => (counts[cat] = 0));
      (features || []).forEach((f) => {
        const props = f.properties || {};
        const val = getKategoriSra(props);
        if (counts[val] !== undefined) counts[val] += 1;
      });
      return counts;
    };

    const renderSummary = () => {
      if (!summaryDiv) return;
      const holdingCounts = countBySra(featureStore["Aset-Holding"]);
      const total = sraCategories.reduce(
        (sum, cat) => sum + (holdingCounts[cat] || 0),
        0,
      );

      if (!total) {
        summaryDiv.innerHTML = "<i>Data belum tersedia.</i>";
        return;
      }

      const size = 110;
      const radius = 55;
      const hole = 78;
      const center = size / 2;
      let cumulativeAngle = -90;
      let paths = "";

      sraCategories.forEach((cat) => {
        const count = holdingCounts[cat] || 0;
        if (!count) return;
        const pct = (count / total) * 100;
        const angle = (pct / 100) * 360;
        const start = cumulativeAngle;
        const end = cumulativeAngle + angle;
        const color = getSraColor(cat);
        const polar = (a) => {
          const r = (a * Math.PI) / 180;
          return [center + Math.cos(r) * radius, center + Math.sin(r) * radius];
        };
        const [x1, y1] = polar(start);
        const [x2, y2] = polar(end);
        const largeArc = angle > 180 ? 1 : 0;
        const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        paths += `<path d="${d}" fill="${color}" data-label="${cat} ${count} (${pct.toFixed(
          1,
        )}%)" style="cursor:pointer" onmousemove="showTooltip(event)" onmouseleave="hideTooltip()" />`;
        cumulativeAngle = end;
      });

      summaryDiv.innerHTML = `
        <div style="width:100%; height:100%; display:flex; flex-direction:column;">
          <div style="font-weight:bold; text-align:center; margin-bottom:4px; flex-shrink:0;">Jumlah Aset Berdasarkan Nilai SRA</div>
          <div style="flex:1; display:flex; align-items:center; justify-content:center;">
            <div class="donut-wrapper" style="position:relative; width:${size}px; height:${size}px;">
              <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="position:absolute;top:0;left:0;z-index:1">${paths}</svg>
              <div style="position:absolute; top:50%; left:50%; width:${hole}px; height:${hole}px; background:#011926; border-radius:50%; transform:translate(-50%, -50%); display:flex; align-items:center; justify-content:center; font-size:11px; text-align:center; pointer-events:auto; cursor:default; z-index:5;">
                <div><b>Total ${total}</b></div>
              </div>
              <div id="sra-tooltip" style="position:absolute; background:#02293A; color:white; padding:4px 6px; border-radius:4px; font-size:11px; pointer-events:none; display:none; white-space:nowrap; z-index:10;"></div>
            </div>
          </div>
        </div>`;
    };

    window.showTooltip = (e) => {
      const path = e.target.closest("path");
      if (!path) return;
      const tooltip = document.getElementById("sra-tooltip");
      const rect = e.target.ownerSVGElement.getBoundingClientRect();
      tooltip.textContent = path.dataset.label;
      tooltip.style.display = "block";
      tooltip.style.left = e.clientX - rect.left + 10 + "px";
      tooltip.style.top = e.clientY - rect.top + 10 + "px";
    };

    window.hideTooltip = () => {
      const tooltip = document.getElementById("sra-tooltip");
      if (tooltip) tooltip.style.display = "none";
    };

    const openLayerPopup = (layer) => {
      map.closePopup();
      setTimeout(() => {
        layer.openPopup();
      }, 0);
    };

    let asetHoldingLayerRef = null;

    const createAsetHoldingLayer = (geojson) => {
      featureLayerStore["Aset-Holding"] = [];

      return L.geoJSON(geojson, {
        renderer: svgRenderer,
        interactive: true,
        style: getSraStyle,
        onEachFeature: (feature, lyr) => {
          const props = feature.properties || {};
          const fields = popupFields["Aset-Holding"];

          let rows = fields
            .map(({ key, label }) => {
              const val = props[key] ?? "-";
              return `<tr><td><b>${label}</b></td><td>${val}</td></tr>`;
            })
            .join("");

          lyr.bindPopup(`<table>${rows}</table>`, {
            className: "custom-popup",
          });

          lyr.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            openLayerPopup(lyr);
          });

          featureLayerStore["Aset-Holding"].push({
            feature,
            layer: lyr,
          });
        },
      });
    };

    const createGenericLayer = (geojson, cfg) => {
      if (featureLayerStore[cfg.name] !== undefined) {
        featureLayerStore[cfg.name] = [];
      }

      return L.geoJSON(geojson, {
        renderer: svgRenderer,
        interactive: true,
        style: cfg.style || undefined,
        pointToLayer: (feature, latlng) =>
          cfg.pointStyle
            ? L.circleMarker(latlng, cfg.pointStyle)
            : L.marker(latlng),

        onEachFeature: (feature, lyr) => {
          const props = feature.properties || {};
          const fields = popupFields[cfg.name];

          let rows = "";

          if (fields) {
            rows = fields
              .map(({ key, label }) => {
                const val = props[key] ?? "-";
                return `<tr><td><b>${label}</b></td><td>${val}</td></tr>`;
              })
              .join("");
          } else {
            rows = Object.entries(props)
              .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`)
              .join("");
          }

          lyr.bindPopup(`<table>${rows}</table>`, {
            className: "custom-popup",
          });

          lyr.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            openLayerPopup(lyr);
          });

          if (featureLayerStore[cfg.name] !== undefined) {
            featureLayerStore[cfg.name].push({ feature, layer: lyr });
          }
        },
      });
    };

    const fetchAndAddWfsLayer = async (cfg) => {
      try {
        const url = buildWfsUrl(cfg.typename);
        const res = await fetch(url);
        const geojson = await res.json();

        if (featureStore[cfg.name] !== undefined && geojson.features) {
          featureStore[cfg.name] = geojson.features;
        }
        if (featureLayerStore[cfg.name] !== undefined) {
          featureLayerStore[cfg.name] = [];
        }

        const layer =
          cfg.name === "Aset-Holding"
            ? createAsetHoldingLayer(geojson)
            : createGenericLayer(geojson, cfg);

        if (layer.getLayers().length) {
          layer.addTo(map);

          if (cfg.name === "Aset-Holding") {
            asetHoldingLayerRef = layer; // 🔥 SIMPAN LAYER UTAMA
          }

          if (layersControl) {
            layersControl.addOverlay(layer, buildLayerLabel(cfg.name));
          }

          return layer.getBounds();
        }

        return null;
      } catch (e) {
        console.error(`WFS fetch error for ${cfg.name}:`, e);
        return null;
      }
    };

    (async () => {
      try {
        const timeRes = await fetch(
          "https://worldtimeapi.org/api/timezone/Asia/Jakarta",
        );
        const timeJson = await timeRes.json();
        currentServerDate = new Date(timeJson.datetime);
      } catch (e) {
        console.warn("Gagal ambil waktu server, fallback ke UTC");
        currentServerDate = new Date();
      }
      const boundsList = [];
      for (const cfg of wfsConfigs) {
        const bounds = await fetchAndAddWfsLayer(cfg);
        if (bounds) boundsList.push(bounds);
      }
      if (boundsList.length) {
        const combined = boundsList.reduce(
          (acc, b) => acc.extend(b),
          L.latLngBounds(boundsList[0]),
        );
        map.fitBounds(combined, { padding: [20, 20] });
      }
      renderSummary();
      if (summaryDiv) {
        summaryDiv.style.height = "175px";
        summaryDiv.style.boxSizing = "border-box";
      }
    })();

    // ========= LEGEND NILAI SRA DI KANAN BAWAH =========
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "info legend");
      div.style.cssText =
        "background:#011926; color:white; padding:8px 10px; border-radius:4px; box-shadow:0 0 6px rgba(0,0,0,0.3); font:12px/1.4 Arial, sans-serif;";
      const cats = [
        "Sangat Rawan",
        "Rawan",
        "Normal",
        "Aman",
        "Sangat Aman",
      ].map((label) => ({
        label,
        color: getSraColor(label),
      }));
      let html =
        "<div style='font-weight:bold;margin-bottom:4px;'>Nilai SRA</div>";
      cats.forEach((cat) => {
        html += `<div style="display:flex;align-items:center;margin-bottom:3px;">
          <span style="width:14px; height:14px; background:${cat.color}; border:1px solid rgba(255,255,255,0.6); box-shadow:0 0 3px rgba(0,0,0,0.6); margin-right:6px; display:inline-block; border-radius:2px;"></span>
          <span>${cat.label}</span>
        </div>`;
      });
      div.innerHTML = html;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    legend.addTo(map);

    const zoomControl = L.control.zoom({ position: "topright" });
    zoomControl.addTo(map);

    // ========= PANEL RINGKASAN DI KIRI BAWAH =========
    const summaryControl = L.control({ position: "bottomleft" });
    summaryControl.onAdd = function () {
      const div = L.DomUtil.create("div", "sra-summary");
      div.style.cssText =
        "background:#011926; color:white; padding:6px 8px; border-radius:4px; box-shadow:0 0 6px rgba(0,0,0,0.3); font:12px/1.4 Arial, sans-serif; margin:6px; min-width:360px; max-width:360px;";
      div.innerHTML = "<i>Menghitung...</i>";
      summaryDiv = div;
      setTimeout(renderSummary, 0);
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    summaryControl.addTo(map);

    const zoomEl = document.querySelector(".leaflet-control-zoom");
    if (zoomEl) zoomEl.style.marginTop = "5px";

    // ========= TAB "DAFTAR ASET" =========
    const assetListControl = L.control({ position: "topleft" });
    assetListControl.onAdd = function () {
      const container = L.DomUtil.create("div", "asset-list-control");
      container.style.cssText = "margin-top:70px; margin-left:10px;";

      const button = document.createElement("button");
      button.textContent = "Daftar Aset";
      button.style.cssText =
        "background:#011926; color:white; border:1px solid #777; border-radius:4px; padding:6px 10px; cursor:pointer; font-size:12px; box-shadow:0 0 4px rgba(0,0,0,0.3); margin-bottom:4px;";

      const panel = document.createElement("div");
      panel.className = "asset-list-panel";
      panel.style.cssText =
        "display:none; background:#011926; color:white; padding:8px 10px; border-radius:4px; box-shadow:0 0 8px rgba(0,0,0,0.4); width:360px; max-height:calc(100vh - 230px); overflow-y:auto";

      L.DomEvent.disableScrollPropagation(panel);
      L.DomEvent.disableClickPropagation(panel);

      const searchBar = document.createElement("div");
      searchBar.style.cssText = "display:flex; gap:6px; margin-bottom:6px;";

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Cari aset (semua kolom)...";
      searchInput.style.cssText =
        "flex:1; padding:4px; font-size:12px; box-sizing:border-box; background:#03394F; color:white; border:1px solid #0D4F63;";

      const resetFilterBtn = document.createElement("button");
      resetFilterBtn.textContent = "Reset";
      resetFilterBtn.style.cssText =
        "padding:4px 8px; font-size:11px; background:#7C2D12; color:white; border:1px solid #7C2D12; border-radius:3px; cursor:pointer;";

      searchBar.appendChild(searchInput);
      searchBar.appendChild(resetFilterBtn);

      const tableContainer = document.createElement("div");
      tableContainer.style.cssText =
        "max-height:240px; overflow-y:auto; overflow-x:auto;";

      const filterContainer = document.createElement("div");
      filterContainer.style.cssText = "margin-top:6px; font-size:11px;";

      panel.appendChild(searchBar);
      panel.appendChild(tableContainer);
      panel.appendChild(filterContainer);
      container.appendChild(button);
      container.appendChild(panel);

      let currentSearch = "";
      let LAYER_NAME = "Aset-Holding";
      let currentSort = { field: null, dir: "asc" };
      let activeFilterField = null;
      let activeFilterDropdown = null;
      let tableEl, theadEl, tbodyEl;
      let filterState = {};
      let activeLayerRef = null;

      const clearActiveRow = () => {
        if (activeRowRef.current) {
          activeRowRef.current.classList.remove("active-row");
          activeRowRef.current = null;
        }
      };

      map.on("click", () => {
        if (activeRowRef.current) {
          activeRowRef.current.classList.remove("active-row");
          activeRowRef.current = null;
        }
      });

      document.addEventListener("click", (e) => {
        if (!container.contains(e.target)) {
          clearActiveRow();
        }

        if (activeFilterDropdown && !activeFilterDropdown.contains(e.target)) {
          activeFilterDropdown.remove();
          activeFilterDropdown = null;
          activeFilterField = null;

          const spans = theadEl?.querySelectorAll("th span:last-child");
          spans?.forEach((s) => (s.textContent = "⛃"));
        }
      });

      const disabledFilterFields = new Set(["Keterangan", "Luas (ha)"]);
      const disabledHighlightCols = new Set(["ID2013_ket", "ID2013_luas"]);

      const setHeaderFilterActive = (colId, isActive) => {
        if (disabledHighlightCols.has(colId)) return;

        if (!theadEl) return;

        theadEl.querySelectorAll("th").forEach((th) => {
          if (th.dataset.colId === colId) {
            if (isActive) {
              th.style.background = "linear-gradient(90deg, #0D4F63, #148AA6)";
              th.style.borderBottom = "2px solid #5EF2FF";
            } else {
              th.style.background = "#02293A";
              th.style.borderBottom = "1px solid rgba(255,255,255,0.4)";
            }
          }
        });
      };

      const buildTableIfNeeded = (fields) => {
        if (!tableEl) {
          tableEl = document.createElement("table");
          tableEl.style.cssText =
            "width:100%; border-collapse:collapse; font-size:11px;";
          theadEl = document.createElement("thead");
          tbodyEl = document.createElement("tbody");
          tableEl.appendChild(theadEl);
          tableEl.appendChild(tbodyEl);
          tableContainer.innerHTML = "";
          tableContainer.appendChild(tableEl);
        }
        theadEl.innerHTML = "";
        const headerRow = document.createElement("tr");
        fields.forEach((field) => {
          const th = document.createElement("th");
          th.dataset.colId = field.colId;
          th.style.cssText =
            "position:sticky; top:0; z-index:5; padding:3px 6px; border-bottom:1px solid rgba(255,255,255,0.4); cursor:pointer; white-space:nowrap; background:#02293A; box-shadow:0 2px 0 rgba(0,0,0,0.4);";

          const labelSpan = document.createElement("span");
          labelSpan.textContent = field.label;

          const sortSpan = document.createElement("span");
          sortSpan.style.cssText = "margin-left:4px; font-size:10px;";
          sortSpan.textContent =
            currentSort.field === field.key
              ? currentSort.dir === "asc"
                ? "▲"
                : "▼"
              : "⇵";

          th.appendChild(labelSpan);
          th.appendChild(sortSpan);

          if (!disabledFilterFields.has(field.label)) {
            const filterSpan = document.createElement("span");
            filterSpan.textContent = "⛃";
            filterSpan.style.cssText =
              "margin-left:4px; font-size:9px; cursor:pointer; opacity:0.8;";
            filterSpan.onclick = (e) => {
              e.stopPropagation();
              toggleFilterDropdown(th, field, filterSpan);
            };
            th.appendChild(filterSpan);
          }

          th.onclick = () => {
            if (currentSort.field === field.key) {
              currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
            } else {
              currentSort.field = field.key;
              currentSort.dir = "asc";
            }

            renderList();
          };
          headerRow.appendChild(th);
        });
        theadEl.appendChild(headerRow);
        Object.keys(filterState).forEach((fieldKey) => {
          const colId = fieldKeyToColIdMap[fieldKey];
          if (colId) {
            setHeaderFilterActive(colId, true);
          }
        });
      };

      const MONTH_LABELS = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];

      const buildCqlFromFilter = (field, values) => {
        if (!field || !values || !values.size) return null;

        if (field === "tgl_update") {
          const clauses = Array.from(values).map((v) => {
            const [year, month] = v.split("-").map(Number);

            const start = `${year}-${String(month).padStart(2, "0")}-01`;

            const endDate = new Date(year, month, 0);
            const end = `${year}-${String(month).padStart(2, "0")}-${String(
              endDate.getDate(),
            ).padStart(2, "0")}`;

            return `(tgl_update >= '${start}' AND tgl_update <= '${end}')`;
          });

          return clauses.length ? `(${clauses.join(" OR ")})` : null;
        }

        const quoted = Array.from(values)
          .map((v) => `'${v.replace(/'/g, "''")}'`)
          .join(",");

        return `${field} IN (${quoted})`;
      };

      const isSameSet = (a, b) => {
        if (!a && !b) return true;
        if (!a || !b) return false;
        if (a.size !== b.size) return false;
        for (const v of a) {
          if (!b.has(v)) return false;
        }
        return true;
      };

      const toggleFilterDropdown = (th, field, filterSpan) => {
        if (activeFilterDropdown) {
          activeFilterDropdown.remove();
          activeFilterDropdown = null;
          if (activeFilterField === field.key) {
            filterSpan.textContent = "⛃";
            activeFilterField = null;
            return;
          }
        }
        activeFilterField = field.key;

        let tempSelectedValues = new Set(
          filterState[field.key] ? Array.from(filterState[field.key]) : [],
        );

        const isMonthFilter = field.key === "tgl_update";

        const dropdown = document.createElement("div");

        const controlTop = document.createElement("div");
        controlTop.style.cssText =
          "display:flex; justify-content:space-between; margin-bottom:6px; font-size:11px;";

        const selectAllBtn = document.createElement("button");
        selectAllBtn.textContent = "Centang semua";
        selectAllBtn.style.cssText =
          "background:none; border:none; color:#7CFCFF; cursor:pointer; padding:0;";

        const clearAllBtn = document.createElement("button");
        clearAllBtn.textContent = "Uncheck semua";
        clearAllBtn.style.cssText =
          "background:none; border:none; color:#FF7C7C; cursor:pointer; padding:0;";

        controlTop.appendChild(selectAllBtn);
        controlTop.appendChild(clearAllBtn);
        dropdown.appendChild(controlTop);

        dropdown.style.cssText =
          "position:absolute; background:#02293A; border:1px solid #0D4F63; border-radius:4px; padding:6px; z-index:9999; min-width:160px; max-height:160px; overflow-y:auto; font-size:11px; box-shadow:0 2px 6px rgba(0,0,0,0.4);";

        const feats = featureLayerStore[LAYER_NAME] || [];

        let values = [];

        if (isMonthFilter) {
          // 1. Ambil semua tgl_update dari data
          const dates = feats
            .map(({ feature }) => feature.properties?.tgl_update)
            .filter(Boolean)
            .map((d) => new Date(d));

          // 2. Tentukan tanggal paling awal
          const minDate = dates.length
            ? new Date(Math.min(...dates))
            : currentServerDate;

          // Normalisasi ke awal bulan
          let cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

          const end = new Date(
            currentServerDate.getFullYear(),
            currentServerDate.getMonth(),
            1,
          );

          values = [];

          while (cursor <= end) {
            const year = cursor.getFullYear();
            const month = cursor.getMonth() + 1; // 1–12

            values.push({
              label: cursor.toLocaleString("id-ID", {
                month: "long",
                year: "numeric",
              }),
              value: `${year}-${month}`,
            });

            cursor.setMonth(cursor.getMonth() + 1);
          }
        } else {
          const set = new Set();
          feats.forEach(({ feature }) =>
            set.add(String(feature.properties?.[field.key] ?? "-")),
          );

          values = Array.from(set)
            .sort((a, b) => a.localeCompare(b, "id", { sesitivity: "base" }))
            .map((v) => ({ label: v, value: v }));
        }

        values.forEach(({ label, value }) => {
          const row = document.createElement("label");
          row.style.cssText = "display:flex; align-items:center; gap:4px;";

          const cb = document.createElement("input");
          cb.type = "checkbox";

          cb.checked = tempSelectedValues.has(value);

          cb.onchange = () => {
            cb.checked
              ? tempSelectedValues.add(value)
              : tempSelectedValues.delete(value);
          };

          const span = document.createElement("span");
          span.textContent = label;

          row.appendChild(cb);
          row.appendChild(span);
          dropdown.appendChild(row);
        });

        // Select all
        selectAllBtn.onclick = () => {
          values.forEach(({ value }) => tempSelectedValues.add(value));
          dropdown.querySelectorAll("input[type=checkbox]").forEach((cb) => {
            cb.checked = true;
          });
        };

        // Clear all
        clearAllBtn.onclick = () => {
          tempSelectedValues.clear();
          dropdown.querySelectorAll("input[type=checkbox]").forEach((cb) => {
            cb.checked = false;
          });
        };

        panel.appendChild(dropdown);

        const thRect = th.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();

        dropdown.style.top = thRect.bottom - panelRect.top + "px";
        dropdown.style.left = thRect.left - panelRect.left + "px";

        activeFilterDropdown = dropdown;
        filterSpan.textContent = "⛂";

        // ===== TOMBOL OK (APPLY FILTER) =====
        const applyBtn = document.createElement("button");
        applyBtn.textContent = "OK";
        applyBtn.style.cssText =
          "margin-top:6px; width:100%; padding:4px; background:#0D4F63; color:white; border:1px solid #0D4F63; border-radius:3px; cursor:pointer; font-size:11px;";

        applyBtn.onclick = async () => {
          if (tempSelectedValues.size > 0) {
            filterState[field.key] = new Set(tempSelectedValues);
            setHeaderFilterActive(field.colId, true);
          } else {
            delete filterState[field.key];
            setHeaderFilterActive(field.colId, false);
          }

          await refreshLayerWithFilters();
          closeDropdown();
        };

        // Helper sederhana untuk menutup dropdown
        const closeDropdown = () => {
          dropdown.remove();
          activeFilterDropdown = null;
          filterSpan.textContent = "⛃";
        };

        const refreshLayerWithFilters = async () => {
          // Gabungkan semua kriteria di filterState dengan operator AND
          const cqlParts = Object.entries(filterState)
            .map(([field, values]) => buildCqlFromFilter(field, values))
            .filter(Boolean);

          const combinedCql = cqlParts.length
            ? cqlParts.map((c) => `(${c})`).join(" AND ")
            : null;

          try {
            // 1. Hapus layer lama dari peta
            if (asetHoldingLayerRef && map.hasLayer(asetHoldingLayerRef)) {
              map.removeLayer(asetHoldingLayerRef);
            }

            // 2. Fetch data baru dengan CQL gabungan
            const url = buildWfsUrl(`${workspace}:Aset-Holding`, combinedCql);
            const res = await fetch(url);
            const geojson = await res.json();

            // 🔴 Jika hasil filter kosong → tidak replace data
            if (!geojson.features || geojson.features.length === 0) {
              console.log(
                "Filter tidak menghasilkan data, mempertahankan data lama",
              );

              if (!geojson.features || geojson.features.length === 0) {
                alert("Tidak ada aset pada bulan tersebut.");
                return;
              }

              renderList();
              renderSummary();

              return;
            }

            // jika ada data baru
            featureStore["Aset-Holding"] = geojson.features;
            featureLayerStore["Aset-Holding"] = [];

            asetHoldingLayerRef = createAsetHoldingLayer(geojson).addTo(map);

            renderSummary();
            renderList();
          } catch (err) {
            console.error("Gagal memperbarui filter:", err);
          }
        };
        dropdown.appendChild(applyBtn);
      };

      const renderList = () => {
        const featsWithLayer = featureLayerStore[LAYER_NAME] || [];
        const fields = popupFields[LAYER_NAME];
        if (!featsWithLayer.length || !fields) {
          tableContainer.innerHTML = "<i>Data belum termuat atau kosong.</i>";
          return;
        }
        buildTableIfNeeded(fields);
        const term = currentSearch.toLowerCase();
        let rows = [...featsWithLayer];

        // sorting A-Z list aset
        rows.sort((a, b) =>
          String(a.feature.properties?.aset ?? "").localeCompare(
            String(b.feature.properties?.aset ?? ""),
            "id",
            { sensitivity: "base" },
          ),
        );

        if (term) {
          rows = rows.filter(({ feature }) => {
            const props = feature.properties || {};
            return fields.some(({ key }) =>
              String(props[key] ?? "")
                .toLowerCase()
                .includes(term),
            );
          });
        }

        if (currentSort.field) {
          const key = currentSort.field;
          const dir = currentSort.dir === "asc" ? 1 : -1;
          rows = [...rows].sort(
            (a, b) =>
              String(a.feature.properties?.[key] ?? "").localeCompare(
                String(b.feature.properties?.[key] ?? ""),
              ) * dir,
          );
        }

        tbodyEl.innerHTML = "";
        rows.forEach(({ feature, layer }) => {
          const tr = document.createElement("tr");
          tr.style.cursor = "pointer";

          tr.onclick = () => {
            if (activeRowRef.current === tr) {
              tr.classList.remove("active-row");
              activeRowRef.current = null;
              map.closePopup();
              return;
            }

            // reset row aktif lama
            if (activeRowRef.current) {
              activeRowRef.current.classList.remove("active-row");
            }

            // set row aktif baru
            activeRowRef.current = tr;
            tr.classList.add("active-row");

            // zoom & popup
            if (layer.getBounds) {
              map.fitBounds(layer.getBounds(), {
                padding: [20, 20],
                maxZoom: 17,
              });
            } else {
              map.setView(layer.getLatLng(), 17);
            }

            openLayerPopup(layer);
          };

          fields.forEach(({ key }) => {
            const td = document.createElement("td");
            td.textContent = feature.properties[key] ?? "-";
            td.style.cssText =
              "padding:3px 6px; border-bottom:1px solid rgba(255,255,255,0.15); color:white; white-space:nowrap;";
            tr.appendChild(td);
          });
          tbodyEl.appendChild(tr);
        });
      };

      button.onclick = () => {
        const isHidden =
          panel.style.display === "none" || panel.style.display === "";
        panel.style.display = isHidden ? "block" : "none";
        if (isHidden) renderList();
      };

      searchInput.oninput = () => {
        currentSearch = searchInput.value || "";
        renderList();
      };

      resetFilterBtn.onclick = async () => {
        // hapus semua filter
        filterState = {};

        // reset highlight header
        if (theadEl) {
          theadEl.querySelectorAll("th").forEach((th) => {
            th.style.background = "#02293A";
            th.style.borderBottom = "1px solid rgba(255,255,255,0.4)";
          });
        }

        try {
          if (asetHoldingLayerRef && map.hasLayer(asetHoldingLayerRef)) {
            map.removeLayer(asetHoldingLayerRef);
          }

          const url = buildWfsUrl(`${workspace}:Aset-Holding`, null);
          const res = await fetch(url);
          const geojson = await res.json();

          featureStore["Aset-Holding"] = geojson.features;
          featureLayerStore["Aset-Holding"] = [];

          asetHoldingLayerRef = createAsetHoldingLayer(geojson).addTo(map);

          renderSummary();
          renderList();
        } catch (err) {
          console.error("Gagal reset filter:", err);
        }
      };

      return container;
    };
    assetListControl.addTo(map);

    // ========= FULL-WIDTH HEADER TITLE =========
    const titleControl = L.control({ position: "topleft" });
    titleControl.onAdd = function () {
      const div = L.DomUtil.create("div", "webgis-title");
      div.style.cssText =
        "position:fixed; top:0; left:0; right:10px; background:#011926; color:white; padding:10px 20px; font-size:18px; font-weight:500; font-family:Arial, sans-serif; letter-spacing:0.5px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.3); z-index:9999;";
      div.innerHTML =
        "Dashboard Security Risk Assessment (SRA) Aset Head Office Pertamina";
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    titleControl.addTo(map);

    const layerCtrlEl = document.querySelector(".leaflet-control-layers");
    if (layerCtrlEl) {
      layerCtrlEl.style.cssText += "margin-top:70px; margin-right:10px;";
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapEl} style={{ height: "100vh", width: "100vw" }} />;
}
