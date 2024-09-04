import React, { useEffect, useState, useCallback } from 'react';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlLayerTile from 'ol/layer/Tile';
import OlSourceOSM from 'ol/source/OSM';
import OlOverlay from "ol/Overlay";
import { unByKey } from "ol/Observable";
import { transform } from "ol/proj";
import { KWmsOlLayer } from './KWmsOlLayer';
import { KVectorOlLayer } from './KVectorOlLayer';
import {
    MAP_CLICK_PIXEL_RADIUS,
} from "../constants";
import InfoPopupHelper from './infoPopupHelper';
import Info from './Info';

function Map(props) {

    const { kUser, kPass, kUrl, mapLayers, setError, gpudb } = props;
    const mapId = 'map-container-id';
    const componentName = `map_${mapId}`;

    const [map] = useState(
        new OlMap({
            zoomControl: false,
            pixelRatio: 1, // Reduce Pixel ratio from default 1.5 to work on retina displays
            target: undefined,
            layers: [
                new OlLayerTile({
                    name: 'OSM',
                    source: new OlSourceOSM({
                        crossOrigin: 'anonymous',
                        wrapX: true,
                        noWrap: false,
                    }),
                    className: 'ol_bw',
                }),
            ],
            overlays: [],
            view: new OlView({
                center: [0, 0],
                zoom: 2,
            }),
        })
    );
    const [mapRendered, setMapRendered] = useState(false);
    const [handleMapClickKey, setHandleMapClickKey] = useState(null);
    const [infoCoordinate, setInfoCoordinate] = useState(undefined);
    const [infoLayers, setInfoLayers] = useState(undefined);
    const [infoRadius, setInfoRadius] = useState(undefined);
    const [width, setWidth] = useState(window.innerWidth);

    window.onresize = _ => {
        setWidth(window.innerWidth);
    };

    useEffect(() => {
        map.setTarget(mapId);
        setMapRendered(true);
        map.addOverlay(
            new OlOverlay({
                id: `info`,
                element: document.getElementById(`info`),
                autoPan: true,
                autoPanAnimation: {
                    duration: 250,
                },
                positioning: "bottom-center",
                autoPanMargin: 70,
            })
        );
        return () => {
            map.setTarget(undefined);
            setMapRendered(true);
        };
    }, []);

    const getClickRadius = useCallback(
        extent => {
            const mapWidth = extent[2] - extent[0];
            return mapWidth * (MAP_CLICK_PIXEL_RADIUS / width);
        },
        [width]
    );

    const openInfo = useCallback(
        coordinate => {
            if (map && map.getOverlayById('info')) {
                const mapExtent = map.getView().calculateExtent(map.getSize());
                const center = map.getView().getCenter();
                const x = center[0];
                const y = (mapExtent[3] - mapExtent[1]) * 0.5 + mapExtent[1];
                map.getOverlayById('info').setPosition([x, y]);
            }
        },
        [map]
    );

    const closeInfo = useCallback(
        _ => {
            if (map && map.getOverlayById('info')) {
                map.getOverlayById('info').setPosition(null);
                setInfoLayers(null);
            }
        },
        [map]
    );

    const handleMapClick = useCallback(
        async function (evt) {

            if (gpudb && map) {
                // Determine coordinate of click and compute relative radius
                const extent = evt.map.getView().calculateExtent(evt.map.getSize());
                const coords = transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
                const lon = coords[0];
                const lat = coords[1];
                const radius = getClickRadius(extent);

                try {
                    const currentZoom = evt.map.getView().getZoom();
                    const visibleLayers = mapLayers?.toReversed().filter((lyr) => lyr.enablePopup && lyr.visible && lyr.maxZoom >= currentZoom && lyr.minZoom <= currentZoom).map((lyr) => {
                        const { label, kineticaSettings, id, popupTemplate } = lyr;
                        const { longitude: lonColumn, latitude: latColumn, wkt: wktColumn, view, baseTable, columns, vectorLayerType } = kineticaSettings;

                        return {
                            id,
                            label,
                            view: view || baseTable,
                            baseTable,
                            lonColumn,
                            latColumn,
                            wktColumn,
                            columns,
                            popupTemplate,
                            vectorLayerType,
                        };
                    });
                    evt.map.forEachFeatureAtPixel(evt.pixel, function (f) {
                        // If a vector feature was found, add it to the list of layers
                        visibleLayers.forEach(lyr => {
                            const fProps = f.getProperties();
                            if (lyr.view === fProps.layer) {
                                if (lyr.records != null) {
                                    lyr.records.data.push(fProps);
                                    lyr.records.total_number_of_records++;
                                } else {
                                    lyr.records = { data: [fProps], total_number_of_records: 1 };
                                }
                            }
                        });
                        return false;
                    });
                    let clickResults = await InfoPopupHelper.checkMapLayerDataAtLocation(gpudb, visibleLayers, lon, lat, radius);
                    const hasClickData = clickResults?.filter((cResult) => cResult.records != null || (cResult.queriedData && cResult.qualified_view_name != null))?.length > 0;

                    // Manage display of info overlay
                    if (!hasClickData) {
                        closeInfo();
                    } else {
                        setInfoLayers(clickResults);
                        openInfo(evt.coordinate);
                        setInfoCoordinate(coords);
                        setInfoRadius(radius);
                    }
                } catch (error) {
                    setError(componentName, error);
                    console.log(error);
                    closeInfo();
                }
            }
        },
        [
            gpudb,
            map,
            mapLayers,
            getClickRadius,
            openInfo,
            closeInfo,
        ]
    );
    useEffect(() => {
        if (map) {
            if (handleMapClickKey) {
                unByKey(handleMapClickKey);
            }
            setHandleMapClickKey(map.on("singleclick", handleMapClick));
        }
    }, [map, handleMapClick]);

    const layersRender = (map && mapRendered && kUrl &&
        kUser && kPass && mapLayers ?
        mapLayers.map((lyr, index) => lyr.kineticaSettings.renderType != null ? <KWmsOlLayer
            key={lyr.id}
            index={index}
            label={lyr.label}
            id={lyr.id}
            map={map}
            kineticaSettings={lyr.kineticaSettings}
            visible={lyr.visible}
            opacity={lyr.opacity}
            minZoom={lyr.minZoom}
            maxZoom={lyr.maxZoom}
            wmsApiUrl={kUrl + '/wms'}
            authUsername={kUser}
            authPassword={kPass}
            setError={(componentName, msg) => {
                if (setError && msg) {
                    setError("WMS Error: " + msg);
                } else {
                    setError(null);
                }
            }}
            datasource={null}
        /> : <KVectorOlLayer
            key={lyr.id}
            index={index}
            label={lyr.label}
            id={lyr.id}
            map={map}
            kineticaSettings={lyr.kineticaSettings}
            visible={lyr.visible}
            opacity={lyr.opacity}
            minZoom={lyr.minZoom}
            maxZoom={lyr.maxZoom}
            style={lyr.style}
            vtsApiUrl={kUrl + '/vts'}
            authUsername={kUser}
            authPassword={kPass}
            setError={(componentName, msg) => {
                if (setError && msg) {
                    setError("Vector Layer Error: " + msg);
                } else {
                    setError(null);
                }
            }}
            datasource={null}
        />) : null
    );

    return (
        <div style={{ width: "100%", height: "900px" }}>
            <Info
                id="info"
                gpudb={gpudb}
                radius={infoRadius}
                infoLayers={infoLayers}
                coordinate={infoCoordinate}
                columns={[]}
                calculatedField={null}
                calculatedFieldName={null}
                width={width}
                close={closeInfo}
            />
            <div id={mapId} className="map-container"></div>
            {layersRender}
        </div>
    )

}

export default Map;