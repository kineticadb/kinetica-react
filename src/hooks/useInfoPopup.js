import { useEffect, useState, useCallback } from 'react';
import {
    INFO_MODAL_FETCH_LIMIT,
} from '../constants';
import InfoPopupHelper from '../map/infoPopupHelper';

export const useInfoPopup = function ({ gpudb, infoLayers, radius, coordinate, columns }) {

    const [pageNumber, setPageNumber] = useState(1);
    const [displayedPageNumber, setDisplayedPageNumber] = useState(1);
    const [records, setRecords] = useState(undefined);
    const [selectedLayer, setSelectedLayer] = useState(null);
    const [localInfoLayers, setLocalInfoLayers] = useState(infoLayers?.map(lyr => lyr));
    const [isLoading, setIsLoading] = useState(false);

    const totalRecords = records?.total_number_of_records;
    useEffect(
        _ => {
            if (!isNaN(displayedPageNumber)
                && displayedPageNumber >= 1
                && displayedPageNumber <= (parseInt(totalRecords / INFO_MODAL_FETCH_LIMIT) + 1)) {
                setPageNumber(displayedPageNumber);
            }
        }, [displayedPageNumber, totalRecords]
    );

    useEffect(
        () => {
            const layerWithData = infoLayers?.find(lyr => !lyr.queriedData || lyr.qualified_view_name != null);

            setLocalInfoLayers(infoLayers?.map(lyr => lyr));
            setSelectedLayer(layerWithData);
            setPageNumber(1);
            setDisplayedPageNumber(1);
            setRecords(undefined);
        },
        [infoLayers]
    );


    const handleLayerSelected = useCallback(async (layerId) => {
        const newSelectedLayerIndex = localInfoLayers.findIndex((lyr) => lyr.id === layerId);
        const newSelectedLayer = localInfoLayers[newSelectedLayerIndex];

        if (selectedLayer.id === layerId) {
            // If same layer is selected, return to prevent unnecessary API calls
            return;
        }

        if (newSelectedLayer.records != null) {
            setIsLoading(false);
            setSelectedLayer(newSelectedLayer);
            setPageNumber(1);
            setDisplayedPageNumber(1);
            setRecords(newSelectedLayer.records);
        } else if (newSelectedLayer.queriedData == null) {
            // Find data around the click first since the layer has not been queried yet
            setIsLoading(true);
            try {
                let newLayer = await InfoPopupHelper.checkSingleMapLayerDataAtLocation(gpudb, newSelectedLayer, coordinate[0], coordinate[1], radius);
                let newLocalLayers = localInfoLayers.map((lyr, lyrIndex) => lyrIndex === newSelectedLayerIndex ? newLayer : lyr);
                setLocalInfoLayers(newLocalLayers);
                setSelectedLayer(newLayer);
                setPageNumber(1);
                setDisplayedPageNumber(1);
                setRecords(undefined);
            } catch (error) {
                console.error('Error querying layer', newSelectedLayer.view, error.message);
            } finally {
                setIsLoading(false);
            }
        } else {
            setSelectedLayer(newSelectedLayer);
            setPageNumber(1);
            setDisplayedPageNumber(1);
            setRecords(undefined);
        }
    }, [localInfoLayers, radius, selectedLayer, coordinate, gpudb]);

    useEffect(
        _ => {
            if (selectedLayer) {
                if (selectedLayer.vectorLayerType) {
                    setRecords(selectedLayer.records);
                } else {
                    let table = selectedLayer.qualified_view_name;
                    async function fetchData(table, columns) {
                        try {
                            const records = await gpudb.get_records(
                                table,
                                (pageNumber - 1) * INFO_MODAL_FETCH_LIMIT,
                                INFO_MODAL_FETCH_LIMIT,
                                {}
                            );
                            setRecords(records);
                        } catch (error) {
                            console.error('Error getting records', table, error.message);
                            setRecords(undefined);
                        }
                    }

                    if (gpudb && table) {
                        fetchData(table, columns);
                    } else {
                        setRecords(undefined);
                    }
                }

            }
        },
        [gpudb, selectedLayer, columns, pageNumber]
    );

    const decrementPageNumber = () => {
        if (pageNumber > 1) {
            setPageNumber(pageNumber - 1);
            setDisplayedPageNumber(pageNumber - 1);
        }
    };

    const incrementPageNumber = () => {
        if (pageNumber < parseInt(records?.total_number_of_records / INFO_MODAL_FETCH_LIMIT) + 1) {
            setPageNumber(pageNumber + 1);
            setDisplayedPageNumber(pageNumber + 1);
        }
    };

    return {
        pageNumber,
        displayedPageNumber,
        records,
        selectedLayer,
        localInfoLayers,
        isLoading,
        handleLayerSelected,
        decrementPageNumber,
        incrementPageNumber,
        setDisplayedPageNumber,
        setPageNumber,
    };
}