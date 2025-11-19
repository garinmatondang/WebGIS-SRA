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

      if (v === "Sangat Rawan") return "#b10026"; // merah tua
      if (v === "Rawan") return "#fc4e2a"; // merah-oranye
      if (v === "Normal") return "#feb24c"; // kuning
      if (v === "Aman") return "#78c679"; // hijau muda
      if (v === "Sangat Aman") return "#238443"; // hijau tua

      return "#999999"; // fallback kalau ada nilai lain / null
    };

    const getKategoriSra = (props) => {
      return props?.["Nilai SRA"] || "";
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
      "Aset-SubHolding": [],
    };

    const featureLayerStore = {
      "Aset-Holding": [],
      "Aset-SubHolding": [],
    };

    const wfsConfigs = [
      {
        name: "Aset-Holding",
        typename: `${workspace}:Aset-Holding`,
        style: getSraStyle,
        pointStyle: null,
      },
      {
        name: "Aset-SubHolding",
        typename: `${workspace}:Aset-SubHolding`,
        style: getSraStyle,
        pointStyle: null,
      },
      {
        name: "Kantor-Pos-Security",
        typename: `${workspace}:Kantor-Pos-Security`,
        style: null,
        pointStyle: {
          radius: 9,
          fillColor: "#8A2BE2",
          fillOpacity: 1.0,
          color: "#8A2BE2",
          weight: 0.5,
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
        { key: "Nilai SRA", label: "Nilai SRA" },
        { key: "Tgl Update", label: "Tgl Update" },
      ],
      "Aset-SubHolding": [
        { key: "Block", label: "Block" },
        { key: "Operator", label: "Operator" },
        { key: "Contract", label: "Contract" },
        { key: "Luas (ha)", label: "Luas (ha)" },
        { key: "Perusahaan", label: "Perusahaan" },
        { key: "SubHolding", label: "SubHolding" },
        { key: "Region", label: "Region" },
        { key: "Nilai SRA", label: "Nilai SRA" },
        { key: "Tgl Update", label: "Tgl Update" },
      ],
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
        const val = getKategoriSra(props); // pakai helper yang sudah ada
        if (counts[val] !== undefined) {
          counts[val] += 1;
        }
      });

      return counts;
    };

    const renderSummary = () => {
      if (!summaryDiv) return;

      const holdingCounts = countBySra(featureStore["Aset-Holding"]);
      const subCounts = countBySra(featureStore["Aset-SubHolding"]);

      summaryDiv.innerHTML = `
    <div style="font-weight:bold;text-align:center;margin-bottom:6px;">
      Jumlah Aset Berdasarkan Nilai SRA
    </div>

    <div style="
      display:flex;
      flex-wrap:nowrap;
      gap:16px;
      justify-content:center;
      align-items:flex-start;
      text-align:center;
    ">
      <!-- Kolom Aset-Holding -->
      <div style="flex:1; min-width:150px;">
        <div style="font-weight:bold;margin-bottom:4px;">
          Aset-Holding
        </div>
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          ${sraCategories
            .map(
              (cat) => `
            <tr>
              <td style="padding:1px 2px;text-align:center;">${cat}</td>
              <td style="padding:1px 2px;text-align:center;">${holdingCounts[cat]}</td>
            </tr>`
            )
            .join("")}
        </table>
      </div>

      <!-- Kolom Aset-SubHolding -->
      <div style="flex:1; min-width:150px;">
        <div style="font-weight:bold;margin-bottom:4px;">
          Aset-SubHolding
        </div>
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          ${sraCategories
            .map(
              (cat) => `
            <tr>
              <td style="padding:1px 2px;text-align:center;">${cat}</td>
              <td style="padding:1px 2px;text-align:center;">${subCounts[cat]}</td>
            </tr>`
            )
            .join("")}
        </table>
      </div>
    </div>
  `;
    };
    // ======================================================

    // Fetch & Menambah Layer ke Map
    const fetchAndAddWfsLayer = async (cfg) => {
      try {
        const url = buildWfsUrl(cfg.typename);
        const res = await fetch(url);
        const geojson = await res.json();

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

            lyr.bindPopup(`<table>${rows}</table>`);
            if (featureLayerStore[cfg.name] !== undefined) {
              featureLayerStore[cfg.name].push({ feature, layer: lyr });
            }
          },
        });

        if (layer.getLayers().length) {
          layer.addTo(map);
          layersControl.addOverlay(layer, cfg.name);
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
      const boundsList = await Promise.all(wfsConfigs.map(fetchAndAddWfsLayer));

      const nonNull = boundsList.filter(Boolean);
      if (nonNull.length) {
        const combined = nonNull.reduce(
          (acc, b) => acc.extend(b),
          L.latLngBounds(nonNull[0])
        );
        map.fitBounds(combined, { padding: [20, 20] });
      }

      // setelah semua fitur termuat ke featureStore, render ringkasan
      renderSummary();
    })();

    // ========= LEGEND NILAI SRA DI KANAN BAWAH =========
    const legend = L.control({ position: "bottomright" });

    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "info legend");

      div.style.background = "white";
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

      div.style.background = "white";
      div.style.padding = "8px 10px";
      div.style.borderRadius = "4px";
      div.style.boxShadow = "0 0 6px rgba(0,0,0,0.3)";
      div.style.font = "12px/1.4 Arial, sans-serif";
      div.style.margin = "10px";
      div.style.minWidth = "340px";
      div.style.textAlign = "center";

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

    // ========= TAB "LIST ASET" (DI BAWAH JUDUL) =========
    const assetListControl = L.control({ position: "topleft" });

    assetListControl.onAdd = function () {
      const container = L.DomUtil.create("div", "asset-list-control");

      container.style.marginTop = "70px"; // geser ke bawah biar di bawah judul
      container.style.marginLeft = "10px";

      // Tombol pembuka panel
      const button = document.createElement("button");
      button.textContent = "List Aset";
      button.style.background = "#ffffff";
      button.style.border = "1px solid #777";
      button.style.borderRadius = "4px";
      button.style.padding = "6px 10px";
      button.style.cursor = "pointer";
      button.style.fontSize = "12px";
      button.style.boxShadow = "0 0 4px rgba(0,0,0,0.3)";
      button.style.marginBottom = "4px";

      // Panel list
      const panel = document.createElement("div");
      panel.style.display = "none";
      panel.style.background = "white";
      panel.style.padding = "8px 10px";
      panel.style.borderRadius = "4px";
      panel.style.boxShadow = "0 0 8px rgba(0,0,0,0.4)";
      panel.style.width = "260px";
      panel.style.maxHeight = "300px";
      panel.style.overflowY = "auto";
      panel.style.font = "12px/1.4 Arial, sans-serif";

      const header = document.createElement("div");
      header.textContent = "List Aset";
      header.style.fontWeight = "bold";
      header.style.marginBottom = "6px";

      const select = document.createElement("select");
      select.style.width = "100%";
      select.style.marginBottom = "6px";
      select.style.padding = "4px";
      select.style.fontSize = "12px";

      const optHolding = document.createElement("option");
      optHolding.value = "Aset-Holding";
      optHolding.textContent = "Aset-Holding";

      const optSubHolding = document.createElement("option");
      optSubHolding.value = "Aset-SubHolding";
      optSubHolding.textContent = "Aset-SubHolding";

      select.appendChild(optHolding);
      select.appendChild(optSubHolding);

      const listContainer = document.createElement("div");

      panel.appendChild(header);
      panel.appendChild(select);
      panel.appendChild(listContainer);

      container.appendChild(button);
      container.appendChild(panel);

      L.DomEvent.disableClickPropagation(container);

      const renderList = (layerName) => {
        listContainer.innerHTML = "";

        const feats = featureStore[layerName] || [];
        const fields = popupFields[layerName];

        if (!feats.length || !fields) {
          listContainer.innerHTML = "<i>Data belum termuat atau kosong.</i>";
          return;
        }

        feats.forEach((feat, idx) => {
          const item = document.createElement("div");
          item.style.borderBottom = "1px solid #ddd";
          item.style.padding = "4px 0";
          item.style.cursor = "pointer"; // biar kelihatan bisa diklik
          item.style.background = "#ffffff";

          let html = `<table style="margin-bottom:6px;">`;

          fields.forEach(({ key, label }) => {
            const val = feat.properties?.[key] ?? "-";
            html += `<tr><td><b>${label}</b></td><td>${val}</td></tr>`;
          });

          html += "</table>";
          item.innerHTML = html;

          // ⬇️ KLIK LIST = ZOOM KE ASET
          item.onclick = () => {
            const entry = featureLayerStore[layerName]?.[idx];
            if (!entry || !entry.layer) return;

            const lyr = entry.layer;

            // Kalau poligon/garis
            if (typeof lyr.getBounds === "function") {
              const b = lyr.getBounds();
              if (b && b.isValid && b.isValid()) {
                map.fitBounds(b, { padding: [20, 20] });
              } else {
                // fallback kalau getBounds tidak valid
                const center = b.getCenter ? b.getCenter() : null;
                if (center) map.setView(center, 14);
              }
            }
            // Kalau point (marker/circleMarker)
            else if (typeof lyr.getLatLng === "function") {
              map.setView(lyr.getLatLng(), 16);
            }

            // buka popup-nya juga
            if (typeof lyr.openPopup === "function") {
              lyr.openPopup();
            }
          };

          listContainer.appendChild(item);
        });
      };

      button.onclick = () => {
        const isHidden =
          panel.style.display === "none" || panel.style.display === "";
        panel.style.display = isHidden ? "block" : "none";
        if (isHidden) {
          renderList(select.value);
        }
      };

      select.onchange = () => {
        renderList(select.value);
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
      div.style.background = "#0A3566";
      div.style.color = "white";
      div.style.padding = "10px 20px";
      div.style.fontSize = "18px";
      div.style.fontWeight = "bold";
      div.style.fontFamily = "Arial, sans-serif";
      div.style.letterSpacing = "0.5px";
      div.style.whiteSpace = "nowrap";
      div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      div.style.zIndex = "9999";

      div.innerHTML = "WebGIS Security Risk Assessment Aset Pertamina";

      L.DomEvent.disableClickPropagation(div);
      return div;
    };

    titleControl.addTo(map);
    // ====================================================

    // ===== PINDAHKAN PANEL LAYERS KE BAWAH HEADER BIRU =====
    const layerCtrlEl = document.querySelector(".leaflet-control-layers");
    if (layerCtrlEl) {
      layerCtrlEl.style.marginTop = "70px"; // geser turun dari atas
      layerCtrlEl.style.marginRight = "10px"; // sedikit jarak dari kanan
    }

    // Clean Up
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapEl} style={{ height: "100vh", width: "100vw" }} />;
}
