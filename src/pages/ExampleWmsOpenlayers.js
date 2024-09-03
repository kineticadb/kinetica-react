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


const ExampleWmsOpenlayers = (props) => {
    const { wmsLayer, gpudb, kUser: authUsername, kPass: authPassword, kUrl } = props;

    const wmsApiUrl = `${kUrl}/wms`;
    const mapId = 'map-container-id';

    const [popupContent, setPopupContent] = useState(null);
    const [width, setWidth] = useState(window.innerWidth);
    const [mapRendered, setMapRendered] = useState(null);
    const [olLayer, setOlLayer] = useState(null);
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
                center: [-8230506.935506294, 4977530.086160267],
                zoom: 12,
            }),
        })
    );

    window.onresize = _ => {
        setWidth(window.innerWidth);
    };

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
    }, []);

    useEffect(() => {
        if (mapRendered && kUrl && wmsLayer && gpudb) {
            if (olLayer) {
                map.getLayers().remove(olLayer);
            }

            const {
                renderType,
                view,
                baseTable,
                colormap,
                blurRadius,
                pointSize,
                fillColor,
                longitude,
                latitude
            } = wmsLayer?.kineticaSettings;
            let requestParams = {
                ...WMS_PARAMS,
                STYLES: renderType,
                LAYERS: view || baseTable,
                COLORMAP: colormap,
                POINTCOLORS: fillColor,
                BLUR_RADIUS: blurRadius,
                POINTSIZES: pointSize,
                X_ATTR: longitude,
                Y_ATTR: latitude,
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
            setOlLayer(newOlLayer);

            map.on('singleclick', function (evt) {
                const extent = evt.map.getView().calculateExtent(evt.map.getSize());

                const coords = transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
                const lon = coords[0];
                const lat = coords[1];

                // Determine a radius around the user click event for the spatial filter
                const mapWidth = extent[2] - extent[0];
                const clickRad = mapWidth * (5 / width);

                gpudb.get_records(
                    view || baseTable,
                    0,
                    1,
                    {
                        expression: `GEODIST(${lon}, ${lat}, pickup_longitude, pickup_latitude) <= ${clickRad}`
                    },
                    (err, data) => {
                        if (data?.data.length > 0) {
                            const results = Object.keys(data.data[0]).map((key) => {
                                return (<tr><td style={{ "font-weight": "bold" }}>{key}</td><td>{data.data[0][key]}</td></tr>)
                            });
                            const tableDiv = (<table>{results}</table>)
                            setPopupContent((<div>{tableDiv}</div>));
                            map.getOverlayById('info').setPosition(evt.coordinate);

                        } else {
                            setPopupContent('');
                            map.getOverlayById('info').setPosition(undefined);

                        }
                    }
                );
            });
        }

    }, [wmsLayer, kUrl, mapRendered, gpudb]);

    useEffect(() => {
        map.setTarget(mapId);

        return () => {
            map.setTarget(undefined);
        };
    }, []);

    const closePopup = () => {
        setPopupContent('');
        map.getOverlayById('info').setPosition(undefined);
    };

    return <div style={{ width: "100%", height: "100%" }}>
        <div id={mapId} className="map-container"></div>
        <div id="info" class="ol-popup">
            <a href="#" id="popup-closer" class="ol-popup-closer" onClick={closePopup}></a>
            <div id="popup-content">{popupContent}</div>
        </div>
    </div>;
};

export default ExampleWmsOpenlayers;