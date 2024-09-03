import React, { useState, useEffect, useRef } from 'react';
import * as $ from 'jquery';
import OlImage from 'ol/layer/Image';
import OlImageWMS from 'ol/source/ImageWMS';
import {
    base64ArrayBuffer,
} from '../util';
import {
    WMS_PARAMS,
} from '../constants';

function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

const genImageLoadFunction = (authUsername, authPassword, setError, componentName) => {
    return (image, src) => {
        setError(componentName, '');
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
    };
};

const genImageLoadErrorFunction = (wmsApiUrl, authUsername, authPassword, requestParams, setError, componentName) => {
    return event => {
        const errorParams = {
            ...requestParams,
            HEIGHT: 100,
            WIDTH: 100,
            BBOX: '-10000,-10000,10000,10000',
        };

        // Make the same WMS request again to get the error message
        $.ajax({
            url: wmsApiUrl,
            type: 'GET',
            data: errorParams,
            headers: {
                'Authorization': 'Basic ' + btoa(`${authUsername}:${authPassword}`),
            },
            success: data => {
                // If error from endpoint, will be XML format
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data, 'text/xml');
                const node = xmlDoc.querySelectorAll('ServiceException');
                [].map.call(node, exception => {
                    setError(componentName, exception.textContent);
                    console.error(`imageloaderror (${componentName})`, exception.textContent);
                });
            },
            error: error => {
                // If error from map service, error is in response text
                if (error.responseText) {
                    setError(componentName, error.responseText);
                    console.error(`imageloaderror (${componentName})`, error.responseText);
                } else {
                    setError(componentName, `WMS request error to ${wmsApiUrl}`);
                }
            },
        });
    }
};

export const KWmsOlLayer = (props) => {
    const { id, label, map, kineticaSettings, visible, opacity, minZoom, maxZoom, wmsApiUrl, authUsername, authPassword, setError, index } = props;
    const prevProps = usePrevious({ id, label, map, kineticaSettings, visible, opacity, minZoom, maxZoom, wmsApiUrl, authUsername, authPassword });
    const [olLayer, setOlLayer] = useState(null);
    const componentName = label ? `KWmsOlLayer-${label}` : 'KWmsOlLayer';

    useEffect(() => {

        // Check if kineticaSettings is valid
        if (!kineticaSettings) {
            return;
        }

        // Create layer
        const {
            renderType,
            view,
            baseTable,
            colormap,
            blurRadius,
            pointSize,
            fillColor,
            borderColor,
            heatmapAttr,
            wkt,
            longitude,
            latitude
        } = kineticaSettings;
        let requestParams = {
            ...WMS_PARAMS,
            STYLES: renderType,
            LAYERS: view || baseTable,
            COLORMAP: colormap,
            POINTCOLORS: fillColor,
            BLUR_RADIUS: blurRadius,
            POINTSIZES: pointSize,
            SHAPEFILLCOLORS: fillColor,
            TRACKHEADCOLORS: fillColor,
            TRACKMARKERCOLORS: fillColor,
            SHAPELINECOLORS: borderColor,
            TRACKLINECOLORS: borderColor,
            TRACKMARKERSIZES: pointSize == null ? undefined : pointSize < 5 ? Math.min(3, pointSize) : pointSize - 2,
        };

        if (renderType === 'heatmap' && heatmapAttr != null) {
            requestParams = {
                ...requestParams,
                VAL_ATTR: heatmapAttr,
            }
        }

        if (wkt !== '') {
            requestParams.GEO_ATTR = wkt;
            // remove X_ATTR and Y_ATTR
            delete requestParams.X_ATTR;
            delete requestParams.Y_ATTR;
        } else {
            requestParams.X_ATTR = longitude;
            requestParams.Y_ATTR = latitude;
            // remove GEO_ATTR
            delete requestParams.GEO_ATTR;
        }

        if (!(baseTable || view)) {
            return;
        }

        let olLayerExists = null;
        map.getLayers().forEach(lyr => {
            if (lyr.id === id) {
                olLayerExists = lyr;
            }
        });

        if (olLayer == null && olLayerExists != null) {
            // Do nothing the layer has already been added to openlayers but react state was not updated
        } else if (map == null) {
            // Do nothing when map object does not exist
        } else if (kineticaSettings == null || wmsApiUrl == null || authUsername == null || authPassword == null) {
            // Handle case of invalid data
            if (olLayer) {
                map.getLayers().remove(olLayer);
            }
        } else if (olLayer) {
            // Update
            if (prevProps.kineticaSettings != kineticaSettings) {
                const geoAttr = requestParams.GEO_ATTR;
                if (requestParams.GEO_ATTR && requestParams.GEO_ATTR.length > 0) {
                    delete requestParams.X_ATTR;
                    delete requestParams.Y_ATTR;
                } else {
                    delete requestParams.GEO_ATTR;
                }

                olLayer.getSource().updateParams(requestParams);
            }
            if (
                prevProps.wmsApiUrl != wmsApiUrl ||
                prevProps.authPassword != authPassword ||
                prevProps.authUsername != authUsername
            ) {
                olLayer.getSource().setImageLoadFunction(genImageLoadFunction(authUsername, authPassword, setError, componentName));
                olLayer.getSource().on('imageloaderror', genImageLoadErrorFunction(wmsApiUrl, authUsername, authPassword, requestParams, setError, componentName));
            }
            if (olLayer.getOpacity() != (opacity / 100)) {
                olLayer.setOpacity(opacity / 100);
            }
            if (olLayer.getMaxZoom() != (maxZoom)) {
                olLayer.setMaxZoom(maxZoom);
            }
            if (olLayer.getMinZoom() != (minZoom)) {
                olLayer.setMinZoom(minZoom);
            }
            if (olLayer.getVisible() != visible) {
                olLayer.setVisible(visible);
            }
        } else {
            const wmsSource = new OlImageWMS({
                url: wmsApiUrl,
                ratio: 1,
                params: requestParams,
                serverType: 'geoserver',
                crossOrigin: 'anonymous',
                imageLoadFunction: (image, src) => {
                    setError(componentName, '');
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
            wmsSource.on('imageloaderror', genImageLoadErrorFunction(wmsApiUrl, authUsername, authPassword, requestParams, setError, componentName));

            const newOlLayer = new OlImage({
                source: wmsSource,
                opacity: opacity / 100,
                minZoom: minZoom,
                maxZoom: maxZoom,
            });

            newOlLayer.id = id;

            console.log('KWmsOlLayer useEffect: insertAt:', index + 1, label);
            map.getLayers().insertAt(index + 1, newOlLayer);
            setOlLayer(newOlLayer);
        }
    }, [map, kineticaSettings, visible, opacity, minZoom, maxZoom, wmsApiUrl, authUsername, authPassword]);

    // Remove the map layer when this component is umounted
    useEffect(() => {
        return () => {
            setError(componentName, '');
            if (map && olLayer) {
                map.getLayers().remove(olLayer);
            }
        };
    }, []);

    return (
        <></>
    );
};