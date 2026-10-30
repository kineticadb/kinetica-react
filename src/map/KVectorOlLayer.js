import React, { useState, useEffect, useRef } from 'react';
import OlVectorTileLayer from 'ol/layer/VectorTile';
import OlVectorTile from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';

function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

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
    const prevProps = usePrevious({ id, label, map, kineticaSettings, style, visible, opacity, minZoom, maxZoom, vtsApiUrl, authUsername, authPassword });
    const [olLayer, setOlLayer] = useState(null);
    const componentName = label ? `KVectorOlLayer-${label}` : 'KVectorOlLayer';

    useEffect(() => {
        // Check if kineticaSettings is valid
        if (!kineticaSettings) {
            return;
        }

        // Create layer
        const {
            view,
            baseTable,
            attributes,
        } = kineticaSettings;

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
        } else if (kineticaSettings == null || authUsername == null || authPassword == null) {
            // Handle case of invalid data
            if (olLayer) {
                map.getLayers().remove(olLayer);
            }
        } else if (olLayer) {
            if (
                prevProps.kineticaSettings !== kineticaSettings ||
                prevProps.vtsApiUrl !== vtsApiUrl ||
                prevProps.authPassword !== authPassword ||
                prevProps.authUsername !== authUsername
            ) {
                // Note: Add a timestamp to the url to prevent hitting the cache
                olLayer.getSource().setUrl(`${vtsApiUrl}/${view}/{z}/{x}/{y}?attributes=${attributes.toString()}&chView=${new Date().getTime()}`);
                olLayer.getSource().setTileLoadFunction(genTileLoadFunction(authUsername, authPassword, setError, componentName));
            }
            if (olLayer.getOpacity() !== (opacity / 100)) {
                olLayer.setOpacity(opacity / 100);
            }
            if (olLayer.getMaxZoom() !== (maxZoom)) {
                olLayer.setMaxZoom(maxZoom);
            }
            if (olLayer.getMinZoom() !== (minZoom)) {
                olLayer.setMinZoom(minZoom);
            }
            if (olLayer.getVisible() !== visible) {
                olLayer.setVisible(visible);
            }
        } else {
            const vectorSource = new OlVectorTile({
                format: new MVT(),
                url: `${vtsApiUrl}/${view}/{z}/{x}/{y}?attributes=` + attributes.toString(),
                tileLoadFunction: genTileLoadFunction(authUsername, authPassword, setError, componentName),
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

            map.getLayers().insertAt(index + 1, newOlLayer);
            setOlLayer(newOlLayer);
        }
    }, [map, kineticaSettings, visible, opacity, minZoom, maxZoom, vtsApiUrl, authUsername, authPassword]);

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