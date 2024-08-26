const InfoPopupHelper = (function () {
    const infoDef = {
        checkMapLayerDataAtLocation: async (gpudb, layers, clickLon, clickLat, radius) => {
            let resultLayers = [];
            if (layers) {
                let done = false;
                for (let lyrIndex = 0; lyrIndex < layers.length; lyrIndex++) {
                    const currLayer = layers[lyrIndex];
                    const { queriedData, vectorLayerType, records } = currLayer;
                    if (queriedData == null && vectorLayerType != null) {
                        if (records) {
                            resultLayers.push({ ...layers[lyrIndex] });
                        }
                    } else if (queriedData == null && !done) {
                        let resultLayer = await infoDef.checkSingleMapLayerDataAtLocation(gpudb, currLayer, clickLon, clickLat, radius);
                        if (resultLayer.count) {
                            done = true;
                        }
                        resultLayers.push(resultLayer);
                    } else {
                        resultLayers.push({ ...layers[lyrIndex] });
                    }
                }
            }
            return resultLayers;
        },
        checkSingleMapLayerDataAtLocation: async (gpudb, layer, clickLon, clickLat, radius) => {
            const { view, lonColumn, latColumn, wktColumn, queriedData } = layer;
            if (queriedData == null) {
                const data = await infoDef.filterTableByRadius(gpudb, view, lonColumn, latColumn, wktColumn, clickLon, clickLat, radius);
                const { count } = data;
                const { qualified_view_name } = data?.info;
                if (count > 0) {
                    return {
                        ...layer,
                        queriedData: true,
                        qualified_view_name,
                        count,
                    };
                } else {
                    await gpudb.clear_table(qualified_view_name, '', {
                        no_error_if_not_exists: 'true',
                    });
                }
            }
            return {
                ...layer,
                queriedData: true,
                qualified_view_name: null,
                count: 0,
            };
        },
        filterTableByRadius: async (gpudb, table, tableLonCol, tableLatCol, tableWktCol, lonCol, latCol, radius) => {
            const spatialExpression = tableLonCol && tableLonCol != '' && tableLatCol && tableLatCol != '' ? infoDef.buildGeoDistExpr(lonCol, latCol, tableLonCol, tableLatCol, radius) :
                infoDef.buildSTXYDWithinExpr(lonCol, latCol, tableWktCol, radius);

            return await gpudb.filter(table, '', spatialExpression, {
                ttl: '10',
                create_temp_table: 'true',
            });
        },
        buildGeoDistExpr: (lon, lat, lonCol, latCol, radius) => {
            return `GEODIST(${lon}, ${lat}, ${lonCol}, ${latCol}) <= ${radius}`;
        },
        buildSTXYDWithinExpr: (lon, lat, wktCol, radius) => {
            return `STXY_DWITHIN(${lon}, ${lat}, ${wktCol}, ${radius}, 1) = 1`;
        },
        getClickRadius: (extentMaxLon, extentMinLon, containerWidth, mapClickPixelRadius) => {
            const mapWidth = extentMaxLon - extentMinLon;
            return mapWidth * (mapClickPixelRadius / containerWidth);
        },
    };

    return infoDef;
}());

export default InfoPopupHelper;