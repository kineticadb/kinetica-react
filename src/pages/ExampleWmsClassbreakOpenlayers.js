import React, { useEffect, useState } from 'react';
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

const ExampleWmsClassbreakOpenlayers = (props) => {
    const { kUser: authUsername, kPass: authPassword, kUrl } = props;

    const mapId = 'map-container-id';

    const [mapRendered, setMapRendered] = useState(false);
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

    useEffect(() => {
        map.setTarget(mapId);
        setMapRendered(true);
        return () => {
            map.setTarget(undefined);
            setMapRendered(false);
        };
    }, []);

    useEffect(() => {
        if (mapRendered && kUrl) {

            if (olLayer) {
                map.getLayers().remove(olLayer);
            }

            // Layer settings
            const opacity = .9;
            const minZoom = 0;
            const maxZoom = 24;
            const id = 'kineticaLayer-id1';

            // Kinetica WMS parameters
            let requestParams = {
                ...WMS_PARAMS,
                STYLES: "cb_raster",
                LAYERS: "demo.nyctaxi",
                X_ATTR: "pickup_longitude",
                Y_ATTR: "pickup_latitude",
                CB_ATTR: "tip_amount",
                CB_VALS: "0.000:4.012,4.012:8.024,8.024:12.036,12.036:16.048,16.048:20.100",
                POINTCOLORS: "ffdc8665,ff138086,ff534666,ffcd7672,ffeeb462",
                POINTSHAPES: "square,square,circle,circle,diamond",
                POINTSIZES: "4,10,8,16,4",
            };

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

    }, [kUrl, mapRendered]);


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

export default ExampleWmsClassbreakOpenlayers;