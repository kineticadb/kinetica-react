import React, { useEffect, useState } from 'react';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlLayerTile from 'ol/layer/Tile';
import OlSourceOSM from 'ol/source/OSM';
import OlVectorTileLayer from 'ol/layer/VectorTile';
import OlVectorTile from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';

const ExampleVtsOpenlayers = (props) => {
    const { kUser: authUsername, kPass: authPassword, kUrl } = props;

    const mapId = 'map-container-id';

    const [infoStyle, setInfoStyle] = useState({});
    const [innerContent, setInnerContent] = useState(null);
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
            view: new OlView({
                center: [-9384737.043343076, 5607820.338040548],
                zoom: 3,
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
            const id = 'kineticaLayer-id1';
            const opacity = .9;
            const minZoom = 0;
            const maxZoom = 24;
            const visible = true;
            const vtsStyle = {
                'stroke-width': 0.6,
                'stroke-color': '#E69A8D',
                'fill-color': '#5F4B8B'
            };

            // Kinetica vts path
            const vtsApiUrl = `${kUrl}/vts`;
            // Kinetica table to visualize with vector tiles
            const table = 'ki_home.us_states';
            // Kinetica attributes to be included with the vector tile
            const attributes = ['WKT', 'NAME', 'GEOID'];
            // Create vector source using Kinetica vector tile service
            const vectorSource = new OlVectorTile({
                format: new MVT(),
                url: `${vtsApiUrl}/${table}/{z}/{x}/{y}?attributes=` + attributes.toString(),
                tileLoadFunction: async function (tile, url) {
                    tile.setLoader(function (extent, resolution, projection) {
                        fetch(url, {
                            headers: {
                                'Authorization': 'Basic ' + btoa(authUsername + ':' + authPassword)
                            },
                        }).then(function (response) {
                            response.arrayBuffer().then(function (data) {
                                const format = tile.getFormat();
                                const features = format.readFeatures(data, {
                                    extent: extent,
                                    featureProjection: projection
                                });
                                tile.setFeatures(features);
                            });
                        });
                    });
                },
            });

            const newOlLayer = new OlVectorTileLayer({
                declutter: true,
                source: vectorSource,
                style: vtsStyle,
                opacity: opacity,
                minZoom: minZoom,
                maxZoom: maxZoom,
                visible: visible,
            });

            newOlLayer.id = id;

            map.getLayers().push(newOlLayer);
            setOlLayer(newOlLayer);
        }

    }, [kUrl, mapRendered]);

    useEffect(() => {
        map.setTarget(mapId);
        // Dispay feature info when user hovers on feature
        const displayFeatureInfo = function (pixel, target) {
            const feature = target.closest('.ol-control')
                ? undefined
                : map.forEachFeatureAtPixel(pixel, function (feature) {
                    return feature;
                });
            if (feature) {
                const newInfoStyle = {
                    left: pixel[0] + 'px',
                    top: pixel[1] + 'px',
                    visibility: 'visible',
                };
                const newContent = feature.get('NAME');
                setInfoStyle(newInfoStyle);
                setInnerContent(newContent)
            } else {
                setInfoStyle({
                    visibility: 'hidden',
                });
            }
        };
        map.on('pointermove', function (evt) {
            if (evt.dragging) {
                setInfoStyle({
                    visibility: 'hidden',
                });
                return;
            }
            const pixel = map.getEventPixel(evt.originalEvent);
            displayFeatureInfo(pixel, evt.originalEvent.target);
        });

        return () => {
            map.setTarget(undefined);
        };
    }, []);


    return <div style={{ width: "100%", height: "100%" }}>
        <div id={mapId} className="map-container"></div>
        <div id="vector-info" style={infoStyle}>{innerContent}</div>
    </div>;
};

export default ExampleVtsOpenlayers; 