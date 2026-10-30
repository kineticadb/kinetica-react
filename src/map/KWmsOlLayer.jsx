import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as $ from 'jquery';
import OlImage from 'ol/layer/Image';
import OlImageWMS from 'ol/source/ImageWMS';
import {
    base64ArrayBuffer,
} from '../util';
import {
    WMS_PARAMS,
} from '../constants';

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

const genImageLoadErrorFunction = (wmsApiUrl, authUsername, authPassword, getRequestParams, setError, componentName) => {
    return event => {
        const errorParams = {
            ...getRequestParams(),
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

// Converts the layer's kineticaSettings into Kinetica WMS request parameters
const toRequestParams = (kineticaSettings) => {
    if (!kineticaSettings) {
        return null;
    }

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

    if (!(baseTable || view)) {
        return null;
    }

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
    } else {
        requestParams.X_ATTR = longitude;
        requestParams.Y_ATTR = latitude;
    }

    return requestParams;
};

export const KWmsOlLayer = (props) => {
    const { id, label, map, kineticaSettings, visible, opacity, minZoom, maxZoom, wmsApiUrl, authUsername, authPassword, setError, index } = props;
    const [olLayer, setOlLayer] = useState(null);
    const componentName = label ? `KWmsOlLayer-${label}` : 'KWmsOlLayer';
    const requestParams = useMemo(() => toRequestParams(kineticaSettings), [kineticaSettings]);
    const hasRequestParams = requestParams != null;

    // Map passes a new setError function on every render; read the latest through a ref so the
    // layer isn't rebuilt each time
    const setErrorRef = useRef(setError);
    useEffect(() => {
        setErrorRef.current = setError;
    });

    // Values the layer is created with; later changes are applied by the update effects below
    const initialRef = useRef();
    initialRef.current = { requestParams, opacity, minZoom, maxZoom, visible };

    // Create the layer, and remove it when the map, url or credentials change or on unmount
    useEffect(() => {
        if (!map || !hasRequestParams || wmsApiUrl == null || authUsername == null || authPassword == null) {
            return;
        }

        const { requestParams, opacity, minZoom, maxZoom, visible } = initialRef.current;
        const reportError = (name, msg) => setErrorRef.current(name, msg);
        const wmsSource = new OlImageWMS({
            url: wmsApiUrl,
            ratio: 1,
            params: requestParams,
            serverType: 'geoserver',
            crossOrigin: 'anonymous',
            imageLoadFunction: genImageLoadFunction(authUsername, authPassword, reportError, componentName),
        });
        wmsSource.on('imageloaderror', genImageLoadErrorFunction(wmsApiUrl, authUsername, authPassword, () => wmsSource.getParams(), reportError, componentName));

        const newOlLayer = new OlImage({
            source: wmsSource,
            opacity: opacity / 100,
            minZoom: minZoom,
            maxZoom: maxZoom,
            visible: visible,
        });

        newOlLayer.id = id;
        newOlLayer.kineticaRequestParams = requestParams;

        map.getLayers().insertAt(index + 1, newOlLayer);
        setOlLayer(newOlLayer);

        return () => {
            map.getLayers().remove(newOlLayer);
            reportError(componentName, '');
            setOlLayer(null);
        };
    }, [map, id, index, hasRequestParams, wmsApiUrl, authUsername, authPassword, componentName]);

    // Apply changed settings (e.g. a filter switching the view) to the existing layer
    useEffect(() => {
        if (olLayer && requestParams && olLayer.kineticaRequestParams !== requestParams) {
            olLayer.getSource().updateParams(requestParams);
            olLayer.kineticaRequestParams = requestParams;
        }
    }, [olLayer, requestParams]);

    useEffect(() => {
        olLayer?.setOpacity(opacity / 100);
    }, [olLayer, opacity]);

    useEffect(() => {
        olLayer?.setMinZoom(minZoom);
    }, [olLayer, minZoom]);

    useEffect(() => {
        olLayer?.setMaxZoom(maxZoom);
    }, [olLayer, maxZoom]);

    useEffect(() => {
        olLayer?.setVisible(visible);
    }, [olLayer, visible]);

    return (
        <></>
    );
};
