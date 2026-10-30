import React, { useState, useEffect, useRef, useMemo } from 'react';
import OlVectorTileLayer from 'ol/layer/VectorTile';
import OlVectorTile from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';

const genTileLoadFunction = (authUsername, authPassword, setError, componentName) => {
    return (tile, url) => {
        tile.setLoader(function (extent, resolution, projection) {
            fetch(url, {
                headers: {
                    'Authorization': 'Basic ' + btoa(authUsername + ':' + authPassword)
                },
            }).then(response => {
                if (!response.ok) {
                    // Error responses are text, not MVT; reading them as a tile throws
                    return response.text().then(body => {
                        throw new Error(`VTS request failed with HTTP ${response.status}: ${body.slice(0, 200)}`);
                    });
                }
                return response.arrayBuffer();
            }).then(data => {
                const format = tile.getFormat();
                const features = format.readFeatures(data, {
                    extent: extent,
                    featureProjection: projection
                });
                tile.setFeatures(features);
            }).catch(error => {
                // Mark the tile failed so OpenLayers stops waiting on it, and report the error
                tile.onError();
                setError(componentName, error.message);
                console.error(`tileloaderror (${componentName})`, error.message);
            });
        });
    };
};

export const KVectorOlLayer = (props) => {
    const { id, label, map, kineticaSettings, style, visible, opacity, minZoom, maxZoom, vtsApiUrl, authUsername, authPassword, setError, index } = props;
    const [olLayer, setOlLayer] = useState(null);
    const componentName = label ? `KVectorOlLayer-${label}` : 'KVectorOlLayer';

    // Tile url for the layer's view, or null if kineticaSettings doesn't name a table
    const tileUrl = useMemo(() => {
        const { view, baseTable, attributes } = kineticaSettings || {};
        if (!(baseTable || view) || vtsApiUrl == null) {
            return null;
        }
        return `${vtsApiUrl}/${view || baseTable}/{z}/{x}/{y}?attributes=` + (attributes || []).toString();
    }, [kineticaSettings, vtsApiUrl]);
    const hasTileUrl = tileUrl != null;

    // Map passes a new setError function on every render; read the latest through a ref so the
    // layer isn't rebuilt each time
    const setErrorRef = useRef(setError);
    useEffect(() => {
        setErrorRef.current = setError;
    });

    // Values the layer is created with; later changes are applied by the update effects below.
    // Declared before the create effect, so it runs first in each commit.
    const initialRef = useRef();
    useEffect(() => {
        initialRef.current = { tileUrl, style, opacity, minZoom, maxZoom, visible };
    });
    // Tile url the current layer is showing
    const appliedTileUrlRef = useRef(null);

    // Create the layer, and remove it when the map, url or credentials change or on unmount
    useEffect(() => {
        if (!map || !hasTileUrl || authUsername == null || authPassword == null) {
            return;
        }

        const { tileUrl, style, opacity, minZoom, maxZoom, visible } = initialRef.current;
        const reportError = (name, msg) => setErrorRef.current(name, msg);
        const vectorSource = new OlVectorTile({
            format: new MVT(),
            url: tileUrl,
            tileLoadFunction: genTileLoadFunction(authUsername, authPassword, reportError, componentName),
        });

        const newOlLayer = new OlVectorTileLayer({
            declutter: true,
            source: vectorSource,
            style: style,
            opacity: opacity / 100,
            minZoom: minZoom,
            maxZoom: maxZoom,
            visible: visible,
        });

        newOlLayer.id = id;
        appliedTileUrlRef.current = tileUrl;

        map.getLayers().insertAt(index + 1, newOlLayer);
        setOlLayer(newOlLayer);

        return () => {
            map.getLayers().remove(newOlLayer);
            reportError(componentName, '');
            setOlLayer(null);
        };
    }, [map, id, index, hasTileUrl, vtsApiUrl, authUsername, authPassword, componentName]);

    // Point the existing layer at a changed view (e.g. after a filter)
    useEffect(() => {
        if (olLayer && tileUrl && appliedTileUrlRef.current !== tileUrl) {
            // Note: Add a timestamp to the url to prevent hitting the cache
            olLayer.getSource().setUrl(`${tileUrl}&chView=${new Date().getTime()}`);
            appliedTileUrlRef.current = tileUrl;
        }
    }, [olLayer, tileUrl]);

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