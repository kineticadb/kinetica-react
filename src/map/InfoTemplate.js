import React, { useEffect, useState } from 'react';
import {
    CaretLeftFill,
    CaretRightFill,
} from 'react-bootstrap-icons';
import {
    Dropdown,
    DropdownButton,
} from 'react-bootstrap';
import {
    INFO_MODAL_FETCH_LIMIT,
} from '../constants';
import Handlebars from "handlebars";
import { d3Format } from '../util';

const InfoTemplate = (props) => {
    const {
        pageNumber,
        records,
        selectedLayer,
        localInfoLayers,
        isLoading,
        handleLayerSelected,
        setPageNumber,
        popupTemplate,
        coordinate,
        close
    } = props;

    const [recordNumber, setRecordNumber] = useState(0);

    useEffect(() => {
        setRecordNumber(0);
    }, [selectedLayer, coordinate]);

    const decrementRecordNumber = () => {
        if (recordNumber > 0) {
            const newRecordNumber = recordNumber - 1;
            setRecordNumber(newRecordNumber);
            // Calculate the page number
            const newPageNumber = Math.floor(newRecordNumber / INFO_MODAL_FETCH_LIMIT) + 1;
            if (pageNumber != newPageNumber) {
                setPageNumber(newPageNumber);
            }
        }
    };

    const incrementRecordNumber = () => {
        if (recordNumber + 1 < records?.total_number_of_records) {

            const newRecordNumber = recordNumber + 1;
            setRecordNumber(newRecordNumber);
            // Calculate the page number
            const newPageNumber = Math.floor(newRecordNumber / INFO_MODAL_FETCH_LIMIT) + 1;
            if (pageNumber != newPageNumber) {
                setPageNumber(newPageNumber);
            }
        }
    };

    const pageRecordNumber = recordNumber % INFO_MODAL_FETCH_LIMIT;
    Handlebars.registerHelper('d3Format', d3Format);
    const template = Handlebars.compile(popupTemplate ? popupTemplate : '');
    const popupHtml = template(records?.data[pageRecordNumber]);

    const layerSelectOptsDropDown = localInfoLayers?.map((lyr) => (<Dropdown.Item
        key={lyr.id}
        onClick={() => { handleLayerSelected(lyr.id); }}
        value={lyr.id}>
        {lyr.label}
    </Dropdown.Item>));

    const loadingPanel = isLoading ? <div style={{
        position: 'fixed',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        top: '0',
        left: '0',
        opacity: '0.7',
        backgroundColor: '#fff',
        zIndex: '99',
        fontWeight: "bold",
    }}>Loading....</div> : null;

    return (
        <div style={{ "height": "523px" }}>
            {!isLoading && selectedLayer && (<div class="card ">
                <div class="card-header">
                    <h4 class="my-0 font-weight-normal">{selectedLayer?.label}</h4>
                </div>
                <div class="card-body" style={{ "height": "383px" }}>
                    <div class="text-center">
                        <div class="row">
                            <div class="col" style={{ "textAlign": "left" }}>
                                {selectedLayer && <DropdownButton
                                    id="select-info-layer"
                                    variant="dark"
                                    title={selectedLayer.label}
                                    size="sm"
                                >
                                    {layerSelectOptsDropDown}
                                </DropdownButton>}
                            </div>

                            <div class="col" style={{ "textAlign": "right" }}>

                                {coordinate && (
                                    <span style={{ float: 'right', marginRight: '16px' }}>
                                        Location:{' '}
                                        <strong>
                                            {coordinate.map(val => val.toPrecision(8)).join(', ')}
                                        </strong>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div class="row">
                            <div class="col" style={{ "textAlign": "left" }}>
                                {records == null && <div className="info_grid info_grid_no_records">
                                    No Records
                                </div>}
                                {records && <div className="info_grid" style={{ "overflowY": "auto" }}>
                                    <div style={{ "height": "100%" }} dangerouslySetInnerHTML={{ __html: popupHtml }}></div>
                                </div>}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col" style={{ "textAlign": "left" }}>
                    </div>
                    <div class="col" style={{ "textAlign": "center" }}>
                        {records && <div>
                            <CaretLeftFill
                                onClick={_ => {
                                    decrementRecordNumber();
                                }}
                            />
                            <strong>{recordNumber + 1} / {records?.total_number_of_records}</strong>
                            <CaretRightFill
                                onClick={_ => {
                                    incrementRecordNumber();
                                }}
                            />
                        </div>}
                    </div>
                    <div class="col" style={{ "textAlign": "right" }}>
                    </div>
                </div>
                <div class="card-footer">
                    <a href="#" class="btn btn-primary" onClick={_ => close()}>Close</a>
                </div>
            </div>)}
            {loadingPanel}
        </div>
    );
};

export default InfoTemplate;
