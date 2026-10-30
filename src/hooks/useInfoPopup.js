import { useEffect, useState, useCallback } from 'react';
import {
    INFO_MODAL_FETCH_LIMIT,
} from '../constants';
import InfoPopupHelper from '../map/infoPopupHelper';

// The layer the popup opens on: the first one that has data at the click
const findLayerWithData = (infoLayers) => infoLayers?.find(lyr => !lyr.queriedData || lyr.qualified_view_name != null);

export const useInfoPopup = function ({ gpudb, infoLayers, radius, coordinate, columns }) {

    const [pageNumber, setPageNumber] = useState(1);
    const [displayedPageNumber, setDisplayedPageNumber] = useState(1);
    // Records fetched for a WMS layer; vector layers carry their records with them
    const [fetchedRecords, setFetchedRecords] = useState(undefined);
    const [selectedLayer, setSelectedLayer] = useState(() => findLayerWithData(infoLayers));
    const [localInfoLayers, setLocalInfoLayers] = useState(infoLayers?.map(lyr => lyr));
    const [isLoading, setIsLoading] = useState(false);

    // A new click (new infoLayers) starts over on the first layer with data. Adjusting state while
    // rendering avoids first rendering the previous click's layer and records.
    const [prevInfoLayers, setPrevInfoLayers] = useState(infoLayers);
    if (infoLayers !== prevInfoLayers) {
        setPrevInfoLayers(infoLayers);
        setLocalInfoLayers(infoLayers?.map(lyr => lyr));
        setSelectedLayer(findLayerWithData(infoLayers));
        setPageNumber(1);
        setDisplayedPageNumber(1);
        setFetchedRecords(undefined);
    }

    const records = selectedLayer?.vectorLayerType ? selectedLayer.records : fetchedRecords;

    // Shows `page` and, when it is a valid page number, switches to it
    const showPage = (page) => {
        setDisplayedPageNumber(page);
        if (!isNaN(page)
            && page >= 1
            && page <= (parseInt(records?.total_number_of_records / INFO_MODAL_FETCH_LIMIT) + 1)) {
            setPageNumber(page);
        }
    };

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
            setFetchedRecords(undefined);
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
                setFetchedRecords(undefined);
            } catch (error) {
                console.error('Error querying layer', newSelectedLayer.view, error.message);
            } finally {
                setIsLoading(false);
            }
        } else {
            setSelectedLayer(newSelectedLayer);
            setPageNumber(1);
            setDisplayedPageNumber(1);
            setFetchedRecords(undefined);
        }
    }, [localInfoLayers, radius, selectedLayer, coordinate, gpudb]);

    // Fetch the selected WMS layer's records for the current page
    useEffect(
        _ => {
            const table = selectedLayer?.qualified_view_name;
            if (!gpudb || !table || selectedLayer.vectorLayerType) {
                return;
            }
            // Ignore the result if the layer or page has changed by the time it arrives
            let cancelled = false;
            async function fetchData(table, columns) {
                try {
                    const records = await gpudb.get_records(
                        table,
                        (pageNumber - 1) * INFO_MODAL_FETCH_LIMIT,
                        INFO_MODAL_FETCH_LIMIT,
                        {}
                    );
                    if (!cancelled) {
                        setFetchedRecords(records);
                    }
                } catch (error) {
                    console.error('Error getting records', table, error.message);
                    if (!cancelled) {
                        setFetchedRecords(undefined);
                    }
                }
            }
            fetchData(table, columns);
            return () => {
                cancelled = true;
            };
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
        setDisplayedPageNumber: showPage,
        setPageNumber,
    };
}
