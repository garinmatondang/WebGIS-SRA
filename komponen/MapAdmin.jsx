import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function AdminMap() {
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

    // Baca kategori SRA dari beberapa kemungkinan nama field
    const getKategoriSra = (props) => {
      return (
        props?.["Nilai SRA"] || // alias "cantik"
        props?.NILAI_SRA || // nama shapefile umum
        props?.Nilai_SRA ||
        props?.nilai_sra ||
        ""
      );
    };

    const getSraStyle = (feature) => {
      const props = feature?.properties || {};
      const kategori = getKategoriSra(props);
      const color = getSraColor(kategori);
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

    // Endpoint WFS-T (POST Transaction)
    const wfsTransactionUrl = `${geoserverBase}/${workspace}/wfs`;

    // ========= NAMA FIELD SHAPEFILE (BACKEND) PER LAYER =========
    // SESUAIKAN DENGAN HASIL DescribeFeatureType DI GEOSERVER
    const BACKEND_FIELD_NAMES = {
      "Aset-Holding": {
        nilai: "Nilai_SRA", // misal nama field shapefile: NILAI_SRA
        tgl: "Tgl_Update", // misal nama field shapefile: TGL_UPDATE
      },
      "Aset-SubHolding": {
        nilai: "Nilai_SRA",
        tgl: "Tgl_Update",
      },
    };
    // ============================================================

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

    // Membangun URL WFS (GET GeoJSON / baca)
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

    // Helper baca nilai tampilan (alias "Nilai SRA"/"Tgl Update" ↔ field backend)
    const getFieldValueForDisplay = (layerName, props, key) => {
      if (!props) return "-";

      if (key === "Nilai SRA") {
        return (
          props["Nilai SRA"] ??
          props.NILAI_SRA ??
          props.Nilai_SRA ??
          props.nilai_sra ??
          "-"
        );
      }

      if (key === "Tgl Update") {
        return (
          props["Tgl Update"] ??
          props.Tgl_Update ??
          props.TGL_UPDATE ??
          props.tgl_update ??
          "-"
        );
      }

      // field lain tetap biasa
      return props[key] ?? "-";
    };

    // ===== KONFIGURASI FIELD POPUP PER LAYER =====
    // Key di sini mengikuti nama PROPERTY yang keluar di GeoJSON (yang sekarang sudah jalan).
    // Label hanya untuk tampilan.
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

    // ========== HELPER UNTUK WFS-T UPDATE ================
    const escapeXml = (unsafe) =>
      unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const formatDateTimeLocal = () => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      // contoh format: 2025-11-19 14:35
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // ====== NOTIFIKASI KECIL (SNACKBAR) DI BAWAH HEADER ======
    let notificationEl = null;
    let notificationTimeout = null;

    const showNotification = (message, type = "success") => {
      if (!notificationEl) {
        notificationEl = document.createElement("div");
        notificationEl.style.position = "fixed";
        notificationEl.style.top = "52px"; // tepat di bawah header biru
        notificationEl.style.left = "50%";
        notificationEl.style.transform = "translateX(-50%)";
        notificationEl.style.zIndex = "9999";
        notificationEl.style.padding = "6px 12px";
        notificationEl.style.borderRadius = "4px";
        notificationEl.style.fontSize = "12px";
        notificationEl.style.fontFamily = "Arial, sans-serif";
        notificationEl.style.boxShadow = "0 0 6px rgba(0,0,0,0.25)";
        notificationEl.style.transition = "opacity 0.3s ease";
        document.body.appendChild(notificationEl);
      }

      notificationEl.textContent = message;
      notificationEl.style.opacity = "1";

      if (type === "success") {
        notificationEl.style.background = "#E6FFED";
        notificationEl.style.color = "#166534";
        notificationEl.style.border = "1px solid #4ade80";
      } else if (type === "error") {
        notificationEl.style.background = "#FEE2E2";
        notificationEl.style.color = "#991B1B";
        notificationEl.style.border = "1px solid #fca5a5";
      } else {
        notificationEl.style.background = "#E5E7EB";
        notificationEl.style.color = "#111827";
        notificationEl.style.border = "1px solid #9CA3AF";
      }

      // reset timer lama
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
      notificationTimeout = setTimeout(() => {
        if (notificationEl) {
          notificationEl.style.opacity = "0";
        }
      }, 2500);
    };
    // ==========================================================

    /**
     * Kirim WFS-T Update ke GeoServer untuk mengubah:
     *  - Nilai SRA
     *  - Tgl Update (otomatis diisi saat ini)
     */
    const updateFeatureSra = async (layerName, featIndex, newSra) => {
      const feats = featureStore[layerName];
      if (!feats || !feats[featIndex]) return;

      const feature = feats[featIndex];

      // fid dari GeoJSON WFS (contoh: "WebGIS-SRA:Aset-Holding.1")
      const fid = feature.id;
      if (!fid) {
        alert(
          "Tidak ditemukan fid pada fitur, tidak bisa menjalankan WFS-T. Cek konfigurasi WFS (featureId)."
        );
        return;
      }

      const nowStr = formatDateTimeLocal();

      const cfg = wfsConfigs.find((c) => c.name === layerName);
      if (!cfg) return;

      // ambil nama tipe lokal (mis: "Aset-Holding" dari "WebGIS-SRA:Aset-Holding")
      const localTypeName = cfg.typename.split(":")[1];

      const backend = BACKEND_FIELD_NAMES[layerName] || {};
      const backendNilaiSra = backend.nilai || "NILAI_SRA";
      const backendTglUpdate = backend.tgl || "TGL_UPDATE";

      // --- WFS-T pakai nama field shapefile (tanpa spasi) ---
      const transactionBody = `<?xml version="1.0" encoding="UTF-8"?>
<wfs:Transaction service="WFS" version="1.1.0"
 xmlns:wfs="http://www.opengis.net/wfs"
 xmlns:gml="http://www.opengis.net/gml"
 xmlns:ogc="http://www.opengis.net/ogc"
 xmlns:sra="http://localhost:8080/geoserver/${workspace}">
  <wfs:Update typeName="sra:${localTypeName}">
    <wfs:Property>
      <wfs:Name>${backendNilaiSra}</wfs:Name>
      <wfs:Value>${escapeXml(newSra)}</wfs:Value>
    </wfs:Property>
    <wfs:Property>
      <wfs:Name>${backendTglUpdate}</wfs:Name>
      <wfs:Value>${escapeXml(nowStr)}</wfs:Value>
    </wfs:Property>
    <ogc:Filter>
      <ogc:FeatureId fid="${escapeXml(fid)}"/>
    </ogc:Filter>
  </wfs:Update>
</wfs:Transaction>`;

      try {
        const res = await fetch(wfsTransactionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml",
          },
          body: transactionBody,
        });

        const text = await res.text();
        console.log("WFS-T response:", text);

        // 1) kalau HTTP-nya gagal (500, 404, dll)
        if (!res.ok) {
          alert("Request WFS-T gagal di level HTTP. Cek console.");
          return;
        }

        // 2) kalau GeoServer mengembalikan ExceptionReport
        if (text.includes("ExceptionReport")) {
          alert(
            "GeoServer mengembalikan ExceptionReport (gagal WFS-T). Cek console."
          );
          return;
        }
        const updatedMatch = text.match(
          /<wfs:totalUpdated>(\d+)<\/wfs:totalUpdated>/
        );
        const totalUpdated = updatedMatch ? parseInt(updatedMatch[1], 10) : 0;
        if (totalUpdated <= 0) {
          alert(
            "Tidak ada fitur yang ter-update. Cek filter fid atau nama field."
          );
          return;
        }

        // ==== Jika berhasil, sinkronkan perubahan di client ====
        // Simpan ke nama field backend shapefile
        feature.properties[backendNilaiSra] = newSra;
        feature.properties[backendTglUpdate] = nowStr;
        // Dan juga ke alias "cantik" kalau ada
        feature.properties["Nilai SRA"] = newSra;
        feature.properties["Tgl Update"] = nowStr;

        const entry = featureLayerStore[layerName]?.[featIndex];
        if (entry && entry.layer) {
          // update style polygon
          if (entry.layer.setStyle && cfg.style) {
            entry.layer.setStyle(cfg.style(feature));
          }

          // rebuild popup sesuai popupFields
          const props = feature.properties || {};
          const fields = popupFields[layerName];
          if (fields) {
            const rows = fields
              .map(({ key, label }) => {
                const val = props[key] ?? "-";
                return `<tr><td><b>${label}</b></td><td>${val}</td></tr>`;
              })
              .join("");
            entry.layer.bindPopup(`<table>${rows}</table>`);
          }
        }

        // update ringkasan
        renderSummary();

        showNotification(
          `Nilai SRA & Tgl Update berhasil diubah (${layerName}).`,
          "success"
        );
      } catch (err) {
        console.error("Error WFS-T:", err);
        alert("Terjadi error saat menghubungi GeoServer (WFS-T).");
      }
    };
    // ===================================================

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
              rows = fields
                .map(({ key, label }) => {
                  const val = getFieldValueForDisplay(cfg.name, props, key);
                  return `<tr><td><b>${label}</b></td><td>${val}</td></tr>`;
                })
                .join("");
            } else {
              // fallback: semua atribut (misal Kantor-Pos-Security)
              rows = Object.entries(props)
                .map(
                  ([k, v]) =>
                    `<tr><td><b>${k}</b></td><td>${String(v)}</td></tr>`
                )
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

      const nonNull = boundsList.filter((b) => Boolean(b));
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

    // ========= TAB "LIST ASET" (Admin – Bisa Edit Nilai SRA) =========
    const assetListControl = L.control({ position: "topleft" });

    assetListControl.onAdd = function () {
      const container = L.DomUtil.create("div", "asset-list-control");

      container.style.marginTop = "70px"; // geser ke bawah biar di bawah judul
      container.style.marginLeft = "10px";

      // Tombol pembuka panel
      const button = document.createElement("button");
      button.textContent = "List Aset (Admin)";
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
      panel.style.width = "280px";
      panel.style.maxHeight = "360px";
      panel.style.overflowY = "auto";
      panel.style.font = "12px/1.4 Arial, sans-serif";

      const header = document.createElement("div");
      header.textContent = "List Aset (Admin – Edit Nilai SRA)";
      header.style.fontWeight = "bold";
      header.style.marginBottom = "6px";

      const info = document.createElement("div");
      info.innerHTML =
        "<small>Klik item untuk zoom & lihat popup. Gunakan tombol di bawah untuk mengubah Nilai SRA.</small>";
      info.style.marginBottom = "6px";

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
      panel.appendChild(info);
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
          item.style.cursor = "pointer";
          item.style.background = "#ffffff";

          const table = document.createElement("table");
          table.style.marginBottom = "4px";

          fields.forEach(({ key, label }) => {
            const row = document.createElement("tr");
            const tdLabel = document.createElement("td");
            tdLabel.innerHTML = `<b>${label}</b>`;
            const tdVal = document.createElement("td");
            tdVal.textContent = getFieldValueForDisplay(
              layerName,
              feat.properties,
              key
            );
            row.appendChild(tdLabel);
            row.appendChild(tdVal);
            table.appendChild(row);
          });

          item.appendChild(table);

          // === Tombol Admin: Ubah Nilai SRA ===
          const adminBar = document.createElement("div");
          adminBar.style.display = "flex";
          adminBar.style.justifyContent = "space-between";
          adminBar.style.alignItems = "center";
          adminBar.style.gap = "4px";

          const currentLabel = document.createElement("span");
          currentLabel.style.fontSize = "11px";
          currentLabel.textContent = `SRA saat ini: ${
            getKategoriSra(feat.properties) || "-"
          }`;

          const editBtn = document.createElement("button");
          editBtn.textContent = "Ubah Nilai SRA";
          editBtn.style.fontSize = "11px";
          editBtn.style.padding = "2px 4px";
          editBtn.style.borderRadius = "3px";
          editBtn.style.border = "1px solid #444";
          editBtn.style.background = "#0A3566";
          editBtn.style.color = "#fff";
          editBtn.style.cursor = "pointer";

          editBtn.onclick = (ev) => {
            ev.stopPropagation();

            // kalau editor sudah ada, jangan buat dua kali
            if (item.querySelector(".sra-edit-inline")) return;

            const currentVal = (getKategoriSra(feat.properties) || "").trim();

            // container editor
            const editor = document.createElement("div");
            editor.className = "sra-edit-inline";
            editor.style.display = "flex";
            editor.style.alignItems = "center";
            editor.style.gap = "4px";
            editor.style.marginTop = "4px";
            editor.style.paddingTop = "4px";
            editor.style.borderTop = "1px dashed #ccc";

            const label = document.createElement("span");
            label.style.fontSize = "11px";
            label.textContent = "Ubah ke:";

            const selectSra = document.createElement("select");
            selectSra.style.fontSize = "11px";
            selectSra.style.padding = "2px 4px";
            selectSra.style.flex = "1";

            sraCategories.forEach((cat) => {
              const opt = document.createElement("option");
              opt.value = cat;
              opt.textContent = cat;
              if (cat === currentVal) opt.selected = true;
              selectSra.appendChild(opt);
            });

            const btnSimpan = document.createElement("button");
            btnSimpan.textContent = "Simpan";
            btnSimpan.style.fontSize = "11px";
            btnSimpan.style.padding = "2px 6px";
            btnSimpan.style.borderRadius = "3px";
            btnSimpan.style.border = "1px solid #0A3566";
            btnSimpan.style.background = "#0A3566";
            btnSimpan.style.color = "#fff";
            btnSimpan.style.cursor = "pointer";

            const btnBatal = document.createElement("button");
            btnBatal.textContent = "Batal";
            btnBatal.style.fontSize = "11px";
            btnBatal.style.padding = "2px 6px";
            btnBatal.style.borderRadius = "3px";
            btnBatal.style.border = "1px solid #999";
            btnBatal.style.background = "#f5f5f5";
            btnBatal.style.cursor = "pointer";

            btnBatal.onclick = (e2) => {
              e2.stopPropagation();
              editor.remove();
            };

            btnSimpan.onclick = async (e2) => {
              e2.stopPropagation();
              const newVal = selectSra.value.trim();

              if (!newVal || newVal === currentVal) {
                editor.remove();
                return;
              }

              await updateFeatureSra(layerName, idx, newVal);
              // refresh tampilan list supaya Nilai SRA & Tgl Update terlihat update
              renderList(layerName);
            };

            editor.appendChild(label);
            editor.appendChild(selectSra);
            editor.appendChild(btnSimpan);
            editor.appendChild(btnBatal);

            item.appendChild(editor);
          };

          adminBar.appendChild(currentLabel);
          adminBar.appendChild(editBtn);

          item.appendChild(adminBar);

          // ⬇️ KLIK LIST = ZOOM KE ASET
          item.onclick = () => {
            const entry = featureLayerStore[layerName]?.[idx];
            if (!entry || !entry.layer) return;

            const lyr = entry.layer;

            if (lyr.getBounds) {
              const b = lyr.getBounds();
              if (b && b.isValid && b.isValid()) {
                map.fitBounds(b, { padding: [20, 20] });
              } else if (b && b.getCenter) {
                const center = b.getCenter();
                map.setView(center, 14);
              }
            } else if (lyr.getLatLng) {
              map.setView(lyr.getLatLng(), 16);
            }

            if (lyr.openPopup) {
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

      div.innerHTML =
        "WebGIS Security Risk Assessment Aset Pertamina – <span style='font-size:14px;font-weight:normal;'>Laman Admin</span>";

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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (notificationEl) {
        notificationEl.remove();
        notificationEl = null;
      }
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
    };
  }, []);

  return <div ref={mapEl} style={{ height: "100vh", width: "100vw" }} />;
}
