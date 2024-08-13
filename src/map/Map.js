import React, { useEffect, useState } from 'react';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import OlLayerTile from 'ol/layer/Tile';
import OlSourceOSM from 'ol/source/OSM';
import { KWmsOlLayer } from './KWmsOlLayer';

function Map(props) {

    const { kUser, kPass, kUrl, mapLayers, setError } = props;

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
                center: [0, 0],
                zoom: 2,
            }),
        })
    );
    const [mapRendered, setMapRendered] = useState(false);

    // Initilize
    useEffect(() => {
        map.setTarget('map-container-id');
        setMapRendered(true);
        return () => {
            map.setTarget(undefined);
            setMapRendered(true);
        };
    }, []);

    const layersRender = (map && mapRendered && kUrl &&
        kUser && kPass && mapLayers ?
        mapLayers.map((lyr, index) => <KWmsOlLayer
            key={lyr.id}
            index={index}
            label={lyr.label}
            id={lyr.id}
            map={map}
            kineticaSettings={lyr.kineticaSettings}
            visible={lyr.visible}
            opacity={lyr.opacity}
            minZoom={lyr.minZoom}
            maxZoom={lyr.maxZoom}
            wmsApiUrl={kUrl + '/wms'}
            authUsername={kUser}
            authPassword={kPass}
            setError={(componentName, msg) => {
                if (setError && msg) {
                    setError("WMS Error: " + msg);
                } else {
                    setError(null);
                }
            }}
            datasource={null}
        />) : null
    );

    return (
        <div>
            <div id="map-container-id" className="map-container"></div>
            {layersRender}
        </div>
    )

}

export default Map;