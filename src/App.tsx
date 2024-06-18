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
  id: string;
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
          // eslint-disable-next-line no-constant-condition
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

    setGpsData(JSON.parse(data));
    console.log(JSON.parse(data));
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
  const mapRef = useRef<MapRef>(null);
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
          <div className=" relative w-[30px] h-[30px]">
            {gpsData ? (
              <img
                className=" absolute w-full h-full top-[25px] "
                src="https://cdn.pixabay.com/animation/2023/10/11/21/20/21-20-17-15_512.gif"
              />
            ) : null}
            <img
              className=" absolute "
              src="https://static-00.iconduck.com/assets.00/location-pin-icon-1536x2048-3kypjyl6.png"
            />
          </div>
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
