// app.js (JavaScript only)

function $(id) { return document.getElementById(id); }

function setOut(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function readNumber(id) {
  const el = $(id);
  if (!el) return NaN;
  const t = el.value.trim();
  if (t === "") return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function readText(id) {
  const el = $(id);
  return el ? el.value.trim() : "";
}

function fmtFt(x) {
  return Number.isFinite(x) ? `${x.toFixed(3)} ft` : "—";
}

function fmtDeg(x) {
  return Number.isFinite(x) ? `${x.toFixed(6)}°` : "—";
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// great-circle distance (haversine), result in feet
function distanceFtBetween(lat1Deg, lon1Deg, lat2Deg, lon2Deg) {
  const toRad = d => d * Math.PI / 180;
  const R_FT = 6371008.8 * 3.280839895;

  const φ1 = toRad(lat1Deg);
  const φ2 = toRad(lat2Deg);
  const Δφ = toRad(lat2Deg - lat1Deg);
  const Δλ = toRad(lon2Deg - lon1Deg);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_FT * c;
}

// ---------- DMS helpers ----------
function dmsToDecimal(deg, min, sec, hem, isLat) {
  if (![deg, min, sec].every(Number.isFinite)) return NaN;

  const maxDeg = isLat ? 90 : 180;
  if (deg < 0 || deg > maxDeg) return NaN;
  if (min < 0 || min >= 60) return NaN;
  if (sec < 0 || sec >= 60) return NaN;

  let dd = deg + (min / 60) + (sec / 3600);
  hem = (hem || "").toUpperCase();
  if ((isLat && hem === "S") || (!isLat && hem === "W")) dd = -dd;
  return dd;
}

function decimalToDMS(dd, isLat) {
  if (!Number.isFinite(dd)) return { deg: NaN, min: NaN, sec: NaN, hem: "" };

  const hem = isLat ? (dd >= 0 ? "N" : "S") : (dd >= 0 ? "E" : "W");
  const abs = Math.abs(dd);

  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;

  return { deg, min, sec, hem };
}

function ddToDmsString(dd, isLat) {
  const d = decimalToDMS(dd, isLat);
  return `${d.deg}° ${d.min}' ${d.sec.toFixed(3)}" ${d.hem}`;
}

function formatTypedDMS(deg, min, sec, hem, isLat) {
  if (![deg, min, sec].every(Number.isFinite)) return "";
  hem = (hem || "").toUpperCase();
  if (isLat && !["N", "S"].includes(hem)) return "";
  if (!isLat && !["E", "W"].includes(hem)) return "";
  return `${deg}° ${min}' ${sec.toFixed(3)}" ${hem}`;
}

function formatPoint(latDMS, lonDMS) {
  if (!latDMS || !lonDMS) return "—";
  return `LAT ${latDMS} | LON ${lonDMS}`;
}

// ---------- Bearings and movement ----------
function bearingDegrees(lat1Deg, lon1Deg, lat2Deg, lon2Deg) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  const φ1 = toRad(lat1Deg);
  const φ2 = toRad(lat2Deg);
  const Δλ = toRad(lon2Deg - lon1Deg);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function destinationPoint(latDeg, lonDeg, bearingDeg, distanceFt) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  const R_FT = 6371008.8 * 3.280839895;

  const δ = distanceFt / R_FT;
  const θ = toRad(bearingDeg);

  const φ1 = toRad(latDeg);
  const λ1 = toRad(lonDeg);

  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);

  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);

  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  const lon2 = (toDeg(λ2) + 540) % 360 - 180;
  const lat2 = toDeg(φ2);

  return { latDeg: lat2, lonDeg: lon2 };
}

// ---------- RTD ----------
function updateRTD() {
  const drclText = document.getElementById("out_DRCL")?.textContent || "";
  const dtdText  = document.getElementById("out_DTD")?.textContent  || "";

  const drcl = parseFloat(drclText.replace(/[^0-9.-]/g, ""));
  const dtd  = parseFloat(dtdText.replace(/[^0-9.-]/g, ""));

  const rtd =
    Number.isFinite(drcl) && Number.isFinite(dtd)
      ? Math.sqrt((drcl * drcl) + (dtd * dtd))
      : NaN;

  setOut("out_RTD", Number.isFinite(rtd) ? fmtFt(rtd) : "—");
}

// ---------- Magnetic Variation helpers ----------
function wrap360(deg) {
  let x = deg % 360;
  if (x < 0) x += 360;
  return x;
}

// Signed MV convention TRUE -> MAG:
// East is least (subtract) => East = negative
// West is best  (add)      => West = positive
function getSignedMV() {
  const mvAbs = Math.abs(readNumber("mvDeg") || 0);
  const mvDir = (readText("mvDir") || "E").toUpperCase();

  const signedMV = (mvDir === "E") ? -mvAbs : mvAbs;

  // Display: show "-" for East, show no "+" for West
  let mvDisplay = "—";
  if (mvAbs > 0) {
    mvDisplay = (mvDir === "E") ? `-${mvAbs}°` : `${mvAbs}°`;
  }
  setOut("out_MV", mvDisplay);

  return signedMV;
}

function trueToMag(trueDeg, signedMV) {
  return wrap360(trueDeg + signedMV);
}

// ---------- State ----------
const state = {
  dthrFt: NaN,
  headingDeg: NaN,

  threshold: { latDD: NaN, lonDD: NaN, latDMS: "", lonDMS: "" },
  depEnd:    { latDD: NaN, lonDD: NaN, latDMS: "", lonDMS: "" },
  mvSignedDeg: 0,

  dispThr:   { latDD: NaN, lonDD: NaN, present: false }, // (7)
  rpi:       { latDD: NaN, lonDD: NaN },                 // (2)
  cl:        { latDD: NaN, lonDD: NaN },                 // (3)
  radar:     { latDD: NaN, lonDD: NaN, side: "" },       // (5)
  refl6a:    { latDD: NaN, lonDD: NaN, present: false }, // (6a)
  refl6b:    { latDD: NaN, lonDD: NaN, present: false }, // (6b)
};

// ---------- GS/TCH -> DTHR ----------
function updateGlideTch() {
  const outEl = $("gsOut");
  const gsEl = $("gsDeg");
  const tchEl = $("tchFt");
  if (!outEl || !gsEl || !tchEl) return;

  const gsRaw = gsEl.value.trim();
  const tchRaw = tchEl.value.trim();

  if (!gsRaw || !tchRaw) {
    outEl.textContent = "Enter GS, TCH, and MV for outputs.";
    state.dthrFt = NaN;
    setOut("out_DTHR", "—");
    setOut("out_DH", "—");
    return;
  }

  const gs = Number(gsRaw);
  setOut("out_DH", Number.isFinite(gs) ? (3038 * Math.tan(gs * Math.PI / 180)).toFixed(3) : "—");

  const tch = Number(tchRaw);

  if (!Number.isFinite(gs) || !Number.isFinite(tch)) {
    outEl.textContent = "GS and TCH must be numbers";
    state.dthrFt = NaN;
    setOut("out_DTHR", "—");
    return;
  }
  if (gs <= 0 || gs >= 89) {
    outEl.textContent = "GS must be between 0 and 89 degrees";
    state.dthrFt = NaN;
    setOut("out_DTHR", "—");
    return;
  }
  if (tch <= 0) {
    outEl.textContent = "TCH must be > 0";
    state.dthrFt = NaN;
    setOut("out_DTHR", "—");
    return;
  }

  const distFt = tch / Math.tan(gs * Math.PI / 180);
  state.dthrFt = distFt;

  outEl.textContent = `Distance = ${distFt.toFixed(3)} ft`;
  setOut("out_DTHR", `${distFt.toFixed(3)} ft`);
}

// ---------- Heading (Threshold -> Departure End) ----------
function updateRunwayHeading() {
  const out = $("rwyHeadingOut");
  if (!out) return;

  const tLat = dmsToDecimal(readNumber("latDeg"), readNumber("latMin"), readNumber("latSec"), readText("latHem"), true);
  const tLon = dmsToDecimal(readNumber("lonDeg"), readNumber("lonMin"), readNumber("lonSec"), readText("lonHem"), false);

  const dLat = dmsToDecimal(readNumber("depLatDeg"), readNumber("depLatMin"), readNumber("depLatSec"), readText("depLatHem"), true);
  const dLon = dmsToDecimal(readNumber("depLonDeg"), readNumber("depLonMin"), readNumber("depLonSec"), readText("depLonHem"), false);

  const typedLatDMS = formatTypedDMS(readNumber("latDeg"), readNumber("latMin"), readNumber("latSec"), readText("latHem"), true);
  const typedLonDMS = formatTypedDMS(readNumber("lonDeg"), readNumber("lonMin"), readNumber("lonSec"), readText("lonHem"), false);

  state.threshold.latDD = tLat;
  state.threshold.lonDD = tLon;
  state.threshold.latDMS = typedLatDMS;
  state.threshold.lonDMS = typedLonDMS;

  setOut("ptThreshold", formatPoint(typedLatDMS, typedLonDMS));

  const depLatDMS = formatTypedDMS(readNumber("depLatDeg"), readNumber("depLatMin"), readNumber("depLatSec"), readText("depLatHem"), true);
  const depLonDMS = formatTypedDMS(readNumber("depLonDeg"), readNumber("depLonMin"), readNumber("depLonSec"), readText("depLonHem"), false);

  state.depEnd.latDD = dLat;
  state.depEnd.lonDD = dLon;
  state.depEnd.latDMS = depLatDMS;
  state.depEnd.lonDMS = depLonDMS;

  if (![tLat, tLon, dLat, dLon].every(Number.isFinite)) {
    out.textContent = "Enter Threshold + Departure End DMS to get heading.";
    state.headingDeg = NaN;
    setOut("out_HeadingTrue", "—");
    setOut("out_HeadingMag", "—");
    return;
  }

  state.headingDeg = bearingDegrees(tLat, tLon, dLat, dLon);
  out.textContent = `Heading (true): ${state.headingDeg.toFixed(3)}°`;
  setOut("out_HeadingTrue", `${state.headingDeg.toFixed(3)}°`);

  const headingMag = trueToMag(state.headingDeg, state.mvSignedDeg);
  setOut("out_HeadingMag", Number.isFinite(headingMag) ? fmtDeg(headingMag) : "—");
}

// ---------- Compute points + distances (compute-as-far-as-possible) ----------
function updatePoints() {
  // Clear documented points
  setOut("ptRPI", "—");
  setOut("ptCL", "—");
  setOut("ptRadar", "—");
  setOut("out_SLAT", "—");
  setOut("out_SLON", "—");

  // Clear LAT/LON Points list
  setOut("pt7_DispThr", "—");
  setOut("pt1_Threshold", "—");
  setOut("pt2_RPI", "—");
  setOut("pt3_CLClosest", "—");
  setOut("pt4_DepEnd", "—");
  setOut("pt5_PAR", "—");
  setOut("pt5_Side", "—");
  setOut("pt6a_ReflR", "—");
  setOut("pt6b_ReflL", "—");

  // Clear distance boxes
  setOut("dist_7_1", "—");
  setOut("dist_1_2", "—");
  setOut("dist_2_3", "—");
  setOut("dist_1_4", "—");
  setOut("dist_3_5ab", "—");
  setOut("dist_5ab_2", "—");
  setOut("dist_1_6a", "—");
  setOut("dist_1_6b", "—");
  setOut("dist_2_7", "—");

  // Reset computed flags
  state.dispThr.present = false;
  state.refl6a.present = false;
  state.refl6b.present = false;
  state.radar.side = "";

  // Require threshold + heading
  const haveThreshold = Number.isFinite(state.threshold.latDD) && Number.isFinite(state.threshold.lonDD);
  const haveHeading = Number.isFinite(state.headingDeg);
  if (!haveThreshold || !haveHeading) return;

  // (1)
  setOut("pt1_Threshold", formatPoint(state.threshold.latDMS, state.threshold.lonDMS));

  // (4) + (1→4)
  if (Number.isFinite(state.depEnd.latDD) && Number.isFinite(state.depEnd.lonDD)) {
    setOut("pt4_DepEnd", formatPoint(state.depEnd.latDMS, state.depEnd.lonDMS));

    const d14 = distanceFtBetween(
      state.threshold.latDD, state.threshold.lonDD,
      state.depEnd.latDD, state.depEnd.lonDD
    );
    setOut("dist_1_4", fmtFt(d14));
  }

  // (7) + (7→1)
  const dispFt = readNumber("dispThreshFt");
  let dtPoint = null;
  if (Number.isFinite(dispFt) && dispFt > 0) {
    dtPoint = destinationPoint(state.threshold.latDD, state.threshold.lonDD, state.headingDeg, dispFt);

    state.dispThr.present = true;
    state.dispThr.latDD = dtPoint.latDeg;
    state.dispThr.lonDD = dtPoint.lonDeg;

    setOut("pt7_DispThr", formatPoint(ddToDmsString(dtPoint.latDeg, true), ddToDmsString(dtPoint.lonDeg, false)));
    setOut("dist_7_1", fmtFt(dispFt));
  }

  // (2) RPI requires DTHR
  if (!Number.isFinite(state.dthrFt)) return;

  const rpi = destinationPoint(state.threshold.latDD, state.threshold.lonDD, state.headingDeg, state.dthrFt);
  state.rpi.latDD = rpi.latDeg;
  state.rpi.lonDD = rpi.lonDeg;

  const rpiLatDMS = ddToDmsString(rpi.latDeg, true);
  const rpiLonDMS = ddToDmsString(rpi.lonDeg, false);

  setOut("ptRPI", formatPoint(rpiLatDMS, rpiLonDMS));
  setOut("pt2_RPI", formatPoint(rpiLatDMS, rpiLonDMS));
  setOut("dist_1_2", fmtFt(state.dthrFt));

  // (2→7)
  if (dtPoint) {
    const d27 = distanceFtBetween(rpi.latDeg, rpi.lonDeg, dtPoint.latDeg, dtPoint.lonDeg);
    setOut("dist_2_7", fmtFt(d27));
  }

  // (6a/6b) reflectors at RPI station (perpendicular to centerline)
  const reflRightFt = readNumber("reflRightFt");
  const reflLeftFt  = readNumber("reflLeftFt");

  if (Number.isFinite(reflRightFt) && reflRightFt > 0) {
    const brgRight = (state.headingDeg + 90) % 360;
    const p6a = destinationPoint(rpi.latDeg, rpi.lonDeg, brgRight, reflRightFt);

    state.refl6a.present = true;
    state.refl6a.latDD = p6a.latDeg;
    state.refl6a.lonDD = p6a.lonDeg;

    setOut("pt6a_ReflR", formatPoint(ddToDmsString(p6a.latDeg, true), ddToDmsString(p6a.lonDeg, false)));

    const d16a = distanceFtBetween(state.threshold.latDD, state.threshold.lonDD, p6a.latDeg, p6a.lonDeg);
    setOut("dist_1_6a", fmtFt(d16a));
  }

  if (Number.isFinite(reflLeftFt) && reflLeftFt > 0) {
    const brgLeft = (state.headingDeg + 270) % 360;
    const p6b = destinationPoint(rpi.latDeg, rpi.lonDeg, brgLeft, reflLeftFt);

    state.refl6b.present = true;
    state.refl6b.latDD = p6b.latDeg;
    state.refl6b.lonDD = p6b.lonDeg;

    setOut("pt6b_ReflL", formatPoint(ddToDmsString(p6b.latDeg, true), ddToDmsString(p6b.lonDeg, false)));

    const d16b = distanceFtBetween(state.threshold.latDD, state.threshold.lonDD, p6b.latDeg, p6b.lonDeg);
    setOut("dist_1_6b", fmtFt(d16b));
  }

  // (3) CL
  const centerlineDistFt = readNumber("centerlineDistFt");
  const haveCL = Number.isFinite(centerlineDistFt) && centerlineDistFt >= 0;
  if (!haveCL) return;

  const cl = destinationPoint(rpi.latDeg, rpi.lonDeg, state.headingDeg, centerlineDistFt);
  state.cl.latDD = cl.latDeg;
  state.cl.lonDD = cl.lonDeg;

  setOut("ptCL", formatPoint(ddToDmsString(cl.latDeg, true), ddToDmsString(cl.lonDeg, false)));
  setOut("pt3_CLClosest", formatPoint(ddToDmsString(cl.latDeg, true), ddToDmsString(cl.lonDeg, false)));
  setOut("dist_2_3", fmtFt(centerlineDistFt));

  // (5) PAR / Radar
  const drcl = readNumber("radarOffsetFt");
  const side = readText("radarSide").toUpperCase();
  const haveRadar = Number.isFinite(drcl) && drcl >= 0 && (side === "LEFT" || side === "RIGHT");
  if (!haveRadar) return;

  state.radar.side = side;

  const offsetBearing = (side === "RIGHT") ? (state.headingDeg + 90) : (state.headingDeg + 270);
  const radar = destinationPoint(cl.latDeg, cl.lonDeg, offsetBearing, drcl);

  state.radar.latDD = radar.latDeg;
  state.radar.lonDD = radar.lonDeg;

  const radarLatDMS = ddToDmsString(radar.latDeg, true);
  const radarLonDMS = ddToDmsString(radar.lonDeg, false);

  setOut("ptRadar", formatPoint(radarLatDMS, radarLonDMS));
  setOut("out_SLAT", radarLatDMS);
  setOut("out_SLON", radarLonDMS);

  setOut("pt5_PAR", formatPoint(radarLatDMS, radarLonDMS));
  setOut("pt5_Side", side);

  setOut("dist_3_5ab", fmtFt(distanceFtBetween(cl.latDeg, cl.lonDeg, radar.latDeg, radar.lonDeg)));
  setOut("dist_5ab_2", fmtFt(distanceFtBetween(radar.latDeg, radar.lonDeg, rpi.latDeg, rpi.lonDeg)));
}

// ---------- Compute geometry outputs ----------
function updateGeometryOutputs() {
  setOut("out_AZRC", "—");
  setOut("out_AZRP", "—");
  setOut("out_AZP", "—");
  setOut("out_DRCL", "—");
  setOut("out_DTD", "—");
  setOut("out_DTH", "—");
  setOut("out_AZO", "—");
  setOut("out_AZB", "—");

  const drcl = readNumber("radarOffsetFt");
  if (Number.isFinite(drcl) && drcl >= 0) setOut("out_DRCL", `${drcl.toFixed(3)} ft`);

  if (!Number.isFinite(state.rpi.latDD) || !Number.isFinite(state.rpi.lonDD)) return;
  if (!Number.isFinite(state.radar.latDD) || !Number.isFinite(state.radar.lonDD)) return;
  if (!Number.isFinite(state.headingDeg)) return;
  if (!Number.isFinite(state.dthrFt)) return;
  if (!Number.isFinite(drcl) || drcl < 0) return;

  const brgRpiToRadar = bearingDegrees(state.rpi.latDD, state.rpi.lonDD, state.radar.latDD, state.radar.lonDD);
  const deltaSigned = ((brgRpiToRadar - state.headingDeg + 540) % 360) - 180;
  const azrc = Math.abs(deltaSigned);
  setOut("out_AZRC", `${azrc.toFixed(3)}°`);

  setOut("out_AZRP", `0.000°`);

  const side = readText("radarSide").toUpperCase();
  const azp = (side === "LEFT") ? (azrc - 90) : (90 - azrc);
  setOut("out_AZP", `${azp.toFixed(3)}°`);

  const tanVal = Math.tan(azrc * Math.PI / 180);
  if (Math.abs(tanVal) < 1e-12) {
    setOut("out_DTD", "∞ (tan(AZRC)=0)");
    setOut("out_DTH", "—");
  } else {
    const dtd = drcl / tanVal;
    const dth = state.dthrFt + dtd;
    setOut("out_DTD", `${dtd.toFixed(3)} ft`);
    setOut("out_DTH", `${dth.toFixed(3)} ft`);
  }

  const azo = Math.max(0, azrc - 8.0);
  setOut("out_AZO", `${azo.toFixed(3)}°`);

  const azb = (side === "LEFT") ? (azrc - azo) : (-azrc + azo);
  setOut("out_AZB", `${azb.toFixed(3)}°`);
}

// ---------- KML ----------
function makePlacemark(name, desc, lat, lon, alt = 0) {
  const coords = `${lon.toFixed(8)},${lat.toFixed(8)},${alt}`;
  return `
    <Placemark>
      <name>${escapeXml(name)}</name>
      <description><![CDATA[${desc}]]></description>
      <Point><coordinates>${coords}</coordinates></Point>
    </Placemark>`;
}

const FT_PER_NM = 6076.11549;

function makeLineString(name, desc, coordsLonLatAlt) {
  const coordText = coordsLonLatAlt
    .map(c => `${c.lon.toFixed(8)},${c.lat.toFixed(8)},${c.alt ?? 0}`)
    .join(" ");
  return `
    <Placemark>
      <name>${escapeXml(name)}</name>
      <description><![CDATA[${desc}]]></description>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordText}</coordinates>
      </LineString>
    </Placemark>`;
}

function buildCircleCoords(centerLat, centerLon, radiusFt, segments = 96) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const brg = (i / segments) * 360;
    const p = destinationPoint(centerLat, centerLon, brg, radiusFt);
    pts.push({ lat: p.latDeg, lon: p.lonDeg, alt: 0 });
  }
  return pts;
}

// ---------- MVA Chart KML ----------
function buildMvaChartKmlFromParSite() {
  if (!Number.isFinite(state.radar.latDD) || !Number.isFinite(state.radar.lonDD)) {
    return { kml: "", reason: "PAR site not computed yet. Enter inputs to compute the PAR site first." };
  }

  const cLat = state.radar.latDD;
  const cLon = state.radar.lonDD;

  const radiiNm = [5, 10, 15, 20, 25];

  const rings = radiiNm.map(nm => {
    const rFt = nm * FT_PER_NM;
    const coords = buildCircleCoords(cLat, cLon, rFt, 120);
    return makeLineString(
      `MVA Ring ${nm} NM`,
      `Center: PAR Site (5)\nRadius: ${nm} NM`,
      coords
    );
  }).join("\n");

  const r25Ft = 25 * FT_PER_NM;

  const north = destinationPoint(cLat, cLon, 0, r25Ft);
  const south = destinationPoint(cLat, cLon, 180, r25Ft);
  const east  = destinationPoint(cLat, cLon, 90, r25Ft);
  const west  = destinationPoint(cLat, cLon, 270, r25Ft);

  const nsLine = makeLineString(
    "MVA Line North-South (25 NM)",
    "Line from 25 NM North → center → 25 NM South",
    [
      { lat: north.latDeg, lon: north.lonDeg, alt: 0 },
      { lat: cLat, lon: cLon, alt: 0 },
      { lat: south.latDeg, lon: south.lonDeg, alt: 0 },
    ]
  );

  const ewLine = makeLineString(
    "MVA Line West-East (25 NM)",
    "Line from 25 NM West → center → 25 NM East",
    [
      { lat: west.latDeg, lon: west.lonDeg, alt: 0 },
      { lat: cLat, lon: cLon, alt: 0 },
      { lat: east.latDeg, lon: east.lonDeg, alt: 0 },
    ]
  );

  const centerPm = makePlacemark(
    "MVA Center (PAR Site 5)",
    "Center point for rings and crosshair lines.",
    cLat, cLon, 0
  );

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>MVA_Chart_PAR_Centered</name>
    <Folder>
      <name>MVA Chart</name>
      ${centerPm}
      ${rings}
      ${nsLine}
      ${ewLine}
    </Folder>
  </Document>
</kml>`;

  return { kml, reason: "" };
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "application/vnd.google-earth.kml+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function onGenerateMvaKml() {
  const status = $("mvaStatus");
  const result = buildMvaChartKmlFromParSite();

  if (!result.kml) {
    if (status) status.textContent = result.reason || "Unable to generate MVA KML.";
    return;
  }

  downloadTextFile("MVA_chart_PAR_centered.kml", result.kml);
  if (status) status.textContent = "MVA Chart KML generated (5–25 NM rings + N/S and E/W lines).";
}

// ---------- All points KML ----------
function buildKmlAllPoints() {
  const pts = [];

  if (state.dispThr.present && Number.isFinite(state.dispThr.latDD) && Number.isFinite(state.dispThr.lonDD)) {
    pts.push({
      name: "(7) Displaced Threshold",
      desc: `Displaced Threshold on centerline.\nHeading True: ${fmtDeg(state.headingDeg)}`,
      lat: state.dispThr.latDD,
      lon: state.dispThr.lonDD
    });
  }

  if (Number.isFinite(state.threshold.latDD) && Number.isFinite(state.threshold.lonDD)) {
    pts.push({
      name: "(1) Threshold",
      desc: `Landing Threshold on centerline.\nHeading True: ${fmtDeg(state.headingDeg)}`,
      lat: state.threshold.latDD,
      lon: state.threshold.lonDD
    });
  }

  if (Number.isFinite(state.rpi.latDD) && Number.isFinite(state.rpi.lonDD)) {
    pts.push({
      name: "(2) RPI",
      desc: `Runway Point of Intercept (centerline).\nDTHR: ${fmtFt(state.dthrFt)}`,
      lat: state.rpi.latDD,
      lon: state.rpi.lonDD
    });
  }

  if (Number.isFinite(state.cl.latDD) && Number.isFinite(state.cl.lonDD)) {
    pts.push({
      name: "(3) CL closest to PAR",
      desc: `Centerline point closest to PAR.\n`,
      lat: state.cl.latDD,
      lon: state.cl.lonDD
    });
  }

  if (Number.isFinite(state.depEnd.latDD) && Number.isFinite(state.depEnd.lonDD)) {
    pts.push({
      name: "(4) Departure End",
      desc: `Departure End of runway on centerline.\n`,
      lat: state.depEnd.latDD,
      lon: state.depEnd.lonDD
    });
  }

  if (Number.isFinite(state.radar.latDD) && Number.isFinite(state.radar.lonDD)) {
    pts.push({
      name: "(5) PAR Site",
      desc: `PAR Antenna site.\nSide: ${escapeXml(state.radar.side || "—")}`,
      lat: state.radar.latDD,
      lon: state.radar.lonDD
    });
  }

  if (state.refl6a.present && Number.isFinite(state.refl6a.latDD) && Number.isFinite(state.refl6a.lonDD)) {
    pts.push({
      name: "(6a) Reflector Right",
      desc: `Reflector RIGHT of runway centerline at RPI station.`,
      lat: state.refl6a.latDD,
      lon: state.refl6a.lonDD
    });
  }

  if (state.refl6b.present && Number.isFinite(state.refl6b.latDD) && Number.isFinite(state.refl6b.lonDD)) {
    pts.push({
      name: "(6b) Reflector Left",
      desc: `Reflector LEFT of runway centerline at RPI station.`,
      lat: state.refl6b.latDD,
      lon: state.refl6b.lonDD
    });
  }

  if (pts.length === 0) return { kml: "", count: 0 };

  const placemarks = pts.map(p => makePlacemark(p.name, p.desc, p.lat, p.lon)).join("\n");

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>PAR_GCA_Proof_Layout</name>
    <Folder>
      <name>PAR/GCA Proof Layout</name>
      ${placemarks}
    </Folder>
  </Document>
</kml>`;

  return { kml, count: pts.length };
}

function onGenerateKml() {
  const status = $("kmlStatus");
  const { kml, count } = buildKmlAllPoints();

  if (!kml || count === 0) {
    if (status) status.textContent = "No points available to export yet.";
    return;
  }

  downloadTextFile("PAR_GCA_points.kml", kml);
  if (status) status.textContent = `KML generated: ${count} point(s) exported.`;
}

// ---------- Reflector Table (UI only) ----------
const REFLECTOR_TABLE = [
  { min: 1720, max: 1800, dr: 135 },
  { min: 1801, max: 1950, dr: 145 },
  { min: 1951, max: 2050, dr: 150 },
  { min: 2051, max: 2200, dr: 160 },
  { min: 2201, max: 2350, dr: 170 },
  { min: 2351, max: 2500, dr: 180 },
  { min: 2501, max: 2600, dr: 185 },
  { min: 2601, max: 2750, dr: 195 },
  { min: 2751, max: 2900, dr: 205 },
  { min: 2901, max: 3050, dr: 215 },
  { min: 3051, max: 3200, dr: 225 },
  { min: 3201, max: 3300, dr: 230 },
  { min: 3301, max: 3450, dr: 240 },
  { min: 3451, max: 3600, dr: 250 },
  { min: 3601, max: 3750, dr: 260 },
  { min: 3751, max: 3900, dr: 270 },
  { min: 3901, max: 4050, dr: 280 },
  { min: 4051, max: 4200, dr: 290 },
  { min: 4201, max: 4350, dr: 300 },
  { min: 4351, max: 4500, dr: 310 },
  { min: 4501, max: 4650, dr: 320 },
  { min: 4651, max: 4800, dr: 330 },
  { min: 4801, max: 4950, dr: 340 },
  { min: 4951, max: 5100, dr: 350 },
  { min: 5101, max: 5250, dr: 360 },
  { min: 5251, max: 5400, dr: 370 },
  { min: 5401, max: 5550, dr: 380 },
  { min: 5551, max: 5700, dr: 390 },
  { min: 5701, max: 5850, dr: 400 },
  { min: 5851, max: 6000, dr: 410 },
  { min: 6001, max: 6150, dr: 420 },
  { min: 6151, max: 6300, dr: 430 },
  { min: 6301, max: 6450, dr: 440 },
  { min: 6451, max: 6600, dr: 450 },
  { min: 6601, max: 6750, dr: 460 },
  { min: 6751, max: 6900, dr: 470 },
  { min: 6901, max: 7050, dr: 480 },
  { min: 7051, max: 7200, dr: 490 },
  { min: 7201, max: 7350, dr: 500 },
  { min: 7351, max: 7500, dr: 510 },
  { min: 7501, max: 7650, dr: 520 },
  { min: 7651, max: 7800, dr: 530 },
  { min: 7801, max: 7950, dr: 540 },
  { min: 7951, max: 8100, dr: 550 },
  { min: 8101, max: 8250, dr: 560 },
  { min: 8251, max: 8400, dr: 570 },
  { min: 8401, max: 8550, dr: 580 },
  { min: 8551, max: 8700, dr: 590 },
  { min: 8701, max: 8850, dr: 600 },
  { min: 8851, max: 9000, dr: 610 },
];

function findReflectorDr(approachLengthFt) {
  if (!Number.isFinite(approachLengthFt)) return null;
  for (const row of REFLECTOR_TABLE) {
    if (approachLengthFt >= row.min && approachLengthFt <= row.max) return row.dr;
  }
  return null;
}

function updateReflectorSuggestion() {
  const out = $("reflSuggestOut");
  if (!out) return;

  let approachLength = NaN;
  const dthText = $("out_DTH")?.textContent || "";
  const m = dthText.match(/-?\d+(\.\d+)?/);
  if (m) approachLength = Number(m[0]);

  if (!Number.isFinite(approachLength)) {
    approachLength = state.dthrFt;
  }

  const dr = findReflectorDr(approachLength);
  if (dr == null) out.textContent = "No reflector suggestion (approach length out of table range).";
  else out.textContent = `Reflector DR suggestion: ${dr} ft (based on approach length).`;
}

// ---------- Reflector Modal ----------
function openReflectorModal() {
  const modal = $("reflectorModal");
  if (modal) modal.style.display = "flex";
}
function closeReflectorModal() {
  const modal = $("reflectorModal");
  if (modal) modal.style.display = "none";
}

// ---------- ACOR/HABE/ELRP/HPA/ELP/PAA/PBA helpers inside updateAll ----------
function updateAll() {
  // MV display (shows what user entered)
  const mvAbs = readNumber("mvDeg");
  const mvDir = (readText("mvDir") || "E").toUpperCase();
  const mvText = Number.isFinite(mvAbs) ? `${mvAbs.toFixed(1)}° ${mvDir}` : "—";
  setOut("out_MV", mvText);
  state.mvSignedDeg = getSignedMV();

  updateGlideTch();
  updateRunwayHeading();
  updatePoints();
  updateGeometryOutputs();
  updateRTD();

  setOut("out_SD", "0");
  setOut("out_SA", "0.5");

  // ---------- ACOR (user-entered, not geometry-derived) ----------
  const aD = Number(document.getElementById("acorD")?.value || 0);
  const aM = Number(document.getElementById("acorM")?.value || 0);
  const aS = Number(document.getElementById("acorS")?.value || 0);
  const aDir = (document.getElementById("acorDir")?.value || "CW").toUpperCase();

  const acorAbs = Math.abs(aD) + (Math.abs(aM) / 60) + (Math.abs(aS) / 3600);
  const acorSigned = (aDir === "CCW") ? -acorAbs : acorAbs;
  const acorEntered = (aD !== 0 || aM !== 0 || aS !== 0);

  setOut("out_ACOR", (acorEntered && Math.abs(acorSigned) <= 1) ? acorSigned.toFixed(1) : "—");
// ---------- ELP (DD MM SS + UP/DOWN -> signed decimal degrees) ----------
const eD = Number(document.getElementById("elpD")?.value || 0);
const eM = Number(document.getElementById("elpM")?.value || 0);
const eS = Number(document.getElementById("elpS")?.value || 0);
const eDir = document.getElementById("elpDir")?.value || "UP";

const elpEntered = (eD !== 0 || eM !== 0 || eS !== 0);

const elpAbs =
  Math.abs(eD) +
  (Math.abs(eM) / 60) +
  (Math.abs(eS) / 3600);

const elpSigned = eDir === "DOWN" ? -elpAbs : elpAbs;
const elpDeg = elpSigned;

setOut("out_ELP", elpEntered ? elpDeg.toFixed(4) : "—");
  // ---------- PAA = 10(ACOR ± AZO) ----------
  const acorTxtPaa = document.getElementById("out_ACOR")?.textContent || "";
  const azoTxtPaa  = document.getElementById("out_AZO")?.textContent  || "";

  const acorDeg = parseFloat(acorTxtPaa.replace(/[^0-9.-]/g, ""));
  const azoDeg  = parseFloat(azoTxtPaa.replace(/[^0-9.-]/g, ""));

  const side = document.getElementById("radarSide")?.value || ""; // "LEFT" or "RIGHT"
  const sign = (side === "RIGHT") ? 1 : (side === "LEFT") ? -1 : NaN;

  const paaVal =
    (Number.isFinite(acorDeg) && Number.isFinite(azoDeg) && Number.isFinite(sign))
      ? 10 * (acorDeg + (sign * azoDeg))
      : NaN;

  setOut("out_PAA", Number.isFinite(paaVal) ? paaVal.toFixed(1) : "—");

  // ---------- PBA = 100[(RHDG - MV - 180) + (PAA / 10)] ----------
  const rhdgTxt = document.getElementById("out_HeadingTrue")?.textContent || "";
  const rhdgDeg = parseFloat(rhdgTxt.replace(/[^0-9.-]/g, ""));

  const mvDeg = state.mvSignedDeg;

  const paaTxt = document.getElementById("out_PAA")?.textContent || "";
  const paaDeg = parseFloat(paaTxt.replace(/[^0-9.-]/g, ""));

  const pbaVal =
    (Number.isFinite(rhdgDeg) && Number.isFinite(mvDeg) && Number.isFinite(paaDeg))
      ? (() => {
          const pbaDeg = wrap360((rhdgDeg - mvDeg - 180) + (paaDeg / 10));
          return 100 * pbaDeg;
        })()
      : NaN;

  setOut("out_PBA", Number.isFinite(pbaVal) ? pbaVal.toFixed(2) : "—");

  // reflector suggestion (safe; UI only)
  updateReflectorSuggestion();
}

// ---------- Approach Fan KML ----------
function buildArcCoords(centerLat, centerLon, radiusFt, startBrgDeg, endBrgDeg, segments = 90) {
  const pts = [];
  let s = wrap360(startBrgDeg);
  let e = wrap360(endBrgDeg);

  // sweep from s -> e across the fan
  if (e < s) e += 360;

  for (let i = 0; i <= segments; i++) {
    const brg = s + (i / segments) * (e - s);
    const p = destinationPoint(centerLat, centerLon, brg, radiusFt);
    pts.push({ lat: p.latDeg, lon: p.lonDeg, alt: 0 });
  }
  return pts;
}

function buildApproachCourseKml() {
  if (!Number.isFinite(state.threshold.latDD) || !Number.isFinite(state.threshold.lonDD)) {
    return { kml: "", reason: "Threshold not computed yet. Enter Threshold + Departure End to compute heading." };
  }
  if (!Number.isFinite(state.headingDeg)) {
    return { kml: "", reason: "Runway heading not computed yet. Enter Departure End DMS to compute heading." };
  }

// Start the fan at RPI (2), not Threshold (1)
if (!Number.isFinite(state.rpi.latDD) || !Number.isFinite(state.rpi.lonDD)) {
  return { kml: "", reason: "RPI not computed yet. Enter GS + TCH so DTHR computes, then recompute." };
}

const tdLat = state.rpi.latDD;
const tdLon = state.rpi.lonDD;


 // Approach course is the reciprocal of runway heading (threshold -> dep end)
const course = wrap360(state.headingDeg + 180);
  const maxNm = 10;
  const maxFt = maxNm * FT_PER_NM;

  const offsets = [15, 30, 45];

  // 3 sections to 10 NM
  const ringNm = [maxNm / 3, (2 * maxNm) / 3, maxNm];
  const ringFt = ringNm.map(nm => nm * FT_PER_NM);

  const placemarks = [];

  placemarks.push(
    makePlacemark(
      "Touchdown / Threshold (1)",
      `Threshold point used as touchdown.\nCourse (TRUE): ${course.toFixed(3)}°`,
      tdLat, tdLon, 0
    )
  );

  // Centerline TD -> 10 NM
  const pEnd = destinationPoint(tdLat, tdLon, course, maxFt);
  placemarks.push(
    makeLineString(
      "Approach Course Centerline (TD -> 10 NM)",
      `Touchdown (1) -> 10 NM\nCourse (TRUE): ${course.toFixed(3)}°`,
      [
        { lat: tdLat, lon: tdLon, alt: 0 },
        { lat: pEnd.latDeg, lon: pEnd.lonDeg, alt: 0 }
      ]
    )
  );

  // Fan rays (±15/±30/±45) out to 10 NM
  for (const off of offsets) {
    const brgL = wrap360(course - off);
    const brgR = wrap360(course + off);

    const pL = destinationPoint(tdLat, tdLon, brgL, maxFt);
    const pR = destinationPoint(tdLat, tdLon, brgR, maxFt);

    placemarks.push(
      makeLineString(
        `Fan Ray LEFT ${off}°`,
        `Course: ${course.toFixed(3)}° TRUE\nBearing: ${brgL.toFixed(3)}°`,
        [
          { lat: tdLat, lon: tdLon, alt: 0 },
          { lat: pL.latDeg, lon: pL.lonDeg, alt: 0 }
        ]
      )
    );

    placemarks.push(
      makeLineString(
        `Fan Ray RIGHT ${off}°`,
        `Course: ${course.toFixed(3)}° TRUE\nBearing: ${brgR.toFixed(3)}°`,
        [
          { lat: tdLat, lon: tdLon, alt: 0 },
          { lat: pR.latDeg, lon: pR.lonDeg, alt: 0 }
        ]
      )
    );
  }

  // Range arcs spanning left 45° to right 45°
  const leftEdge = wrap360(course - 45);
  const rightEdge = wrap360(course + 45);

  for (let i = 0; i < ringFt.length; i++) {
    const arcPts = buildArcCoords(tdLat, tdLon, ringFt[i], leftEdge, rightEdge, 120);
    placemarks.push(
      makeLineString(
        `Range Arc ${ringNm[i].toFixed(2)} NM`,
        `Arc at ${ringNm[i].toFixed(2)} NM from TD\nSpan: ${leftEdge.toFixed(3)}° → ${rightEdge.toFixed(3)}°`,
        arcPts
      )
    );
  }

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Approach_Fan_10NM</name>
    <Folder>
      <name>Approach Fan</name>
      ${placemarks.join("\n")}
    </Folder>
  </Document>
</kml>`;

  return { kml, reason: "" };
}

function onGenerateApproachFanKml() {
  const status = $("kmlStatus");
  const result = buildApproachCourseKml();

  if (!result.kml) {
    if (status) status.textContent = result.reason || "Unable to generate Approach Fan KML.";
    return;
  }

  downloadTextFile("Approach_Fan_10NM.kml", result.kml);
  if (status) status.textContent = "Approach Fan KML generated (TD -> 10 NM + fan rays + 3 arcs).";
}
// ---------- Disclaimer modal ----------
function initDisclaimer() {
  const overlay = $("disclaimerOverlay");
  const btn = $("acceptDisclaimerBtn");
  if (!overlay || !btn) return;

  const key = "da3501_disclaimer_ack_v1";

  if (localStorage.getItem(key) === "true") {
    overlay.style.display = "none";
    return;
  }

  overlay.style.display = "flex";

  btn.addEventListener("click", () => {
    localStorage.setItem(key, "true");
    overlay.style.display = "none";
  });
}

// ---------- Event wiring ----------
window.addEventListener("DOMContentLoaded", () => {
  // GS/TCH
  ["gsDeg", "tchFt"].forEach(id => $(id)?.addEventListener("input", updateAll));

  // ACOR
  ["acorD", "acorM", "acorS"].forEach(id => $(id)?.addEventListener("input", updateAll));
  $("acorDir")?.addEventListener("change", updateAll);

// ELP
["elpD", "elpM", "elpS"].forEach(id => $(id)?.addEventListener("input", updateAll));
$("elpDir")?.addEventListener("change", updateAll);
  // MV
  ["mvDeg"].forEach(id => $(id)?.addEventListener("input", updateAll));
  ["mvDir"].forEach(id => {
    $(id)?.addEventListener("input", updateAll);
    $(id)?.addEventListener("change", updateAll);
  });

  // Threshold / Dep End DMS
  [
    "latDeg","latMin","latSec","latHem",
    "lonDeg","lonMin","lonSec","lonHem",
    "depLatDeg","depLatMin","depLatSec","depLatHem",
    "depLonDeg","depLonMin","depLonSec","depLonHem",
  ].forEach(id => $(id)?.addEventListener("input", updateAll));

  // Distances + options
  [
    "dispThreshFt",
    "centerlineDistFt",
    "radarOffsetFt",
    "radarSide",
    "reflRightFt",
    "reflLeftFt",
  ].forEach(id => {
    $(id)?.addEventListener("input", updateAll);
    $(id)?.addEventListener("change", updateAll);
  });

  // Buttons
  $("btnKml")?.addEventListener("click", onGenerateKml);
  $("btnApproachKml")?.addEventListener("click", onGenerateApproachFanKml);
  $("btnMvaKml")?.addEventListener("click", onGenerateMvaKml);

  // Reflector modal (NOTE: match your HTML IDs)
  $("btnReflectorTable")?.addEventListener("click", openReflectorModal);
  $("btnCloseReflModal")?.addEventListener("click", closeReflectorModal);

  $("reflModalOverlay")?.addEventListener("click", (e) => {
    if (e.target?.id === "reflModalOverlay") closeReflectorModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeReflectorModal();
  });

  // Initial compute + disclaimer
  initDisclaimer();
  updateAll();
});