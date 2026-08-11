const calculateBtn = document.getElementById("calculateBtn");

calculateBtn.addEventListener("click", () => {
  // ----- READ END A -----
  const latA = dmsToDecimal(
    document.getElementById("latADeg").value,
    document.getElementById("latAMin").value,
    document.getElementById("latASec").value,
    document.getElementById("latADir").value
  );

  const lonA = dmsToDecimal(
    document.getElementById("lonADeg").value,
    document.getElementById("lonAMin").value,
    document.getElementById("lonASec").value,
    document.getElementById("lonADir").value
  );

  // ----- READ END B -----
  const latB = dmsToDecimal(
    document.getElementById("latBDeg").value,
    document.getElementById("latBMin").value,
    document.getElementById("latBSec").value,
    document.getElementById("latBDir").value
  );

  const lonB = dmsToDecimal(
    document.getElementById("lonBDeg").value,
    document.getElementById("lonBMin").value,
    document.getElementById("lonBSec").value,
    document.getElementById("lonBDir").value
  );

  // ----- VALIDATION -----
  if (
    latA === null ||
    lonA === null ||
    latB === null ||
    lonB === null
  ) {
    alert("Please enter complete and valid DMS coordinates for both ends.");
    return;
  }

  const geometry = calculateGeometry(latA, lonA, latB, lonB);

  document.getElementById("runwayLength").textContent =
    `${geometry.distanceFeet.toFixed(1)} ft`;

  document.getElementById("bearingAB").textContent =
    `${geometry.bearingAB.toFixed(2)}°`;

  document.getElementById("bearingBA").textContent =
    `${geometry.bearingBA.toFixed(2)}°`;

  const midpointLatDMS = decimalToDMS(geometry.midLat, true);
  const midpointLonDMS = decimalToDMS(geometry.midLon, false);

  document.getElementById("midpoint").textContent =
    `${midpointLatDMS}  ${midpointLonDMS}`;
});


function dmsToDecimal(degValue, minValue, secValue, direction) {
  const deg = parseFloat(degValue);
  const min = parseFloat(minValue);
  const sec = parseFloat(secValue);

  if (
    Number.isNaN(deg) ||
    Number.isNaN(min) ||
    Number.isNaN(sec)
  ) {
    return null;
  }

  if (min < 0 || min >= 60 || sec < 0 || sec >= 60) {
    return null;
  }

  let decimal = deg + (min / 60) + (sec / 3600);

  if (direction === "S" || direction === "W") {
    decimal = -decimal;
  }

  return decimal;
}


function decimalToDMS(decimal, isLatitude) {
  const absolute = Math.abs(decimal);

  const degrees = Math.floor(absolute);

  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);

  const seconds = (minutesDecimal - minutes) * 60;

  let direction;

  if (isLatitude) {
    direction = decimal >= 0 ? "N" : "S";
  } else {
    direction = decimal >= 0 ? "E" : "W";
  }

  const degreeText = isLatitude
    ? String(degrees).padStart(2, "0")
    : String(degrees).padStart(3, "0");

  const minuteText = String(minutes).padStart(2, "0");
  const secondText = seconds.toFixed(2).padStart(5, "0");

  return `${degreeText}° ${minuteText}' ${secondText}" ${direction}`;
}


function calculateGeometry(lat1, lon1, lat2, lon2) {
    const inverseAB = vincentyInverse(lat1, lon1, lat2, lon2);
    const inverseBA = vincentyInverse(lat2, lon2, lat1, lon1);
  
    const midpoint = vincentyDirect(
      lat1,
      lon1,
      inverseAB.initialBearing,
      inverseAB.distanceMeters / 2
    );
  
    return {
      distanceFeet: inverseAB.distanceMeters * 3.28084,
      bearingAB: inverseAB.initialBearing,
      bearingBA: inverseBA.initialBearing,
      midLat: midpoint.lat,
      midLon: midpoint.lon
    };
  }
  
  
  function vincentyInverse(lat1, lon1, lat2, lon2) {
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const b = (1 - f) * a;
  
    const phi1 = degToRad(lat1);
    const phi2 = degToRad(lat2);
  
    const L = degToRad(lon2 - lon1);
  
    const U1 = Math.atan((1 - f) * Math.tan(phi1));
    const U2 = Math.atan((1 - f) * Math.tan(phi2));
  
    const sinU1 = Math.sin(U1);
    const cosU1 = Math.cos(U1);
    const sinU2 = Math.sin(U2);
    const cosU2 = Math.cos(U2);
  
    let lambda = L;
    let lambdaPrevious;
  
    let sinSigma;
    let cosSigma;
    let sigma;
    let sinAlpha;
    let cosSqAlpha;
    let cos2SigmaM;
  
    let iterations = 0;
  
    do {
      const sinLambda = Math.sin(lambda);
      const cosLambda = Math.cos(lambda);
  
      sinSigma = Math.sqrt(
        (cosU2 * sinLambda) ** 2 +
        (
          cosU1 * sinU2 -
          sinU1 * cosU2 * cosLambda
        ) ** 2
      );
  
      if (sinSigma === 0) {
        return {
          distanceMeters: 0,
          initialBearing: 0
        };
      }
  
      cosSigma =
        sinU1 * sinU2 +
        cosU1 * cosU2 * cosLambda;
  
      sigma = Math.atan2(sinSigma, cosSigma);
  
      sinAlpha =
        (cosU1 * cosU2 * sinLambda) /
        sinSigma;
  
      cosSqAlpha = 1 - sinAlpha ** 2;
  
      if (cosSqAlpha !== 0) {
        cos2SigmaM =
          cosSigma -
          (2 * sinU1 * sinU2) / cosSqAlpha;
      } else {
        cos2SigmaM = 0;
      }
  
      const C =
        (f / 16) *
        cosSqAlpha *
        (
          4 +
          f *
          (
            4 -
            3 * cosSqAlpha
          )
        );
  
      lambdaPrevious = lambda;
  
      lambda =
        L +
        (1 - C) *
        f *
        sinAlpha *
        (
          sigma +
          C *
          sinSigma *
          (
            cos2SigmaM +
            C *
            cosSigma *
            (
              -1 +
              2 * cos2SigmaM ** 2
            )
          )
        );
  
      iterations++;
  
      if (iterations > 200) {
        throw new Error("Vincenty inverse calculation did not converge.");
      }
  
    } while (Math.abs(lambda - lambdaPrevious) > 1e-12);
  
    const uSq =
      cosSqAlpha *
      (a ** 2 - b ** 2) /
      (b ** 2);
  
    const A =
      1 +
      (uSq / 16384) *
      (
        4096 +
        uSq *
        (
          -768 +
          uSq *
          (
            320 -
            175 * uSq
          )
        )
      );
  
    const B =
      (uSq / 1024) *
      (
        256 +
        uSq *
        (
          -128 +
          uSq *
          (
            74 -
            47 * uSq
          )
        )
      );
  
    const deltaSigma =
      B *
      sinSigma *
      (
        cos2SigmaM +
        (B / 4) *
        (
          cosSigma *
          (
            -1 +
            2 * cos2SigmaM ** 2
          ) -
          (B / 6) *
          cos2SigmaM *
          (
            -3 +
            4 * sinSigma ** 2
          ) *
          (
            -3 +
            4 * cos2SigmaM ** 2
          )
        )
      );
  
    const distanceMeters =
      b * A * (sigma - deltaSigma);
  
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
  
    const initialBearing =
      (
        radToDeg(
          Math.atan2(
            cosU2 * sinLambda,
            cosU1 * sinU2 -
            sinU1 * cosU2 * cosLambda
          )
        ) +
        360
      ) % 360;
  
    return {
      distanceMeters,
      initialBearing
    };
  }
  
  
  function vincentyDirect(lat1, lon1, initialBearing, distanceMeters) {
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const b = (1 - f) * a;
  
    const alpha1 = degToRad(initialBearing);
    const phi1 = degToRad(lat1);
    const lambda1 = degToRad(lon1);
  
    const U1 = Math.atan((1 - f) * Math.tan(phi1));
  
    const sinU1 = Math.sin(U1);
    const cosU1 = Math.cos(U1);
  
    const sinAlpha1 = Math.sin(alpha1);
    const cosAlpha1 = Math.cos(alpha1);
  
    const sigma1 =
      Math.atan2(
        Math.tan(U1),
        cosAlpha1
      );
  
    const sinAlpha =
      cosU1 * sinAlpha1;
  
    const cosSqAlpha =
      1 - sinAlpha ** 2;
  
    const uSq =
      cosSqAlpha *
      (a ** 2 - b ** 2) /
      (b ** 2);
  
    const A =
      1 +
      (uSq / 16384) *
      (
        4096 +
        uSq *
        (
          -768 +
          uSq *
          (
            320 -
            175 * uSq
          )
        )
      );
  
    const B =
      (uSq / 1024) *
      (
        256 +
        uSq *
        (
          -128 +
          uSq *
          (
            74 -
            47 * uSq
          )
        )
      );
  
    let sigma =
      distanceMeters / (b * A);
  
    let sigmaPrevious;
  
    let cos2SigmaM;
    let sinSigma;
    let cosSigma;
    let deltaSigma;
  
    let iterations = 0;
  
    do {
      cos2SigmaM =
        Math.cos(
          2 * sigma1 + sigma
        );
  
      sinSigma = Math.sin(sigma);
      cosSigma = Math.cos(sigma);
  
      deltaSigma =
        B *
        sinSigma *
        (
          cos2SigmaM +
          (B / 4) *
          (
            cosSigma *
            (
              -1 +
              2 * cos2SigmaM ** 2
            ) -
            (B / 6) *
            cos2SigmaM *
            (
              -3 +
              4 * sinSigma ** 2
            ) *
            (
              -3 +
              4 * cos2SigmaM ** 2
            )
          )
        );
  
      sigmaPrevious = sigma;
  
      sigma =
        distanceMeters / (b * A) +
        deltaSigma;
  
      iterations++;
  
      if (iterations > 200) {
        throw new Error("Vincenty direct calculation did not converge.");
      }
  
    } while (Math.abs(sigma - sigmaPrevious) > 1e-12);
  
    const temp =
      sinU1 * sinSigma -
      cosU1 *
      cosSigma *
      cosAlpha1;
  
    const phi2 =
      Math.atan2(
        sinU1 * cosSigma +
        cosU1 *
        sinSigma *
        cosAlpha1,
        (1 - f) *
        Math.sqrt(
          sinAlpha ** 2 +
          temp ** 2
        )
      );
  
    const lambda =
      Math.atan2(
        sinSigma * sinAlpha1,
        cosU1 * cosSigma -
        sinU1 *
        sinSigma *
        cosAlpha1
      );
  
    const C =
      (f / 16) *
      cosSqAlpha *
      (
        4 +
        f *
        (
          4 -
          3 * cosSqAlpha
        )
      );
  
    const L =
      lambda -
      (1 - C) *
      f *
      sinAlpha *
      (
        sigma +
        C *
        sinSigma *
        (
          cos2SigmaM +
          C *
          cosSigma *
          (
            -1 +
            2 * cos2SigmaM ** 2
          )
        )
      );
  
    const lambda2 =
      lambda1 + L;
  
    return {
      lat: radToDeg(phi2),
      lon: normalizeLongitude(radToDeg(lambda2))
    };
  }
  
  
  function normalizeLongitude(longitude) {
    return ((longitude + 540) % 360) - 180;
  }


function calculateMidpoint(lat1, lon1, lat2, lon2) {
  const phi1 = degToRad(lat1);
  const lambda1 = degToRad(lon1);

  const phi2 = degToRad(lat2);
  const deltaLambda = degToRad(lon2 - lon1);

  const Bx =
    Math.cos(phi2) *
    Math.cos(deltaLambda);

  const By =
    Math.cos(phi2) *
    Math.sin(deltaLambda);

  const phi3 =
    Math.atan2(
      Math.sin(phi1) + Math.sin(phi2),
      Math.sqrt(
        (Math.cos(phi1) + Bx) ** 2 +
        By ** 2
      )
    );

  const lambda3 =
    lambda1 +
    Math.atan2(
      By,
      Math.cos(phi1) + Bx
    );

  return {
    lat: radToDeg(phi3),
    lon: radToDeg(lambda3)
  };
}


function degToRad(degrees) {
  return degrees * Math.PI / 180;
}


function radToDeg(radians) {
  return radians * 180 / Math.PI;
}
// ==========================================================
// KML EXPORT
// ==========================================================

const kmlBtn = document.getElementById("kmlBtn");

kmlBtn.addEventListener("click", () => {

  const latA = dmsToDecimal(
    document.getElementById("latADeg").value,
    document.getElementById("latAMin").value,
    document.getElementById("latASec").value,
    document.getElementById("latADir").value
  );

  const lonA = dmsToDecimal(
    document.getElementById("lonADeg").value,
    document.getElementById("lonAMin").value,
    document.getElementById("lonASec").value,
    document.getElementById("lonADir").value
  );

  const latB = dmsToDecimal(
    document.getElementById("latBDeg").value,
    document.getElementById("latBMin").value,
    document.getElementById("latBSec").value,
    document.getElementById("latBDir").value
  );

  const lonB = dmsToDecimal(
    document.getElementById("lonBDeg").value,
    document.getElementById("lonBMin").value,
    document.getElementById("lonBSec").value,
    document.getElementById("lonBDir").value
  );


  if (
    latA === null ||
    lonA === null ||
    latB === null ||
    lonB === null
  ) {
    alert("Enter complete runway coordinates first.");
    return;
  }


  const surfaceType =
  document.getElementById("surfaceType").value;

const aircraftType =
  document.getElementById("aircraftType").value;

const operationalAircraftType =
  document.getElementById("operationalAircraftType").value;

const lzWidthFeet =
  parseFloat(
    document.getElementById("lzWidth").value
  );

const areaType =
  document.getElementById("areaType").value;

  if (!surfaceType) {
    alert("Select a surface type.");
    return;
  }

  if (!aircraftType) {
    alert("Select an aircraft type.");
    return;
  }
  if (!operationalAircraftType) {
    alert("Select an operational aircraft.");
    return;
  }
  
  if (!Number.isFinite(lzWidthFeet) || lzWidthFeet <= 0) {
    alert("Enter a valid usable LZ width in feet.");
    return;
  }
  if (!areaType) {
    alert("Select a surrounding area type.");
    return;
  }

  const clearZoneCriteria =
    getLZClearZoneCriteria(
      surfaceType,
      aircraftType
    );


  const geometryAB =
    vincentyInverse(
      latA,
      lonA,
      latB,
      lonB
    );

  const geometryBA =
    vincentyInverse(
      latB,
      lonB,
      latA,
      lonA
    );


  const outwardA =
    normalizeBearing(
      geometryAB.initialBearing + 180
    );

  const outwardB =
    normalizeBearing(
      geometryBA.initialBearing + 180
    );


  const clearZoneA =
    buildClearZone(
      latA,
      lonA,
      outwardA,
      clearZoneCriteria
    );

  const clearZoneB =
    buildClearZone(
      latB,
      lonB,
      outwardB,
      clearZoneCriteria
    );
    const apzA =
  buildAPZLZ(
    latA,
    lonA,
    outwardA,
    areaType
  );

const apzB =
  buildAPZLZ(
    latB,
    lonB,
    outwardB,
    areaType
  );
  const adcsA =
  buildADCS(
    latA,
    lonA,
    outwardA,
    aircraftType
  );
  const exclusionArea =
  buildExclusionArea(
    latA,
    lonA,
    latB,
    lonB,
    geometryAB.initialBearing,
    areaType
  );
const adcsB =
  buildADCS(
    latB,
    lonB,
    outwardB,
    aircraftType
  );

  const primarySurface =
    buildPrimarySurface(
      latA,
      lonA,
      latB,
      lonB,
      geometryAB.initialBearing,
      surfaceType,
      aircraftType
    );
    const operationalZones =
  buildOperationalZones(
    latA,
    lonA,
    latB,
    lonB,
    geometryAB.initialBearing,
    operationalAircraftType,
    lzWidthFeet
  );


  const projectName =
    document.getElementById("projectName").value.trim() ||
    "Airfield Assessment";


    const kml =
    createAssessmentKML(
      projectName,
      latA,
      lonA,
      latB,
      lonB,
      clearZoneA,
      clearZoneB,
      primarySurface,
      adcsA,
      adcsB,
      apzA,
      apzB,
      operationalZones,
      exclusionArea
    );

  downloadKML(
    kml,
    `${sanitizeFilename(projectName)}.kml`
  );

});
// ==========================================================
// BUILD CLEAR ZONE
// ==========================================================

function buildClearZone(
    thresholdLat,
    thresholdLon,
    outwardBearing,
    criteria
  ) {
  
    const feetToMeters = 0.3048;
  
    const lengthMeters =
      criteria.lengthFeet * feetToMeters;
  
    const innerHalfWidthMeters =
      (criteria.innerWidthFeet / 2) *
      feetToMeters;
  
    const outerHalfWidthMeters =
      (criteria.outerWidthFeet / 2) *
      feetToMeters;
  
  
    const leftBearing =
      normalizeBearing(outwardBearing - 90);
  
    const rightBearing =
      normalizeBearing(outwardBearing + 90);
  
  
    const nearLeft =
      vincentyDirect(
        thresholdLat,
        thresholdLon,
        leftBearing,
        innerHalfWidthMeters
      );
  
    const nearRight =
      vincentyDirect(
        thresholdLat,
        thresholdLon,
        rightBearing,
        innerHalfWidthMeters
      );
  
  
    const outerCenter =
      vincentyDirect(
        thresholdLat,
        thresholdLon,
        outwardBearing,
        lengthMeters
      );
  
  
    const farLeft =
      vincentyDirect(
        outerCenter.lat,
        outerCenter.lon,
        leftBearing,
        outerHalfWidthMeters
      );
  
    const farRight =
      vincentyDirect(
        outerCenter.lat,
        outerCenter.lon,
        rightBearing,
        outerHalfWidthMeters
      );
  
  
    return {
      nearLeft,
      nearRight,
      farLeft,
      farRight
    };
  }
  // ==========================================================
// BUILD PRIMARY SURFACE
// ==========================================================

function buildPrimarySurface(
    latA,
    lonA,
    latB,
    lonB,
    runwayBearing,
    surfaceType,
    aircraftType
  ) {
  
    const feetToMeters = 0.3048;
  
    const criteria =
      UFC_CRITERIA.landingZone.primarySurface;
  
    const widthFeet =
      criteria[surfaceType][aircraftType].widthFeet;
  
    const halfWidthMeters =
      (widthFeet / 2) * feetToMeters;
  
    const extensionMeters =
      criteria.extensionBeyondEachEndFeet *
      feetToMeters;
  
  
    const outwardA =
      normalizeBearing(runwayBearing + 180);
  
    const outwardB =
      normalizeBearing(runwayBearing);
  
  
    const startCenter =
      vincentyDirect(
        latA,
        lonA,
        outwardA,
        extensionMeters
      );
  
    const endCenter =
      vincentyDirect(
        latB,
        lonB,
        outwardB,
        extensionMeters
      );
  
  
    const leftBearing =
      normalizeBearing(runwayBearing - 90);
  
    const rightBearing =
      normalizeBearing(runwayBearing + 90);
  
  
    return {
  
      startLeft:
        vincentyDirect(
          startCenter.lat,
          startCenter.lon,
          leftBearing,
          halfWidthMeters
        ),
  
      startRight:
        vincentyDirect(
          startCenter.lat,
          startCenter.lon,
          rightBearing,
          halfWidthMeters
        ),
  
      endLeft:
        vincentyDirect(
          endCenter.lat,
          endCenter.lon,
          leftBearing,
          halfWidthMeters
        ),
  
      endRight:
        vincentyDirect(
          endCenter.lat,
          endCenter.lon,
          rightBearing,
          halfWidthMeters
        )
  
    };
  }
  // ==========================================================
// CREATE KML
// ==========================================================

function createAssessmentKML(
    projectName,
    latA,
    lonA,
    latB,
    lonB,
    clearZoneA,
    clearZoneB,
    primarySurface,
    adcsA,
    adcsB,
    apzA,
    apzB,
    operationalZones,
    exclusionArea
  ) {
  
    return `<?xml version="1.0" encoding="UTF-8"?>
  
  <kml xmlns="http://www.opengis.net/kml/2.2">
  
  <Document>
  
  <name>${escapeXML(projectName)}</name>
  
  
  <Style id="centerlineStyle">
  
  <LineStyle>
  <color>ff0000ff</color>
  <width>1</width>
  </LineStyle>
  
  </Style>
  
  
  <Style id="clearZoneStyle">
  
  <LineStyle>
  <color>ff00ffff</color>
  <width>1</width>
  </LineStyle>
  
  <PolyStyle>
  <color>5500ffff</color>
  </PolyStyle>
  
  </Style>
  
  
  <Style id="primaryStyle">
  
  <LineStyle>
  <color>ffff0000</color>
  <width>1</width>
  </LineStyle>
  
  <PolyStyle>
  <color>330000ff</color>
  </PolyStyle>
  
  </Style>
  <Style id="adcsStyle">

<LineStyle>
<color>ff00ff00</color>
<width>1</width>
</LineStyle>

<PolyStyle>
<color>3300ff00</color>
</PolyStyle>

</Style>
 <Style id="apzStyle">

<LineStyle>
<color>ff0000ff</color>
<width>1</width>
</LineStyle>

<PolyStyle>
<color>33ff00ff</color>
</PolyStyle>

</Style>
<Style id="exclusionStyle">

<LineStyle>
<color>ff00a5ff</color>
<width>1</width>
</LineStyle>

<PolyStyle>
<fill>0</fill>
<outline>1</outline>
</PolyStyle>

</Style>
<Style id="zoneAStyle">
  <LineStyle>
    <color>ff00a5ff</color>
    <width>1</width>
  </LineStyle>

  <PolyStyle>
  <fill>0</fill>
  <outline>1</outline>
</PolyStyle>
</Style>

<Style id="zoneBStyle">
  <LineStyle>
    <color>ffffa500</color>
    <width>1</width>
  </LineStyle>

  <PolyStyle>
  <fill>0</fill>
  <outline>1</outline>
</PolyStyle>
</Style>
  <Placemark>
  
  <name>Runway Centerline</name>
  
  <styleUrl>#centerlineStyle</styleUrl>
  
  <LineString>
  
  <coordinates>
  ${lonA},${latA},0
  ${lonB},${latB},0
  </coordinates>
  
  </LineString>
  
  </Placemark>
  
  
  ${createPolygonPlacemark(
    "End A Clear Zone",
    clearZoneA.nearLeft,
    clearZoneA.farLeft,
    clearZoneA.farRight,
    clearZoneA.nearRight,
    "clearZoneStyle"
  )}
  ${createPolygonPlacemark(
    "Zone A",
    operationalZones.zoneA.startLeft,
    operationalZones.zoneA.endLeft,
    operationalZones.zoneA.endRight,
    operationalZones.zoneA.startRight,
    "zoneAStyle"
  )}
  
  ${createPolygonPlacemark(
    "Zone B",
    operationalZones.zoneB.startLeft,
    operationalZones.zoneB.endLeft,
    operationalZones.zoneB.endRight,
    operationalZones.zoneB.startRight,
    "zoneBStyle"
  )}
      ${createPolygonPlacemark(
    "End B Clear Zone",
    clearZoneB.nearLeft,
    clearZoneB.farLeft,
    clearZoneB.farRight,
    clearZoneB.nearRight,
    "clearZoneStyle"
  )}
  
  
  ${createPolygonPlacemark(
    "Primary Surface",
    primarySurface.startLeft,
    primarySurface.endLeft,
    primarySurface.endRight,
    primarySurface.startRight,
    "primaryStyle"
  )}
  ${createPolygonPlacemark(
    "Exclusion Area",
    exclusionArea.startLeft,
    exclusionArea.endLeft,
    exclusionArea.endRight,
    exclusionArea.startRight,
    "exclusionStyle"
  )}
  ${createADCSPolygonPlacemark(
    "End A ADCS",
    adcsA
  )}
  ${createPolygonPlacemark(
    "End A APZ-LZ",
    apzA.innerLeft,
    apzA.outerLeft,
    apzA.outerRight,
    apzA.innerRight,
    "apzStyle"
  )}
  
  
  ${createPolygonPlacemark(
    "End B APZ-LZ",
    apzB.innerLeft,
    apzB.outerLeft,
    apzB.outerRight,
    apzB.innerRight,
    "apzStyle"
  )}
  
  ${createADCSPolygonPlacemark(
    "End B ADCS",
    adcsB
  )} 
  
  </Document>
  
  </kml>`;
  }
  function createPolygonPlacemark(
    name,
    point1,
    point2,
    point3,
    point4,
    styleId
  ) {
  
    return `
  
  <Placemark>
  
  <name>${escapeXML(name)}</name>
  
  <styleUrl>#${styleId}</styleUrl>
  
  <Polygon>
  
  <tessellate>1</tessellate>
  
  <outerBoundaryIs>
  
  <LinearRing>
  
  <coordinates>
  
  ${point1.lon},${point1.lat},0
  ${point2.lon},${point2.lat},0
  ${point3.lon},${point3.lat},0
  ${point4.lon},${point4.lat},0
  ${point1.lon},${point1.lat},0
  
  </coordinates>
  
  </LinearRing>
  
  </outerBoundaryIs>
  
  </Polygon>
  
  </Placemark>`;
  
  }
  
  
  function downloadKML(
    kmlContent,
    filename
  ) {
  
    const blob =
      new Blob(
        [kmlContent],
        {
          type:
            "application/vnd.google-earth.kml+xml"
        }
      );
  
    const url =
      URL.createObjectURL(blob);
  
    const link =
      document.createElement("a");
  
    link.href = url;
  
    link.download = filename;
  
    document.body.appendChild(link);
  
    link.click();
  
    document.body.removeChild(link);
  
    URL.revokeObjectURL(url);
  }
  
  
  function normalizeBearing(bearing) {
    return ((bearing % 360) + 360) % 360;
  }
  
  
  function sanitizeFilename(name) {
  
    return name.replace(
      /[^a-z0-9_-]/gi,
      "_"
    );
  
  }
  
  
  function escapeXML(text) {
  
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  
  }
  // ==========================================================
// BUILD ADCS
// ==========================================================

function buildADCS(
  thresholdLat,
  thresholdLon,
  outwardBearing,
  aircraftType
) {

  const feetToMeters = 0.3048;

  const criteria =
    UFC_CRITERIA.landingZone.adcs;

  const slopeCriteria =
    criteria.slope[aircraftType];


  // --------------------------------------------------------
  // PLAN-VIEW DIMENSIONS
  // --------------------------------------------------------

  const innerEdgeDistanceMeters =
    criteria.innerEdgeDistanceFromRunwayEndFeet *
    feetToMeters;

  const innerHalfWidthMeters =
    (criteria.innerWidthFeet / 2) *
    feetToMeters;

  const minimumSlopeLengthMeters =
    criteria.minimumSlopeLengthFeet *
    feetToMeters;

  const desiredSlopeLengthMeters =
    criteria.desiredSlopeLengthFeet *
    feetToMeters;

  const outerHalfWidthMeters =
    (criteria.constantWidthFeet / 2) *
    feetToMeters;


  // --------------------------------------------------------
  // ADCS VERTICAL RISE
  // --------------------------------------------------------

  const transitionRiseFeet =
    criteria.minimumSlopeLengthFeet /
    slopeCriteria.horizontal;

  const outerRiseFeet =
    criteria.desiredSlopeLengthFeet /
    slopeCriteria.horizontal;

  const transitionRiseMeters =
    transitionRiseFeet * feetToMeters;

  const outerRiseMeters =
    outerRiseFeet * feetToMeters;


  const leftBearing =
    normalizeBearing(outwardBearing - 90);

  const rightBearing =
    normalizeBearing(outwardBearing + 90);


  // --------------------------------------------------------
  // INNER EDGE
  // 0 FT ABOVE LOCAL GROUND
  // --------------------------------------------------------

  const innerCenter =
    vincentyDirect(
      thresholdLat,
      thresholdLon,
      outwardBearing,
      innerEdgeDistanceMeters
    );

  const innerLeft =
    vincentyDirect(
      innerCenter.lat,
      innerCenter.lon,
      leftBearing,
      innerHalfWidthMeters
    );

  const innerRight =
    vincentyDirect(
      innerCenter.lat,
      innerCenter.lon,
      rightBearing,
      innerHalfWidthMeters
    );


  // --------------------------------------------------------
  // 10,500 FT POINT
  // --------------------------------------------------------

  const transitionCenter =
    vincentyDirect(
      innerCenter.lat,
      innerCenter.lon,
      outwardBearing,
      minimumSlopeLengthMeters
    );

  const transitionLeft =
    vincentyDirect(
      transitionCenter.lat,
      transitionCenter.lon,
      leftBearing,
      outerHalfWidthMeters
    );

  const transitionRight =
    vincentyDirect(
      transitionCenter.lat,
      transitionCenter.lon,
      rightBearing,
      outerHalfWidthMeters
    );


  // --------------------------------------------------------
  // 32,000 FT OUTER EDGE
  // --------------------------------------------------------

  const outerCenter =
    vincentyDirect(
      innerCenter.lat,
      innerCenter.lon,
      outwardBearing,
      desiredSlopeLengthMeters
    );

  const outerLeft =
    vincentyDirect(
      outerCenter.lat,
      outerCenter.lon,
      leftBearing,
      outerHalfWidthMeters
    );

  const outerRight =
    vincentyDirect(
      outerCenter.lat,
      outerCenter.lon,
      rightBearing,
      outerHalfWidthMeters
    );


  return {

    innerLeft: {
      ...innerLeft,
      altitudeMeters: 0
    },

    innerRight: {
      ...innerRight,
      altitudeMeters: 0
    },

    transitionLeft: {
      ...transitionLeft,
      altitudeMeters: transitionRiseMeters
    },

    transitionRight: {
      ...transitionRight,
      altitudeMeters: transitionRiseMeters
    },

    outerLeft: {
      ...outerLeft,
      altitudeMeters: outerRiseMeters
    },

    outerRight: {
      ...outerRight,
      altitudeMeters: outerRiseMeters
    }

  };
}
  // ==========================================================
// ADCS KML POLYGON - 3D RELATIVE TO GROUND
// ==========================================================

function createADCSPolygonPlacemark(
  name,
  zone
) {

  return `

<Placemark>

<name>${escapeXML(name)}</name>

<styleUrl>#adcsStyle</styleUrl>

<Polygon>

<tessellate>1</tessellate>

<altitudeMode>relativeToGround</altitudeMode>

<outerBoundaryIs>

<LinearRing>

<coordinates>

${zone.innerLeft.lon},${zone.innerLeft.lat},${zone.innerLeft.altitudeMeters}
${zone.transitionLeft.lon},${zone.transitionLeft.lat},${zone.transitionLeft.altitudeMeters}
${zone.outerLeft.lon},${zone.outerLeft.lat},${zone.outerLeft.altitudeMeters}
${zone.outerRight.lon},${zone.outerRight.lat},${zone.outerRight.altitudeMeters}
${zone.transitionRight.lon},${zone.transitionRight.lat},${zone.transitionRight.altitudeMeters}
${zone.innerRight.lon},${zone.innerRight.lat},${zone.innerRight.altitudeMeters}
${zone.innerLeft.lon},${zone.innerLeft.lat},${zone.innerLeft.altitudeMeters}

</coordinates>

</LinearRing>

</outerBoundaryIs>

</Polygon>

</Placemark>`;

}
  function buildAPZLZ(
    thresholdLat,
    thresholdLon,
    outwardBearing,
    areaType
  ) {
  
    const feetToMeters = 0.3048;
  
    const criteria =
      UFC_CRITERIA.landingZone.apzLZ;
  
    const lengthMeters =
      criteria.lengthFeet * feetToMeters;
  
    const halfWidthMeters =
      (criteria.widthFeet[areaType] / 2) *
      feetToMeters;
  
    const leftBearing =
      normalizeBearing(outwardBearing - 90);
  
    const rightBearing =
      normalizeBearing(outwardBearing + 90);
  
  
      const clearZoneLengthFeet = 500;

      const innerCenter =
        vincentyDirect(
          thresholdLat,
          thresholdLon,
          outwardBearing,
          clearZoneLengthFeet * feetToMeters
        );
  
  
    const outerCenter =
      vincentyDirect(
        innerCenter.lat,
        innerCenter.lon,
        outwardBearing,
        lengthMeters
      );
  
  
    const innerLeft =
      vincentyDirect(
        innerCenter.lat,
        innerCenter.lon,
        leftBearing,
        halfWidthMeters
      );
  
    const innerRight =
      vincentyDirect(
        innerCenter.lat,
        innerCenter.lon,
        rightBearing,
        halfWidthMeters
      );
  
    const outerLeft =
      vincentyDirect(
        outerCenter.lat,
        outerCenter.lon,
        leftBearing,
        halfWidthMeters
      );
  
    const outerRight =
      vincentyDirect(
        outerCenter.lat,
        outerCenter.lon,
        rightBearing,
        halfWidthMeters
      );
  
  
    return {
      innerLeft,
      innerRight,
      outerLeft,
      outerRight
    };
  }
  // ==========================================================
// BUILD OPERATIONAL ZONES
// ==========================================================

// ==========================================================
// BUILD OPERATIONAL ZONES
// ==========================================================

function buildOperationalZones(
  latA,
  lonA,
  latB,
  lonB,
  runwayBearing,
  operationalAircraftType,
  lzWidthFeet
) {

  const feetToMeters = 0.3048;

  const criteria =
    UFC_CRITERIA.landingZone.operationalZones[
      operationalAircraftType
    ];

  const zoneADistanceMeters =
    criteria.zoneA.distanceFeet * feetToMeters;

  const zoneBDistanceMeters =
    criteria.zoneB.distanceFeet * feetToMeters;

  const halfLZWidthMeters =
    (lzWidthFeet / 2) * feetToMeters;


  // --------------------------------------------------------
  // DIRECTIONS
  // --------------------------------------------------------

  const forwardBearing =
    normalizeBearing(runwayBearing);

  const backwardBearing =
    normalizeBearing(runwayBearing + 180);

  const leftBearing =
    normalizeBearing(runwayBearing - 90);

  const rightBearing =
    normalizeBearing(runwayBearing + 90);


  // --------------------------------------------------------
  // USABLE LZ RECTANGLE
  // --------------------------------------------------------

  const usableStartLeft =
    vincentyDirect(
      latA,
      lonA,
      leftBearing,
      halfLZWidthMeters
    );

  const usableStartRight =
    vincentyDirect(
      latA,
      lonA,
      rightBearing,
      halfLZWidthMeters
    );

  const usableEndLeft =
    vincentyDirect(
      latB,
      lonB,
      leftBearing,
      halfLZWidthMeters
    );

  const usableEndRight =
    vincentyDirect(
      latB,
      lonB,
      rightBearing,
      halfLZWidthMeters
    );


  // --------------------------------------------------------
  // ZONE A OUTER RECTANGLE
  // Zone A surrounds the entire usable LZ
  // --------------------------------------------------------

  const zoneAStartCenter =
    vincentyDirect(
      latA,
      lonA,
      backwardBearing,
      zoneADistanceMeters
    );

  const zoneAEndCenter =
    vincentyDirect(
      latB,
      lonB,
      forwardBearing,
      zoneADistanceMeters
    );

  const zoneAHalfWidthMeters =
    halfLZWidthMeters +
    zoneADistanceMeters;


  const zoneAStartLeft =
    vincentyDirect(
      zoneAStartCenter.lat,
      zoneAStartCenter.lon,
      leftBearing,
      zoneAHalfWidthMeters
    );

  const zoneAStartRight =
    vincentyDirect(
      zoneAStartCenter.lat,
      zoneAStartCenter.lon,
      rightBearing,
      zoneAHalfWidthMeters
    );

  const zoneAEndLeft =
    vincentyDirect(
      zoneAEndCenter.lat,
      zoneAEndCenter.lon,
      leftBearing,
      zoneAHalfWidthMeters
    );

  const zoneAEndRight =
    vincentyDirect(
      zoneAEndCenter.lat,
      zoneAEndCenter.lon,
      rightBearing,
      zoneAHalfWidthMeters
    );


  // --------------------------------------------------------
  // ZONE B OUTER RECTANGLE
  // Zone B begins outside Zone A
  // --------------------------------------------------------

  const totalZoneDistanceMeters =
    zoneADistanceMeters +
    zoneBDistanceMeters;

  const zoneBStartCenter =
    vincentyDirect(
      latA,
      lonA,
      backwardBearing,
      totalZoneDistanceMeters
    );

  const zoneBEndCenter =
    vincentyDirect(
      latB,
      lonB,
      forwardBearing,
      totalZoneDistanceMeters
    );

  const zoneBHalfWidthMeters =
    halfLZWidthMeters +
    totalZoneDistanceMeters;


  const zoneBStartLeft =
    vincentyDirect(
      zoneBStartCenter.lat,
      zoneBStartCenter.lon,
      leftBearing,
      zoneBHalfWidthMeters
    );

  const zoneBStartRight =
    vincentyDirect(
      zoneBStartCenter.lat,
      zoneBStartCenter.lon,
      rightBearing,
      zoneBHalfWidthMeters
    );

  const zoneBEndLeft =
    vincentyDirect(
      zoneBEndCenter.lat,
      zoneBEndCenter.lon,
      leftBearing,
      zoneBHalfWidthMeters
    );

  const zoneBEndRight =
    vincentyDirect(
      zoneBEndCenter.lat,
      zoneBEndCenter.lon,
      rightBearing,
      zoneBHalfWidthMeters
    );


  return {

    usableSurface: {
      startLeft: usableStartLeft,
      startRight: usableStartRight,
      endLeft: usableEndLeft,
      endRight: usableEndRight
    },

    zoneA: {
      startLeft: zoneAStartLeft,
      startRight: zoneAStartRight,
      endLeft: zoneAEndLeft,
      endRight: zoneAEndRight
    },

    zoneB: {
      startLeft: zoneBStartLeft,
      startRight: zoneBStartRight,
      endLeft: zoneBEndLeft,
      endRight: zoneBEndRight
    }

  };
}
// ==========================================================
// BUILD EXCLUSION AREA
// ==========================================================

function buildExclusionArea(
  latA,
  lonA,
  latB,
  lonB,
  runwayBearing,
  areaType
) {

  const feetToMeters = 0.3048;

  const criteria =
    UFC_CRITERIA.landingZone.exclusionArea;

  const clearZoneLengthFeet = 500;

  const widthFeet =
    criteria.widthFeet[areaType];

  const halfWidthMeters =
    (widthFeet / 2) * feetToMeters;

  const extensionMeters =
    clearZoneLengthFeet * feetToMeters;


  const backwardBearing =
    normalizeBearing(runwayBearing + 180);

  const forwardBearing =
    normalizeBearing(runwayBearing);

  const leftBearing =
    normalizeBearing(runwayBearing - 90);

  const rightBearing =
    normalizeBearing(runwayBearing + 90);


  const startCenter =
    vincentyDirect(
      latA,
      lonA,
      backwardBearing,
      extensionMeters
    );

  const endCenter =
    vincentyDirect(
      latB,
      lonB,
      forwardBearing,
      extensionMeters
    );


  const startLeft =
    vincentyDirect(
      startCenter.lat,
      startCenter.lon,
      leftBearing,
      halfWidthMeters
    );

  const startRight =
    vincentyDirect(
      startCenter.lat,
      startCenter.lon,
      rightBearing,
      halfWidthMeters
    );

  const endLeft =
    vincentyDirect(
      endCenter.lat,
      endCenter.lon,
      leftBearing,
      halfWidthMeters
    );

  const endRight =
    vincentyDirect(
      endCenter.lat,
      endCenter.lon,
      rightBearing,
      halfWidthMeters
    );


  return {
    startLeft,
    startRight,
    endLeft,
    endRight
  };
}