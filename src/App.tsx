import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  FillExtrusionLayer,
  FullscreenControl,
  GeolocateControl,
  Layer,
  MapRef,
  Marker,
  NavigationControl,
  ScaleControl,
} from "react-map-gl";
import { Button } from "./components/ui/button";

type locDat = {
  gpsFix: number;
  lat: number;
  lon: number;
  alt: number;
  numSV: number;
};

const App = () => {
  const [gpsData, setGpsData] = useState<locDat>();

  async function connectToSerial() {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });

      const reader = port.readable.getReader();
      let partialData = "";

      const readData = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              console.log("Reader done.");
              reader.releaseLock();
              break;
            }
            partialData += new TextDecoder().decode(value);
            const newlineIndex = partialData.indexOf("\n");
            if (newlineIndex !== -1) {
              const newData = partialData.substring(0, newlineIndex);
              parseGPSData(newData);
              partialData = partialData.substring(newlineIndex + 1);
            }
          }
        } catch (error) {
          console.error("Error reading data:", error);
        }
      };

      readData();
    } catch (error) {
      console.error("Error connecting to serial:", error);
    }
  }

  function parseGPSData(data: string) {
    // Regex to match the data format: fix:<value> lat:<value> lon:<value> alt:<value> sat:<value>
    const regex =
      /fix:(\d+)\s*lat:([+-]?\d+(\.\d+)?)\s*lon:([+-]?\d+(\.\d+)?)\s*alt:([+-]?\d+(\.\d+)?)\s*sat:(\d+)/;
    const match = data.match(regex);
    console.log(data);
    if (match) {
      const parsedData = {
        gpsFix: match[1],
        lat: parseFloat(match[2]),
        lon: parseFloat(match[4]),
        alt: parseFloat(match[6]),
        numSV: parseInt(match[8]),
      };
      setGpsData(parsedData);
    }
  }

  const layerProp: FillExtrusionLayer = {
    id: "add-3d-buildings",
    source: "composite",
    "source-layer": "building",
    filter: ["==", "extrude", "true"],
    type: "fill-extrusion",
    minzoom: 15,
    paint: {
      "fill-extrusion-color": "#aaa",
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        15,
        0,
        15.05,
        ["get", "height"],
      ],
      "fill-extrusion-base": [
        "interpolate",
        ["linear"],
        ["zoom"],
        15,
        0,
        15.05,
        ["get", "min_height"],
      ],
      "fill-extrusion-opacity": 0.6,
    },
  };

  useEffect(() => {
    // Optionally, initiate connection on mount
    // connectToSerial();
  }, []);
  const mapRef = useRef<MapRef>();
  const onLocate = useCallback(() => {
    gpsData &&
      mapRef.current?.flyTo({
        center: [gpsData.lon, gpsData.lat],
        duration: 2000,
        zoom: 16,
      });
  }, [gpsData]);
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Map
        ref={mapRef}
        mapLib={import("mapbox-gl")}
        initialViewState={{
          longitude: gpsData ? gpsData.lon : -100,
          latitude: gpsData ? gpsData.lat : 40,
          zoom: 3.5,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.VITE_MAPBOX_TOKEN}
      >
        <GeolocateControl position="top-left" />
        <FullscreenControl position="top-left" />
        <NavigationControl position="top-left" />

        <ScaleControl />

        <Layer {...layerProp} />
        <Marker
          longitude={gpsData ? gpsData.lon : -100}
          latitude={gpsData ? gpsData.lat : 40}
          anchor="bottom"
        >
          <img
            width={30}
            src="https://media2.giphy.com/media/9dWLC0RTypEOTHRRcJ/source.gif"
          />
        </Marker>
        <div className=" absolute flex flex-col gap-3 top-5 right-5">
          <Button onClick={connectToSerial}>Connect</Button>
          <Button
            onClick={() => {
              onLocate();
              console.log("ok");
            }}
          >
            Locate
          </Button>
          {gpsData && (
            <div className=" text-white">
              <p>GPS Fix: {gpsData.gpsFix}</p>
              <p>Latitude: {gpsData.lat}</p>
              <p>Longitude: {gpsData.lon}</p>
              <p>Altitude: {gpsData.alt} meters</p>
              <p>Satellites: {gpsData.numSV}</p>
            </div>
          )}
        </div>
      </Map>
    </div>
  );
};

export default App;
