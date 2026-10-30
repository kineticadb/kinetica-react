import React, { useEffect, useState } from 'react';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlLayerTile from 'ol/layer/Tile';
import OlSourceOSM from 'ol/source/OSM';
import OlImage from 'ol/layer/Image';
import OlImageWMS from 'ol/source/ImageWMS';
import OlOverlay from 'ol/Overlay';
import {
    base64ArrayBuffer,
    genImageLoadErrorFunction,
} from '../util';
import {
    WMS_PARAMS,
} from '../constants';
import { transform } from "ol/proj";


const layerSettings = {
    STYLES: 'heatmap',
    LAYERS: 'demo.nyctaxi',
    COLORMAP: 'magma',
    BLUR_RADIUS: 5,
    X_ATTR: 'pickup_longitude',
    Y_ATTR: 'pickup_latitude',
};

const ExampleWmsOpenlayers = (props) => {
    const { gpudb, kUser: authUsername, kPass: authPassword, kUrl } = props;

    const wmsApiUrl = `${kUrl}/wms`;
    const mapId = 'map-container-id';

    const [popupContent, setPopupContent] = useState(null);
    const [width, setWidth] = useState(window.innerWidth);
    const [mapRendered, setMapRendered] = useState(null);
    const [map] = useState(() =>
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
                center: [-8230506.935506294, 4977530.086160267],
                zoom: 12,
            }),
        })
    );

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        map.setTarget(mapId);
        setMapRendered(true);
        map.addOverlay(
            new OlOverlay({
                id: 'info',
                element: document.getElementById('info'),
                autoPan: true,
                autoPanAnimation: {
                    duration: 250,
                },
                positioning: 'center-center',
                autoPanMargin: 70,
            })
        );
        return () => {
            map.setTarget(undefined);
            setMapRendered(false);
        };
    }, [map]);

    useEffect(() => {
        if (mapRendered && kUrl && gpudb) {
            let requestParams = {
                ...WMS_PARAMS,
                ...layerSettings,
            };

            const opacity = .9;
            const minZoom = 0;
            const maxZoom = 24;
            const id = 'kineticaLayer-id1';

            const wmsSource = new OlImageWMS({
                url: wmsApiUrl,
                ratio: 1,
                params: requestParams,
                serverType: 'geoserver',
                crossOrigin: 'anonymous',
                imageLoadFunction: (image, src) => {
                    const xhttp = new XMLHttpRequest();
                    xhttp.open('GET', src, true);
                    if (authUsername && authPassword) {
                        xhttp.setRequestHeader(
                            'Authorization',
                            'Basic ' + btoa(`${authUsername}:${authPassword}`));
                    }
                    xhttp.responseType = 'arraybuffer';
                    xhttp.onreadystatechange = () => {
                        if (xhttp.readyState === 4) {
                            const arr = new Uint8Array(xhttp.response);
                            const data = 'data:image/png;base64,' + base64ArrayBuffer(arr);
                            image.getImage().src = data;
                        }
                    };
                    xhttp.send();
                },
            });
            wmsSource.on('imageloaderror', genImageLoadErrorFunction(wmsApiUrl, authUsername, authPassword, requestParams, (msg) => { console.log(msg) }, 'WMSOpenlayersExample'));

            const newOlLayer = new OlImage({
                source: wmsSource,
                opacity: opacity,
                minZoom: minZoom,
                maxZoom: maxZoom,
            });

            newOlLayer.id = id;
            newOlLayer.setVisible(true);

            map.getLayers().push(newOlLayer);
            return () => map.getLayers().remove(newOlLayer);
        }
    }, [map, mapRendered, kUrl, gpudb, wmsApiUrl, authUsername, authPassword]);

    useEffect(() => {
        if (mapRendered && gpudb) {
            const mapClickHandler = (evt) => {
                const extent = evt.map.getView().calculateExtent(evt.map.getSize());

                const coords = transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
                const lon = coords[0];
                const lat = coords[1];

                // Determine a radius around the user click event for the spatial filter
                const mapWidth = extent[2] - extent[0];
                const clickRad = mapWidth * (5 / width);

                gpudb.get_records(
                    layerSettings.LAYERS,
                    0,
                    1,
                    {
                        expression: `GEODIST(${lon}, ${lat}, ${layerSettings.X_ATTR}, ${layerSettings.Y_ATTR}) <= ${clickRad}`
                    },
                    (err, data) => {
                        if (err) {
                            console.error('Error getting records', layerSettings.LAYERS, err.message);
                        }
                        if (data?.data.length > 0) {
                            const results = Object.keys(data.data[0]).map((key) => {
                                return (<tr key={key}><td style={{ fontWeight: "bold" }}>{key}</td><td>{data.data[0][key]}</td></tr>)
                            });
                            const tableDiv = (<table><tbody>{results}</tbody></table>)
                            setPopupContent((<div>{tableDiv}</div>));
                            map.getOverlayById('info').setPosition(evt.coordinate);

                        } else {
                            setPopupContent('');
                            map.getOverlayById('info').setPosition(undefined);

                        }
                    }
                );
            };
            map.on('singleclick', mapClickHandler);
            return () => map.un('singleclick', mapClickHandler);
        }
    }, [map, mapRendered, gpudb, width]);

    useEffect(() => {
        map.setTarget(mapId);

        return () => {
            map.setTarget(undefined);
        };
    }, [map]);

    const closePopup = () => {
        setPopupContent('');
        map.getOverlayById('info').setPosition(undefined);
    };

    return <div style={{ width: "100%", height: "100%" }}>
        <div id={mapId} className="map-container"></div>
        <div id="info" className="ol-popup">
            <button type="button" id="popup-closer" className="ol-popup-closer" aria-label="Close" onClick={closePopup}></button>
            <div id="popup-content" style={{ maxHeight: "200px", overflow: "auto" }}>{popupContent}</div>
        </div>
    </div>;
};

export default ExampleWmsOpenlayers;