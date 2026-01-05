import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function Map() {
  const mapRef = useRef(null);
  const mapEl = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;

    // Hilangkan margin default browser agar header biru mentok kiri-kanan
    document.body.style.margin = "0";
    document.documentElement.style.margin = "0";

    // Inisialisasi Map
    const map = L.map(mapEl.current, {
      center: [-6.9147, 107.6098],
      zoom: 13,
      zoomControl: false,
    });
    mapRef.current = map;

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

      if (v === "Sangat Rawan") return "#b10026";
      if (v === "Rawan") return "#fc4e2a";
      if (v === "Normal") return "#feb24c";
      if (v === "Aman") return "#78c679";
      if (v === "Sangat Aman") return "#238443";

      return "#999999"; // fallback kalau ada nilai lain / null
    };

    const getKategoriSra = (props) => {
      return props?.["Nilai_SRA"] || "";
    };

    const getSraStyle = (feature) => {
      const props = feature?.properties || {};
      const kategori = getKategoriSra(props);
      const color = getSraColor(kategori);
      console.log(kategori);
      return {
        color, // garis tepi
        weight: 1.2,
        fillColor: color,
        fillOpacity: 0.7,
      };
    };
    // ======================================================

    // Konfigurasi WFS dalam Array
    const geoserverBase = "http://localhost:8080/geoserver";
    const workspace = "WebGIS-SRA";

    // Menyimpan fitur tiap layer untuk List Aset
    const featureStore = {
      "Aset-Holding": [],
    };

    const featureLayerStore = {
      "Aset-Holding": [],
    };

    const parseLayerName = (name) => {
      return name.replace(/-/g, " ");
    };

    const wfsConfigs = [
      {
        name: "Aset-Holding",
        typename: `${workspace}:Aset-Holding`,
        style: getSraStyle,
        pointStyle: null,
      },
      {
        name: "Kantor Pos Security",
        typename: `${workspace}:Kantor-Pos-Security`,
        style: null,
        pointStyle: {
          radius: 7,
          fillColor: "#8A2BE2",
          fillOpacity: 0.9,
          color: "#8A2BE2",
          weight: 1.2,
        },
      },
      {
        name: "Fasilitas Kepolisian",
        typename: `${workspace}:Fasilitas_Kepolisian_TNI`,
        style: null,
        pointStyle: {
          radius: 7,
          fillColor: "#1E90FF",
          fillOpacity: 0.9,
          color: "#FFFFFF",
          weight: 1.2,
        },
      },
    ];

    // Membangun URL WFS
    const buildWfsUrl = (typename) =>
      `${geoserverBase}/${workspace}/ows?` +
      new URLSearchParams({
        service: "WFS",
        version: "1.1.0",
        request: "GetFeature",
        typename,
        outputFormat: "application/json",
        srsName: "EPSG:4326",
      }).toString();

    // ===== KONFIGURASI FIELD POPUP PER LAYER =====
    const popupFields = {
      "Aset-Holding": [
        { key: "Aset", label: "Aset" },
        { key: "Keterangan", label: "Keterangan" },
        { key: "Luas (ha)", label: "Luas (ha)" },
        { key: "Kab/Kota", label: "Kab/Kota" },
        { key: "Kecamatan", label: "Kecamatan" },
        { key: "Desa", label: "Desa" },
        { key: "Nilai_SRA", label: "Nilai SRA" },
        { key: "Tgl_Update", label: "Tgl Update" },
      ],
      "Kantor Pos Security": [
        { key: "Nama Pos", label: "Nama Pos" },
        { key: "Alamat", label: "Alamat" },
        { key: "Penata", label: "Penata" },
        { key: "No HP Pena", label: "No. HP Penata" },
        { key: "Jlh_Per", label: "Jumlah Personil" },
      ],
      "Fasilitas Kepolisian": [{ key: "name", label: "Nama Kantor" }],
    };
    // =============================================

    // ====== RINGKASAN JUMLAH BERDASARKAN NILAI SRA ======
    const sraCategories = [
      "Sangat Rawan",
      "Rawan",
      "Normal",
      "Aman",
      "Sangat Aman",
    ];

    let summaryDiv = null;

    const countBySra = (features) => {
      const counts = {};
      sraCategories.forEach((cat) => (counts[cat] = 0));

      (features || []).forEach((f) => {
        const props = f.properties || {};
        const val = getKategoriSra(props);
        if (counts[val] !== undefined) {
          counts[val] += 1;
        }
      });

      return counts;
    };

    const renderSummary = () => {
      if (!summaryDiv) return;

      const holdingCounts = countBySra(featureStore["Aset-Holding"]);

      const total = sraCategories.reduce(
        (sum, cat) => sum + (holdingCounts[cat] || 0),
        0
      );

      if (!total) {
        summaryDiv.innerHTML = `
  <div style="font-weight:bold;text-align:center;margin-bottom:6px;">
    Jumlah Aset Berdasarkan Nilai SRA
  </div>

  <div style="position:relative;width:${
    size + 180
  }px;height:${size}px;margin:auto;">

    <div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:conic-gradient(${gradientParts.join(", ")});
      margin:auto;
    "></div>

    <div style="
      position:absolute;
      top:50%;
      left:50%;
      width:${hole}px;
      height:${hole}px;
      background:#011926;
      border-radius:50%;
      transform:translate(-50%, -50%);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:10px;
    ">
      Total<br><b>${total}</b>
    </div>

    <svg
      width="${size + 180}"
      height="${size}"
      viewBox="0 0 ${size + 180} ${size}"
      style="position:absolute;top:0;left:0;pointer-events:none;"
    >
      ${svgLines}
    </svg>

    ${labelsHtml}
  </div>
`;

      const size = 120;
      const hole = 92;
      const center = size / 2;
      const r1 = 60;
      const r2 = 78;

      let gradientParts = [];
      let svgLines = "";
      let labelsHtml = "";

      let cumulativePct = 0;

      sraCategories.forEach((cat) => {
        const count = holdingCounts[cat] || 0;
        if (!count) return;

        const pct = (count / total) * 100;
        const start = cumulativePct;
        const end = cumulativePct + pct;
        const color = getSraColor(cat);

        gradientParts.push(`${color} ${start}% ${end}%`);

        const angle = ((start + end) / 2) * 3.6 - 90;
        const rad = (angle * Math.PI) / 180;

        const x1 = center + Math.cos(rad) * r1;
        const y1 = center + Math.sin(rad) * r1;
        const x2 = center + Math.cos(rad) * r2;
        const y2 = center + Math.sin(rad) * r2;

        const isRight = Math.cos(rad) >= 0;
        const labelX = isRight ? center + 90 : center - 90;

        svgLines += `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
      stroke="${color}" stroke-width="1" />
    <line x1="${x2}" y1="${y2}" x2="${labelX - (isRight ? 6 : -6)}" y2="${y2}"
      stroke="${color}" stroke-width="1" />
  `;

        labelsHtml += `
    <div style="
      position:absolute;
      top:${y2}px;
      ${isRight ? "left" : "right"}:0;
      transform:translateY(-50%);
      font-size:11px;
      white-space:nowrap;
    ">
      ${cat} ${pct.toFixed(1)}%
    </div>
  `;

        cumulativePct = end;
      });
    };
    // ======================================================

    // Fetch & Menambah Layer ke Map
    const fetchAndAddWfsLayer = async (cfg) => {
      try {
        const url = buildWfsUrl(cfg.typename);
        const res = await fetch(url);
        const geojson = await res.json();
        console.log("geojson: ", geojson);
        // simpan fitur ke featureStore untuk list
        if (featureStore[cfg.name] !== undefined && geojson.features) {
          featureStore[cfg.name] = geojson.features;
        }

        if (featureLayerStore[cfg.name] !== undefined) {
          featureLayerStore[cfg.name] = [];
        }

        const layer = L.geoJSON(geojson, {
          style: cfg.style || undefined,
          pointToLayer: (feature, latlng) =>
            cfg.pointStyle
              ? L.circleMarker(latlng, cfg.pointStyle)
              : L.marker(latlng),
          onEachFeature: (feature, lyr) => {
            const props = feature?.properties ?? {};

            // cek konfigurasi field berdasarkan nama layer
            const fields = popupFields[cfg.name];

            let rows = "";

            if (fields) {
              // pakai urutan & subset field sesuai konfigurasi
              rows = fields
                .map(({ key, label }) => {
                  const val = props[key] ?? "-";
                  return `<tr><td><b>${label}</b></td><td>${val}</td></tr>`;
                })
                .join("");
            } else {
              // fallback: tampilkan semua atribut seperti sebelumnya (misal untuk Kantor-Pos-Security)
              rows = Object.entries(props)
                .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`)
                .join("");
            }

            lyr.bindPopup(`<table>${rows}</table>`, {
              className: "custom-popup",
            });
            if (featureLayerStore[cfg.name] !== undefined) {
              featureLayerStore[cfg.name].push({ feature, layer: lyr });
            }
          },
        });

        if (layer.getLayers().length) {
          layer.addTo(map);
          layersControl.addOverlay(layer, parseLayerName(cfg.name));
          return layer.getBounds();
        }
        return null;
      } catch (e) {
        console.error(`WFS fetch error for ${cfg.name}:`, e);
        return null;
      }
    };

    // Muat Semua Layer Berdasarkan Array
    (async () => {
      const boundsList = [];

      for (const cfg of wfsConfigs) {
        const bounds = await fetchAndAddWfsLayer(cfg);
        if (bounds) boundsList.push(bounds);
      }

      if (boundsList.length) {
        const combined = boundsList.reduce(
          (acc, b) => acc.extend(b),
          L.latLngBounds(boundsList[0])
        );
        map.fitBounds(combined, { padding: [20, 20] });
      }

      renderSummary();
    })();

    // ========= LEGEND NILAI SRA DI KANAN BAWAH =========
    const legend = L.control({ position: "bottomright" });

    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "info legend");

      div.style.background = "#011926";
      div.style.color = "white";

      div.style.padding = "8px 10px";
      div.style.borderRadius = "4px";
      div.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)";
      div.style.font = "12px/1.4 Arial, sans-serif";

      const categories = [
        { label: "Sangat Rawan", color: "#b10026" },
        { label: "Rawan", color: "#fc4e2a" },
        { label: "Normal", color: "#feb24c" },
        { label: "Aman", color: "#78c679" },
        { label: "Sangat Aman", color: "#238443" },
      ];

      let html =
        "<div style='font-weight:bold;margin-bottom:4px;'>Nilai SRA</div>";

      categories.forEach((cat) => {
        html += `
          <div style="display:flex;align-items:center;margin-bottom:2px;">
            <span style="
              width:14px;
              height:14px;
              background:${cat.color};
              border:1px solid #555;
              margin-right:6px;
              display:inline-block;
            "></span>
            <span>${cat.label}</span>
          </div>
        `;
      });

      div.innerHTML = html;

      L.DomEvent.disableClickPropagation(div);
      return div;
    };

    legend.addTo(map);
    // ===================================================

    // Kontrol Zoom
    const zoomControl = L.control.zoom({ position: "topright" });

    zoomControl.addTo(map);

    // ========= PANEL RINGKASAN DI KIRI BAWAH =========
    const summaryControl = L.control({ position: "bottomleft" });

    summaryControl.onAdd = function () {
      const div = L.DomUtil.create("div", "sra-summary");

      div.style.background = "#011926";
      div.style.color = "white";

      div.style.padding = "6px 8px";
      div.style.borderRadius = "4px";
      div.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)";
      div.style.font = "12px/1.4 Arial, sans-serif";
      div.style.margin = "6px";
      div.style.minWidth = "360px";
      div.style.maxWidth = "360px";
      div.style.textAlign = "left";

      div.innerHTML = "<i>Menghitung...</i>";

      summaryDiv = div;

      L.DomEvent.disableClickPropagation(div);
      return div;
    };

    summaryControl.addTo(map);
    // =================================================

    // Posisi Zoom Control
    const zoomEl = document.querySelector(".leaflet-control-zoom");
    if (zoomEl) {
      zoomEl.style.marginTop = "5px";
    }

    // ========= TAB "DAFTAR ASET" =========
    const assetListControl = L.control({ position: "topleft" });

    assetListControl.onAdd = function () {
      const container = L.DomUtil.create("div", "asset-list-control");

      container.style.marginTop = "70px";
      container.style.marginLeft = "10px";

      // Tombol pembuka panel
      const button = document.createElement("button");
      button.textContent = "Daftar Aset";
      button.style.background = "#011926";
      button.style.color = "white";
      button.style.border = "1px solid #777";
      button.style.borderRadius = "4px";
      button.style.padding = "6px 10px";
      button.style.cursor = "pointer";
      button.style.fontSize = "12px";
      button.style.boxShadow = "0 0 4px rgba(0,0,0,0.3)";
      button.style.marginBottom = "4px";

      // Panel list
      const panel = document.createElement("div");
      panel.className = "asset-list-panel";

      panel.style.display = "none";
      panel.style.background = "#011926";
      panel.style.color = "white";
      panel.style.padding = "8px 10px";
      panel.style.borderRadius = "4px";
      panel.style.boxShadow = "0 0 8px rgba(0,0,0,0.4)";
      panel.style.width = "360px";
      panel.style.maxHeight = "calc(100vh - 280px)";
      panel.style.overflow = "hidden";
      panel.style.font = "12px/1.4 Arial, sans-serif";

      // Scroll Wheel hanya di dalam konten tabel
      L.DomEvent.disableScrollPropagation(panel);
      L.DomEvent.disableClickPropagation(panel);

      // Input pencarian global
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Cari aset (semua kolom)...";
      searchInput.style.width = "100%";
      searchInput.style.marginBottom = "6px";
      searchInput.style.padding = "4px";
      searchInput.style.fontSize = "12px";
      searchInput.style.boxSizing = "border-box";
      searchInput.style.background = "#03394F";
      searchInput.style.color = "white";
      searchInput.style.border = "1px solid #0D4F63";

      // Container tabel & filter
      const tableContainer = document.createElement("div");
      tableContainer.style.maxHeight = "240px";
      tableContainer.style.overflowY = "auto";
      tableContainer.style.overflowX = "auto";

      const filterContainer = document.createElement("div");
      filterContainer.style.marginTop = "6px";
      filterContainer.style.fontSize = "11px";

      panel.appendChild(searchInput);
      panel.appendChild(tableContainer);
      panel.appendChild(filterContainer);

      container.appendChild(button);
      container.appendChild(panel);

      L.DomEvent.disableClickPropagation(container);

      // ====== STATE UNTUK SORT & FILTER ======
      let currentSearch = "";
      let LAYER_NAME = "Aset-Holding";

      let currentSort = { field: null, dir: "asc" }; // dir: 'asc' | 'desc'
      let currentFilter = {
        field: null,
        allowedValues: null,
      };

      let tableEl = null;
      let theadEl = null;
      let tbodyEl = null;

      const buildTableIfNeeded = (fields) => {
        if (!tableEl) {
          tableEl = document.createElement("table");
          tableEl.style.width = "100%";
          tableEl.style.borderCollapse = "collapse";
          tableEl.style.fontSize = "11px";

          theadEl = document.createElement("thead");
          tbodyEl = document.createElement("tbody");

          tableEl.appendChild(theadEl);
          tableEl.appendChild(tbodyEl);

          tableContainer.innerHTML = "";
          tableContainer.appendChild(tableEl);
        }

        // Header tabel (judul field + ikon sort)
        theadEl.innerHTML = "";
        const headerRow = document.createElement("tr");

        fields.forEach((field) => {
          const th = document.createElement("th");
          th.style.position = "relative";
          th.style.padding = "3px 6px";
          th.style.borderBottom = "1px solid rgba(255,255,255,0.3)";
          th.style.cursor = "pointer";
          th.style.whiteSpace = "nowrap";
          th.style.wordBreak = "normal";
          th.style.background = "#02293A";

          const labelSpan = document.createElement("span");
          labelSpan.textContent = field.label;

          const sortSpan = document.createElement("span");
          sortSpan.style.marginLeft = "4px";
          sortSpan.style.fontSize = "10px";
          sortSpan.textContent =
            currentSort.field === field.key
              ? currentSort.dir === "asc"
                ? "▲"
                : "▼"
              : "⇵";

          th.appendChild(labelSpan);
          th.appendChild(sortSpan);

          th.onclick = () => {
            if (currentSort.field === field.key) {
              currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
            } else {
              currentSort.field = field.key;
              currentSort.dir = "asc";
            }
            currentFilter.field = field.key; // kolom aktif untuk filter
            renderFilterOptions(field);
            renderList(currentLayerName);
          };

          headerRow.appendChild(th);
        });

        theadEl.appendChild(headerRow);
      };

      // Panel filter ala Excel di bawah tabel
      const renderFilterOptions = (field) => {
        const featsWithLayer = featureLayerStore[currentLayerName] || [];
        const fields = popupFields[currentLayerName];

        filterContainer.innerHTML = "";

        if (!featsWithLayer.length || !fields) return;

        const term = currentSearch.toLowerCase();
        const values = new Set();

        // Ambil nilai unik dari kolom yang dipilih (sesuai pencarian)
        featsWithLayer.forEach(({ feature }) => {
          const props = feature.properties || {};

          // respeksi pencarian global
          if (term) {
            const matchSearch = fields.some(({ key }) => {
              const v = props[key];
              return v != null && String(v).toLowerCase().includes(term);
            });
            if (!matchSearch) return;
          }

          const v = props[field.key] ?? "-";
          values.add(String(v));
        });

        const allValues = Array.from(values).sort((a, b) =>
          a.localeCompare(b, "id")
        );

        if (!allValues.length) return;

        const title = document.createElement("div");
        title.textContent = `Filter kolom: ${field.label}`;
        title.style.marginBottom = "4px";
        filterContainer.appendChild(title);

        // Tombol sort A-Z / Z-A
        const btnRow = document.createElement("div");
        btnRow.style.display = "flex";
        btnRow.style.gap = "6px";
        btnRow.style.marginBottom = "4px";

        const mkFilterButton = (text, onClick) => {
          const btn = document.createElement("button");
          btn.textContent = text;
          btn.style.fontSize = "10px";
          btn.style.padding = "2px 4px";
          btn.style.borderRadius = "4px";
          btn.style.border = "1px solid #0D4F63";
          btn.style.background = "#02293A";
          btn.style.color = "white";
          btn.style.cursor = "pointer";
          btn.onclick = onClick;
          return btn;
        };

        const btnAZ = mkFilterButton("A → Z", () => {
          currentSort.field = field.key;
          currentSort.dir = "asc";
          renderList(currentLayerName);
        });

        const btnZA = mkFilterButton("Z → A", () => {
          currentSort.field = field.key;
          currentSort.dir = "desc";
          renderList(currentLayerName);
        });

        btnRow.appendChild(btnAZ);
        btnRow.appendChild(btnZA);
        filterContainer.appendChild(btnRow);

        // Daftar checkbox nilai unik
        const list = document.createElement("div");
        list.style.maxHeight = "90px";
        list.style.overflowY = "auto";
        list.style.borderTop = "1px solid rgba(255,255,255,0.2)";
        list.style.paddingTop = "4px";

        allValues.forEach((val) => {
          const row = document.createElement("label");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.gap = "4px";
          row.style.fontSize = "11px";
          row.style.marginBottom = "2px";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked =
            !currentFilter.allowedValues ||
            !currentFilter.allowedValues.size ||
            currentFilter.allowedValues.has(val);

          cb.onchange = () => {
            if (!currentFilter.field || currentFilter.field !== field.key) {
              currentFilter.field = field.key;
              currentFilter.allowedValues = new Set();
            }
            if (!currentFilter.allowedValues) {
              currentFilter.allowedValues = new Set();
            }

            if (cb.checked) {
              currentFilter.allowedValues.add(val);
            } else {
              currentFilter.allowedValues.delete(val);
            }

            // kalau kosong → anggap tidak ada filter
            if (!currentFilter.allowedValues.size) {
              currentFilter.allowedValues = null;
            }

            renderList(currentLayerName);
          };

          const span = document.createElement("span");
          span.textContent = val;

          row.appendChild(cb);
          row.appendChild(span);
          list.appendChild(row);
        });

        filterContainer.appendChild(list);
      };

      // Render tabel utama
      const renderList = () => {
        const featsWithLayer = featureLayerStore[LAYER_NAME] || [];
        const fields = popupFields[LAYER_NAME];

        if (!featsWithLayer.length || !fields) {
          tableContainer.innerHTML = "<i>Data belum termuat atau kosong.</i>";
          filterContainer.innerHTML = "";
          tableEl = null;
          theadEl = null;
          tbodyEl = null;
          return;
        }

        buildTableIfNeeded(fields);

        const term = currentSearch.toLowerCase();
        let rows = featsWithLayer;

        // Filter pencarian global
        if (term) {
          rows = rows.filter(({ feature }) => {
            const props = feature.properties || {};
            return fields.some(({ key }) => {
              const val = props[key];
              return val != null && String(val).toLowerCase().includes(term);
            });
          });
        }

        // Filter berdasarkan checkbox nilai unik
        if (
          currentFilter.field &&
          currentFilter.allowedValues &&
          currentFilter.allowedValues.size
        ) {
          rows = rows.filter(({ feature }) => {
            const props = feature.properties || {};
            const v = props[currentFilter.field] ?? "-";
            return currentFilter.allowedValues.has(String(v));
          });
        }

        // Sort
        if (currentSort.field) {
          const key = currentSort.field;
          const dir = currentSort.dir === "asc" ? 1 : -1;
          rows = [...rows].sort((a, b) => {
            const va = a.feature.properties?.[key];
            const vb = b.feature.properties?.[key];
            return String(va ?? "").localeCompare(String(vb ?? ""), "id") * dir;
          });
        }

        // Isi tabel
        tbodyEl.innerHTML = "";

        if (!rows.length) {
          const tr = document.createElement("tr");
          const td = document.createElement("td");
          td.colSpan = fields.length;
          td.innerHTML = "<i>Tidak ada aset yang cocok.</i>";
          td.style.padding = "4px 6px";
          tr.appendChild(td);
          tbodyEl.appendChild(tr);
          return;
        }

        rows.forEach(({ feature, layer }) => {
          const props = feature.properties || {};
          const tr = document.createElement("tr");

          tr.style.cursor = "pointer";

          tr.onmouseenter = () => {
            tr.style.background = "#03394F";
          };
          tr.onmouseleave = () => {
            tr.style.background = "transparent";
          };

          // Klik baris → zoom + popup
          tr.onclick = () => {
            try {
              if (layer.getBounds) {
                const b = layer.getBounds();
                if (b.isValid && b.isValid()) {
                  map.fitBounds(b, { padding: [20, 20], maxZoom: 17 });
                } else {
                  map.fitBounds(b, { padding: [20, 20] });
                }
              } else if (layer.getLatLng) {
                const latlng = layer.getLatLng();
                map.setView(latlng, 17);
              }
              if (layer.openPopup) {
                layer.openPopup();
              }
            } catch (e) {
              console.error("Gagal zoom ke aset:", e);
            }
          };

          fields.forEach(({ key }) => {
            const td = document.createElement("td");
            const val = props[key] ?? "-";
            td.textContent = val;
            td.style.padding = "3px 6px";
            td.style.borderBottom = "1px solid rgba(255,255,255,0.15)";
            td.style.color = "white";
            td.style.whiteSpace = "nowrap";
            td.style.wordBreak = "normal";
            tr.appendChild(td);
          });

          tbodyEl.appendChild(tr);
        });

        // refresh icon sort di header
        buildTableIfNeeded(fields);
      };

      // Toggle panel
      button.onclick = () => {
        const isHidden =
          panel.style.display === "none" || panel.style.display === "";
        panel.style.display = isHidden ? "block" : "none";
        if (isHidden) {
          // reset sort & filter ketika panel dibuka ulang
          currentSort = { field: null, dir: "asc" };
          currentFilter = { field: null, allowedValues: null };
          renderList();

          const fields = popupFields[LAYER_NAME];
          if (fields && fields.length) {
            renderFilterOptions(fields[0]);
          } else {
            filterContainer.innerHTML = "";
          }
        }
      };

      // Pencarian global
      searchInput.oninput = () => {
        currentSearch = searchInput.value || "";
      };

      return container;
    };

    assetListControl.addTo(map);
    // ============================================================

    // ========= FULL-WIDTH HEADER TITLE WEBGIS DI BAGIAN ATAS =========
    const titleControl = L.control({ position: "topleft" });

    titleControl.onAdd = function () {
      const div = L.DomUtil.create("div", "webgis-title");

      // FULL-WIDTH BAR
      div.style.position = "fixed";
      div.style.top = "0";
      div.style.left = "0px";
      div.style.right = "10px";
      div.style.background = "#011926";
      div.style.color = "white";
      div.style.padding = "10px 20px";
      div.style.fontSize = "18px";
      div.style.fontWeight = "500";
      div.style.fontFamily = "Arial, sans-serif";
      div.style.letterSpacing = "0.5px";
      div.style.whiteSpace = "nowrap";
      div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      div.style.zIndex = "9999";

      div.innerHTML =
        "Dashboard Security Risk Assessment Aset Head Office Pertamina";

      L.DomEvent.disableClickPropagation(div);
      return div;
    };

    titleControl.addTo(map);
    // ====================================================

    // ===== PINDAHKAN PANEL LAYERS KE BAWAH HEADER BIRU =====
    const layerCtrlEl = document.querySelector(".leaflet-control-layers");
    if (layerCtrlEl) {
      layerCtrlEl.style.marginTop = "70px";
      layerCtrlEl.style.marginRight = "10px";
    }

    // Clean Up
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapEl} style={{ height: "100vh", width: "100vw" }} />;
}
