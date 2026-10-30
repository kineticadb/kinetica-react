import React from 'react';
import InfoTemplate from './InfoTemplate';
import { useInfoPopup } from '../hooks/useInfoPopup';

const Info = props => {
    const { id,
        gpudb,
        infoLayers,
        radius,
        width,
        coordinate,
        columns,
        calculatedField,
        calculatedFieldName,
        close,
    } = props;

    const {
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
    } = useInfoPopup({
        gpudb,
        infoLayers,
        radius,
        coordinate,
        columns,
        calculatedField,
        calculatedFieldName,
    });
    return (
        <div
            id={id}
            style={{
                height: '323px',
                width: `${width / 1.2 - 0}px`,
                padding: '10px',
                borderRadius: '5px',
                zIndex: 1000,
            }}
        >
            {
                infoLayers && (
                    <InfoTemplate
                        pageNumber={pageNumber}
                        displayedPageNumber={displayedPageNumber}
                        records={records}
                        selectedLayer={selectedLayer}
                        localInfoLayers={localInfoLayers}
                        isLoading={isLoading}
                        handleLayerSelected={handleLayerSelected}
                        decrementPageNumber={decrementPageNumber}
                        incrementPageNumber={incrementPageNumber}
                        setDisplayedPageNumber={setDisplayedPageNumber}
                        setPageNumber={setPageNumber}
                        width={width}
                        coordinate={coordinate}
                        popupTemplate={selectedLayer?.popupTemplate}
                        close={close}
                    />
                )
            }
        </div >
    );
};

export default Info;
