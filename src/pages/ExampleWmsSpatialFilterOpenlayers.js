import React, { useEffect, useState } from 'react';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlLayerTile from 'ol/layer/Tile';
import OlSourceOSM from 'ol/source/OSM';
import OlImage from 'ol/layer/Image';
import OlImageWMS from 'ol/source/ImageWMS';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import WKT from 'ol/format/WKT.js';
import { Fill, Stroke, Style } from 'ol/style.js';

import {
    base64ArrayBuffer,
    genImageLoadErrorFunction,
} from '../util';
import {
    WMS_PARAMS,
} from '../constants';

const ExampleWmsSpatialFilterOpenlayers = (props) => {
    const { wmsLayer, gpudb, kUser: authUsername, kPass: authPassword, kUrl } = props;

    const mapId = 'map-container-id';

    // Rectangle in New York
    const wktgeom = 'POLYGON((-73.98460744139155 40.76405292603977,-73.98775793276715 40.75994370103416,-73.97872550054117 40.75602760679567,-73.9761382826348 40.76032095972252,-73.98460744139155 40.76405292603977))';
    const format = new WKT();
    const feature = format.readFeature(wktgeom, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
    });
    const styles = [
        new Style({
            stroke: new Stroke({
                color: 'green',
                width: 6,
            }),
            fill: new Fill({
                color: 'rgba(0, 0, 255, 0.1)',
            }),
        }),
    ];

    const [requestParams, setRequestParams] = useState(null);
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
                new VectorLayer({
                    source: new VectorSource({
                        features: [
                            feature
                        ],
                    }),
                    style: styles,
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
        setMapRendered(true);
        return () => {
            map.setTarget(undefined);
            setMapRendered(false);
        };
    }, []);

    useEffect(() => {
        if (requestParams) {
            if (olLayer) {
                map.getLayers().remove(olLayer);
            }

            const opacity = .9;
            const minZoom = 0;
            const maxZoom = 24
            const id = 'kineticaLayer-id1';

            const wmsApiUrl = `${kUrl}/wms`;
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

            map.getLayers().push(newOlLayer);
            setOlLayer(newOlLayer);
        }

    }, [requestParams]);

    useEffect(() => {
        if (mapRendered && gpudb && kUrl && wmsLayer) {
            const {
                renderType,
                baseTable,
                colormap,
                blurRadius,
                pointSize,
                fillColor,
                longitude,
                latitude
            } = wmsLayer?.kineticaSettings;

            const randomNumber = Math.floor(Math.random() * 1000000000) + 1;
            const newViewName = `${baseTable}_view_${randomNumber}`;
            const createViewStmt = `create temp materialized view ${newViewName} as SELECT * FROM ${baseTable} WHERE (STXY_INTERSECTS(${longitude},${latitude},GEOMETRY('${wktgeom}')) = 1) using table properties (ttl=20)`;
            gpudb.execute_sql(
                createViewStmt,
                0,
                1,
                null,
                [],
                {},
                (err, data) => {
                    if (data) {
                        setRequestParams({
                            ...WMS_PARAMS,
                            STYLES: renderType,
                            LAYERS: newViewName,
                            COLORMAP: colormap,
                            POINTCOLORS: fillColor,
                            BLUR_RADIUS: blurRadius,
                            POINTSIZES: pointSize,
                            X_ATTR: longitude,
                            Y_ATTR: latitude,
                        });
                    } else {
                        console.error('Error creating view', baseTable);
                    }
                }
            );
        }

    }, [wmsLayer, gpudb, kUrl, mapRendered]);

    useEffect(() => {
        map.setTarget(mapId);
        return () => {
            map.setTarget(undefined);
        };
    }, []);

    return <div style={{ width: "100%", height: "100%" }}>
        <div id={mapId} className="map-container"></div>
    </div>;
};

export default ExampleWmsSpatialFilterOpenlayers;