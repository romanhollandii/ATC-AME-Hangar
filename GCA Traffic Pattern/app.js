// ==========================================
// GCA TRAFFIC PATTERN BUILDER
// ==========================================


// ==========================================
// PAGE ELEMENTS
// ==========================================

const runwayName = document.getElementById("runwayName");

// Runway End 1
const lat1Deg = document.getElementById("lat1Deg");
const lat1Min = document.getElementById("lat1Min");
const lat1Sec = document.getElementById("lat1Sec");
const lat1Hem = document.getElementById("lat1Hem");

const lon1Deg = document.getElementById("lon1Deg");
const lon1Min = document.getElementById("lon1Min");
const lon1Sec = document.getElementById("lon1Sec");
const lon1Hem = document.getElementById("lon1Hem");

// Runway End 2
const lat2Deg = document.getElementById("lat2Deg");
const lat2Min = document.getElementById("lat2Min");
const lat2Sec = document.getElementById("lat2Sec");
const lat2Hem = document.getElementById("lat2Hem");

const lon2Deg = document.getElementById("lon2Deg");
const lon2Min = document.getElementById("lon2Min");
const lon2Sec = document.getElementById("lon2Sec");
const lon2Hem = document.getElementById("lon2Hem");

// Traffic Pattern
const patternLength = document.getElementById("patternLength");
const patternWidth = document.getElementById("patternWidth");
const trafficDirection = document.getElementById("trafficDirection");

// Buttons / Status
const buildPatternBtn = document.getElementById("buildPattern");
const exportKmlBtn = document.getElementById("exportKml");
const statusDisplay = document.getElementById("status");
// Stores the completed pattern for KML export
let generatedPattern = null;
let generatedRunway = null;

// ==========================================
// DMS → DECIMAL DEGREES
// ==========================================

function dmsToDecimal(degrees, minutes, seconds, hemisphere) {

    let decimal =
        Number(degrees) +
        Number(minutes) / 60 +
        Number(seconds) / 3600;

    if (hemisphere === "S" || hemisphere === "W") {
        decimal *= -1;
    }

    return decimal;
}


// ==========================================
// DISTANCE BETWEEN TWO COORDINATES
// Returns distance in nautical miles
// ==========================================

function distanceNM(lat1, lon1, lat2, lon2) {

    const earthRadiusNM = 3440.065;

    const toRadians = degrees => degrees * Math.PI / 180;

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);

    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) *
        Math.cos(φ2) *
        Math.sin(Δλ / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadiusNM * c;
}
// ==========================================
// RUNWAY BEARING
// Returns initial bearing from End 1 to End 2
// ==========================================

function calculateBearing(lat1, lon1, lat2, lon2) {

    const toRadians = degrees => degrees * Math.PI / 180;
    const toDegrees = radians => radians * 180 / Math.PI;

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);

    const Δλ = toRadians(lon2 - lon1);

    const y =
        Math.sin(Δλ) *
        Math.cos(φ2);

    const x =
        Math.cos(φ1) *
        Math.sin(φ2) -
        Math.sin(φ1) *
        Math.cos(φ2) *
        Math.cos(Δλ);

    let bearing =
        toDegrees(Math.atan2(y, x));

    // Convert negative bearings to 0–360°
    bearing = (bearing + 360) % 360;

    return bearing;
}
// ==========================================
// DESTINATION POINT
// Finds a new coordinate from:
// starting coordinate + bearing + distance
// Distance is in nautical miles
// ==========================================

function destinationPoint(lat, lon, bearing, distanceNM) {

    const earthRadiusNM = 3440.065;

    const toRadians = degrees => degrees * Math.PI / 180;
    const toDegrees = radians => radians * 180 / Math.PI;

    const φ1 = toRadians(lat);
    const λ1 = toRadians(lon);
    const θ = toRadians(bearing);

    const angularDistance = distanceNM / earthRadiusNM;

    const φ2 = Math.asin(
        Math.sin(φ1) * Math.cos(angularDistance) +
        Math.cos(φ1) *
        Math.sin(angularDistance) *
        Math.cos(θ)
    );

    const λ2 =
        λ1 +
        Math.atan2(
            Math.sin(θ) *
            Math.sin(angularDistance) *
            Math.cos(φ1),

            Math.cos(angularDistance) -
            Math.sin(φ1) *
            Math.sin(φ2)
        );

    return {
        lat: toDegrees(φ2),
        lon: ((toDegrees(λ2) + 540) % 360) - 180
    };
}
// ==========================================
// BUILD BUTTON
// ==========================================

buildPatternBtn.addEventListener("click", () => {

    // Convert Runway End 1
    const runwayLat1 = dmsToDecimal(
        lat1Deg.value,
        lat1Min.value,
        lat1Sec.value,
        lat1Hem.value
    );

    const runwayLon1 = dmsToDecimal(
        lon1Deg.value,
        lon1Min.value,
        lon1Sec.value,
        lon1Hem.value
    );


    // Convert Runway End 2
    const runwayLat2 = dmsToDecimal(
        lat2Deg.value,
        lat2Min.value,
        lat2Sec.value,
        lat2Hem.value
    );

    const runwayLon2 = dmsToDecimal(
        lon2Deg.value,
        lon2Min.value,
        lon2Sec.value,
        lon2Hem.value
    );
generatedRunway = {
    end1: {
        lat: runwayLat1,
        lon: runwayLon1
    },
    end2: {
        lat: runwayLat2,
        lon: runwayLon2
    }
};

    // Calculate physical runway length
    const runwayLengthNM = distanceNM(
        runwayLat1,
        runwayLon1,
        runwayLat2,
        runwayLon2
    );

    const runwayLengthFT = runwayLengthNM * 6076.12;
// Calculate runway bearing from End 1 toward End 2
const runwayBearing = calculateBearing(
    runwayLat1,
    runwayLon1,
    runwayLat2,
    runwayLon2
);

    // Get requested traffic-pattern length
    const requestedLengthNM = Number(patternLength.value);


// ==========================================
// PATTERN LENGTH DISTRIBUTION
// ==========================================

// Final is always 10 NM from the approach threshold.
const finalLengthNM = 10;

// The runway itself counts toward the total
// Upwind / Downwind pattern length.
//
// Whatever remains after the 10 NM final
// and physical runway becomes the distance
// beyond the departure end before crosswind.

const departureExtensionNM =
    requestedLengthNM -
    finalLengthNM -
    runwayLengthNM;

// ==========================================
// RUNWAY-ALIGNED PATTERN ENDS
// ==========================================

// Calculate the reverse runway bearing
const reverseRunwayBearing = calculateBearing(
    runwayLat2,
    runwayLon2,
    runwayLat1,
    runwayLon1
);

// Pattern begins 10 NM before Runway End 1.
// Runway End 1 is our approach threshold.
const patternStart = destinationPoint(
    runwayLat1,
    runwayLon1,
    reverseRunwayBearing,
    finalLengthNM
);

// Pattern continues beyond Runway End 2
// only by the remaining distance.
const patternEnd = destinationPoint(
    runwayLat2,
    runwayLon2,
    runwayBearing,
    departureExtensionNM
);


// Determine which side of the runway
// contains the traffic pattern.
//
// Looking from End 1 toward End 2:
// Right traffic = 90° right
// Left traffic  = 90° left

let sideBearing;

if (trafficDirection.value === "right") {

    sideBearing =
        (runwayBearing + 90) % 360;

} else {

    sideBearing =
        (runwayBearing - 90 + 360) % 360;
}


// Move the two runway-side corners outward
// by the requested pattern width.

const patternWidthNM =
    Number(patternWidth.value);

const outerStart = destinationPoint(
    patternStart.lat,
    patternStart.lon,
    sideBearing,
    patternWidthNM
);

const outerEnd = destinationPoint(
    patternEnd.lat,
    patternEnd.lon,
    sideBearing,
    patternWidthNM
);


// Save the four corners for later KML export

const patternCorners = [
    patternStart,

    // Force the pattern boundary through
    // the actual runway centerline points
    {
        lat: runwayLat1,
        lon: runwayLon1
    },

    {
        lat: runwayLat2,
        lon: runwayLon2
    },

    patternEnd,
    outerEnd,
    outerStart
];
generatedPattern = patternCorners;

exportKmlBtn.disabled = false;
// Display our test results
statusDisplay.innerHTML = `
    <strong>RUNWAY GEOMETRY TEST</strong><br><br>

    End 1 Decimal:
    ${runwayLat1.toFixed(6)}, ${runwayLon1.toFixed(6)}<br>

    End 2 Decimal:
    ${runwayLat2.toFixed(6)}, ${runwayLon2.toFixed(6)}<br><br>

    Calculated Runway Length:
    ${runwayLengthFT.toFixed(0)} ft
    (${runwayLengthNM.toFixed(3)} NM)<br><br>

    Runway Bearing:
    ${runwayBearing.toFixed(1)}°<br><br>

    Requested Pattern Length:
    ${requestedLengthNM.toFixed(2)} NM<br><br>

Final:
${finalLengthNM.toFixed(3)} NM<br><br>

Runway Length:
${runwayLengthNM.toFixed(3)} NM<br><br>

Departure Extension:
${departureExtensionNM.toFixed(3)} NM<br><br>

<strong>PATTERN GEOMETRY</strong><br><br>

Traffic Side Bearing:
${sideBearing.toFixed(1)}°<br><br>

Runway-Side Corner 1:
${patternStart.lat.toFixed(6)},
${patternStart.lon.toFixed(6)}<br>

Runway-Side Corner 2:
${patternEnd.lat.toFixed(6)},
${patternEnd.lon.toFixed(6)}<br>

Outer Corner 1:
${outerStart.lat.toFixed(6)},
${outerStart.lon.toFixed(6)}<br>

Outer Corner 2:
${outerEnd.lat.toFixed(6)},
${outerEnd.lon.toFixed(6)}
`;
});
// ==========================================
// EXPORT KML
// ==========================================

exportKmlBtn.addEventListener("click", () => {

    if (!generatedPattern) {
        statusDisplay.innerHTML =
            "Build the traffic pattern before exporting.";
        return;
    }

    const name =
        runwayName.value.trim() || "GCA Traffic Pattern";

    const coordinates = generatedPattern
        .map(point => `${point.lon},${point.lat},0`)
        .join("\n");

    // Repeat the first point to close the polygon
    const firstPoint = generatedPattern[0];

    const closedCoordinates =
        coordinates +
        `\n${firstPoint.lon},${firstPoint.lat},0`;


    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">

<Document>

    <name>${name}</name>

    <Style id="trafficPatternStyle">

        <LineStyle>
            <color>ff00ffff</color>
            <width>3</width>
        </LineStyle>

        <PolyStyle>
            <color>3300ffff</color>
        </PolyStyle>

    </Style>

    <!-- PHYSICAL RUNWAY CENTERLINE -->

    <Placemark>

        <name>Physical Runway Centerline</name>

        <Style>
            <LineStyle>
                <color>ff00ff00</color>
                <width>5</width>
            </LineStyle>
        </Style>

        <LineString>

            <tessellate>1</tessellate>

            <coordinates>
                ${generatedRunway.end1.lon},${generatedRunway.end1.lat},0
                ${generatedRunway.end2.lon},${generatedRunway.end2.lat},0
            </coordinates>

        </LineString>

    </Placemark>
    <Placemark>

        <name>${name}</name>

        <styleUrl>#trafficPatternStyle</styleUrl>

        <Polygon>

            <tessellate>1</tessellate>

            <outerBoundaryIs>

                <LinearRing>

                    <coordinates>
${closedCoordinates}
                    </coordinates>

                </LinearRing>

            </outerBoundaryIs>

        </Polygon>

    </Placemark>

</Document>

</kml>`;


    // Create downloadable KML file
    const blob =
        new Blob(
            [kml],
            {
                type: "application/vnd.google-earth.kml+xml"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `${name.replace(/[^a-z0-9]/gi, "_")}_Traffic_Pattern.kml`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);


    statusDisplay.innerHTML += `
        <br><br>
        <strong>KML EXPORTED SUCCESSFULLY</strong>
    `;

});