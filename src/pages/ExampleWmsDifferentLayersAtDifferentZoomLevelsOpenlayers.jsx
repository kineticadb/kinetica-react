import { useEffect, useState } from 'react';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlLayerTile from 'ol/layer/Tile';
import OlSourceOSM from 'ol/source/OSM';
import OlImage from 'ol/layer/Image';
import OlImageWMS from 'ol/source/ImageWMS';

import {
    base64ArrayBuffer,
    genImageLoadErrorFunction,
} from '../util';
import {
    WMS_PARAMS,
} from '../constants';

const layerSettings = {
    STYLES: 'heatmap',
    LAYERS: 'demo.nyctaxi',
    COLORMAP: 'magma',
    BLUR_RADIUS: 5,
    X_ATTR: 'pickup_longitude',
    Y_ATTR: 'pickup_latitude',
};

// Heatmap shown at the highest zoom levels; it needs no server-side setup
const heatmapLayerParams = {
    ...WMS_PARAMS,
    STYLES: layerSettings.STYLES,
    LAYERS: layerSettings.LAYERS,
    COLORMAP: layerSettings.COLORMAP,
    BLUR_RADIUS: layerSettings.BLUR_RADIUS,
    X_ATTR: layerSettings.X_ATTR,
    Y_ATTR: layerSettings.Y_ATTR,
};

const ExampleWmsDifferentLayersAtDifferentZoomLevelsOpenlayers = (props) => {
    const { wmsLayer, gpudb, kUser: authUsername, kPass: authPassword, kUrl } = props;

    const mapId = 'map-container-id';

    const heatmapRequestParams = gpudb && kUrl && wmsLayer ? heatmapLayerParams : null;
    const [h3_8RequestParams, setH3_8RequestParams] = useState(null);
    const [h3_6RequestParams, setH3_6RequestParams] = useState(null);
    const [map] = useState(() =>
        new OlMap({
            zoomControl: false,
            pixelRatio: 1,
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
        map.setTarget(mapId);
        return () => {
            map.setTarget(undefined);
        };
    }, [map]);

    useEffect(() => {
        if (heatmapRequestParams) {
            const opacity = .9;
            const minZoom = 15;
            const maxZoom = 24;
            const id = 'kineticaLayer-id1';

            const wmsApiUrl = `${kUrl}/wms`;
            const wmsSource = new OlImageWMS({
                url: wmsApiUrl,
                ratio: 1,
                params: heatmapRequestParams,
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
            wmsSource.on('imageloaderror', genImageLoadErrorFunction(wmsApiUrl, authUsername, authPassword, heatmapRequestParams, (msg) => { console.log(msg) }, 'WMSOpenlayersExample'));

            const newOlLayer = new OlImage({
                source: wmsSource,
                opacity: opacity,
                minZoom: minZoom,
                maxZoom: maxZoom,
            });

            newOlLayer.id = id;

            map.getLayers().push(newOlLayer);
            return () => map.getLayers().remove(newOlLayer);
        }
    }, [map, heatmapRequestParams, kUrl, authUsername, authPassword]);

    useEffect(() => {
        if (h3_8RequestParams) {
            const opacity = .9;
            const minZoom = 12;
            const maxZoom = 15;
            const id = 'kineticaLayer-id1-1';

            const wmsApiUrl = `${kUrl}/wms`;
            const wmsSource = new OlImageWMS({
                url: wmsApiUrl,
                ratio: 1,
                params: h3_8RequestParams,
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
            wmsSource.on('imageloaderror', genImageLoadErrorFunction(wmsApiUrl, authUsername, authPassword, h3_8RequestParams, (msg) => { console.log(msg) }, 'WMSOpenlayersExample'));

            const newOlLayer = new OlImage({
                source: wmsSource,
                opacity: opacity,
                minZoom: minZoom,
                maxZoom: maxZoom,
            });

            newOlLayer.id = id;

            map.getLayers().push(newOlLayer);
            return () => map.getLayers().remove(newOlLayer);
        }
    }, [map, h3_8RequestParams, kUrl, authUsername, authPassword]);


    useEffect(() => {
        if (h3_6RequestParams) {
            const opacity = .9;
            const minZoom = 0;
            const maxZoom = 12;
            const id = 'kineticaLayer-id1-2';

            const wmsApiUrl = `${kUrl}/wms`;
            const wmsSource = new OlImageWMS({
                url: wmsApiUrl,
                ratio: 1,
                params: h3_6RequestParams,
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
            wmsSource.on('imageloaderror', genImageLoadErrorFunction(wmsApiUrl, authUsername, authPassword, h3_6RequestParams, (msg) => { console.log(msg) }, 'WMSOpenlayersExample'));

            const newOlLayer = new OlImage({
                source: wmsSource,
                opacity: opacity,
                minZoom: minZoom,
                maxZoom: maxZoom,
            });

            newOlLayer.id = id;

            map.getLayers().push(newOlLayer);
            return () => map.getLayers().remove(newOlLayer);
        }
    }, [map, h3_6RequestParams, kUrl, authUsername, authPassword]);

    useEffect(() => {
        if (gpudb && kUrl && wmsLayer) {
            // Ignore server results if this effect has been cleaned up by then
            let cancelled = false;

            const newBoundaryLayerName = 'demo.nyctaxi_h3_8_boundary';
            const newH3_8RequestParams = {
                ...WMS_PARAMS,
                STYLES: 'cb_raster',
                LAYERS: newBoundaryLayerName,
                GEO_ATTR: 'h3_cell',
                ANTIALIASING: true,
                CB_ATTR: 'total_pickups',
                CB_VALS: '0:413.22,413.22:2582.15,2582.15:4751.07,4751.07:10006920.00',
                SHAPEFILLCOLORS: '66b43457,66e35933,66f99a13,66fadb58',
                SHAPELINECOLORS: 'ffb43457,ffe35933,fff99a13,fffadb58',
                SHAPELINEWIDTHS: '2,2,2,2',
            };
            gpudb.show_table(newBoundaryLayerName, {'no_error_if_not_exists': 'true'}, (err, showResultsH3_8) => {
                if (cancelled) {
                    return;
                }
                if (err) {
                    console.error('Error checking table', newBoundaryLayerName, err.message);
                    return;
                }
                console.log(showResultsH3_8);
                // If the h3_8 table does not exist, create it. Plain CREATE TABLE (not OR REPLACE) so a
                // table another client created in the meantime is never replaced; Kinetica doesn't allow
                // IF NOT EXISTS with CREATE TABLE ... AS.
                if (showResultsH3_8.table_names.length < 1) {
                    const createH3Cells1 = `CREATE TABLE ${newBoundaryLayerName} AS
                        (
                            SELECT
                            h3_index,
                            H3_CELLTOBOUNDARY(h3_index) AS h3_cell,
                            COUNT(*) AS total_pickups
                            FROM (SELECT
                                pickup_latitude,
                                pickup_longitude,
                                H3_XYTOCELL(pickup_longitude, pickup_latitude, 8) AS h3_index
                                FROM demo.nyctaxi)
                            GROUP BY h3_index

                        )`;
                    gpudb.execute_sql(
                        createH3Cells1,
                        0,
                        1,
                        null,
                        [],
                        {},
                        (err, data) => {
                            if (cancelled) {
                                return;
                            }
                            // "already exists" means another client created it after our check; use it
                            if (data || /already exists/i.test(err.message)) {
                                setH3_8RequestParams(newH3_8RequestParams);
                            } else {
                                console.error('Error creating table', newBoundaryLayerName, err.message);
                            }
                        }
                    );
                } else {
                    setH3_8RequestParams(newH3_8RequestParams);
                }
            });

            const newBoundaryLayerName2 = 'demo.nyctaxi_h3_6_boundary';
            const newH3_6RequestParams = {
                ...WMS_PARAMS,
                STYLES: 'cb_raster',
                LAYERS: newBoundaryLayerName2,
                GEO_ATTR: 'h3_cell',
                ANTIALIASING: true,
                CB_ATTR: 'total_pickups',
                CB_VALS: '0:413.22,413.22:2582.15,2582.15:4751.07,4751.07:10006920.00',
                SHAPEFILLCOLORS: '66b43457,66e35933,66f99a13,66fadb58',
                SHAPELINECOLORS: 'ffb43457,ffe35933,fff99a13,fffadb58',
                SHAPELINEWIDTHS: '2,2,2,2',
            };
            gpudb.show_table(newBoundaryLayerName2, {'no_error_if_not_exists': 'true'}, (err, showResultsH3_6) => {
                if (cancelled) {
                    return;
                }
                if (err) {
                    console.error('Error checking table', newBoundaryLayerName2, err.message);
                    return;
                }
                console.log(showResultsH3_6);
                // If the h3_6 table does not exist, create it. Plain CREATE TABLE (not OR REPLACE) so a
                // table another client created in the meantime is never replaced; Kinetica doesn't allow
                // IF NOT EXISTS with CREATE TABLE ... AS.
                if (showResultsH3_6.table_names.length < 1) {
                    const createH3Cells2 = `CREATE TABLE ${newBoundaryLayerName2} AS
                        (
                            SELECT
                            h3_index,
                            H3_CELLTOBOUNDARY(h3_index) AS h3_cell,
                            COUNT(*) AS total_pickups
                            FROM (SELECT
                                pickup_latitude,
                                pickup_longitude,
                                H3_XYTOCELL(pickup_longitude, pickup_latitude, 6) AS h3_index
                                FROM demo.nyctaxi)
                            GROUP BY h3_index

                        )`;
                    gpudb.execute_sql(
                        createH3Cells2,
                        0,
                        1,
                        null,
                        [],
                        {},
                        (err, data) => {
                            if (cancelled) {
                                return;
                            }
                            // "already exists" means another client created it after our check; use it
                            if (data || /already exists/i.test(err.message)) {
                                setH3_6RequestParams(newH3_6RequestParams);
                            } else {
                                console.error('Error creating table', newBoundaryLayerName2, err.message);
                            }
                        }
                    );
                } else {
                    setH3_6RequestParams(newH3_6RequestParams);
                }
            });

            return () => {
                cancelled = true;
            };
        }
    }, [wmsLayer, gpudb, kUrl]);

    useEffect(() => {
        map.setTarget(mapId);
        return () => {
            map.setTarget(undefined);
        };
    }, [map]);

    return <div style={{ width: "100%", height: "100%" }}>
        <div id={mapId} className="map-container"></div>
    </div>;
};

export default ExampleWmsDifferentLayersAtDifferentZoomLevelsOpenlayers;