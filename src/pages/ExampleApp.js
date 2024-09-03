// import './App.css';
import React, { useEffect, useState } from 'react';
import Map from '../map/Map'
import { GPUdb } from '../lib/GPUdb';
import * as $ from 'jquery';



function ExampleApp(props) {

    const { kUser, kPass, kUrl, gpudb, vectorLayer, wmsLayer } = props;
    const [errorMsg, setErrorMsg] = useState(undefined);
    const [wmsErrorMsg, setWmsErrorMsg] = useState(undefined);
    const [mapLayers, setMapLayers] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);


    useEffect(() => {
        const configMapLayers = [];
        if (vectorLayer) {
            configMapLayers.push(vectorLayer);
        }

        if (wmsLayer) {
            configMapLayers.push(wmsLayer);
        }

        setMapLayers(configMapLayers);
        if (configMapLayers.length > 0) {
            setSelectedTable(configMapLayers[0].id);
        }
        setErrorMsg(null);
    }, [vectorLayer, wmsLayer]);

    const createLayerFiltersStmt = (expression, origTable, newViewName) => {
        let _expr = expression;
        if (_expr.endsWith(';')) {
            _expr = _expr.substring(0, _expr.length - 1);
        }
        let stmt = `SELECT * FROM ${origTable}`;
        if (_expr.length > 0) {
            stmt += ' WHERE ';
        }
        if (_expr.length > 0) {
            stmt += _expr;
        }

        stmt = `create or replace temp materialized view ${newViewName} as (${stmt}) using table properties (ttl=3)`;
        return stmt;
    };


    const applyFilter = () => {
        if (mapLayers && mapLayers.length > 0) {
            const whereField = document.getElementById('where-field');
            const origTableName = mapLayers.filter((lyr) => lyr.id == selectedTable)[0].kineticaSettings.baseTable;
            const newView = origTableName + '_temp';
            const expression = createLayerFiltersStmt(
                whereField.value,
                origTableName,
                newView
            );
            const thisSelectTable = selectedTable;

            gpudb.execute_sql(expression, 0, 1, null, null, {}, (err, data) => {
                console.log(err, data);
                if (err) {
                    setErrorMsg(err.message);
                } else {
                    const newMapLayers = mapLayers.map((lyr, index) => {
                        if (lyr.id === thisSelectTable) {
                            return {
                                ...lyr,
                                kineticaSettings: {
                                    ...lyr.kineticaSettings,
                                    view: newView
                                }
                            };
                        }
                        return lyr;
                    });

                    setMapLayers(newMapLayers);
                    setErrorMsg(null);
                }
            });
        }
    };
    const onKeyDownHandler = (e) => {
        if (e.keyCode === 13) {
            applyFilter();
        }
    };

    const handleTableSelected = (e) => {
        setSelectedTable(e.target.value);
    };

    const filterLayerOptions = mapLayers.map((lyr) => <option value={lyr.id}>{lyr.label}</option>);

    return (
        <div style={{ width: "100%", height: "100%" }}>
            {gpudb && kUser && mapLayers && mapLayers.length > 0 ? (
                <Map
                    kUser={kUser}
                    kPass={kPass}
                    kUrl={kUrl}
                    gpudb={gpudb}
                    mapLayers={mapLayers}
                    setError={setWmsErrorMsg}
                />
            ) : null}
            <div className="filter-box">
                <div className="form-group row">
                    <label className="col-sm-1 col-form-label">
                        Where Clause:
                    </label>
                    <div className="col-sm-8">
                        <input
                            onKeyDown={onKeyDownHandler}
                            type="text"
                            className="form-control"
                            id="where-field"
                            placeholder="Enter Where clause"
                        />
                    </div>
                    <div className="col-sm-2">
                        <select
                            name="tableSelectedField"
                            className="form-control"
                            id="table-select-field"
                            value={selectedTable}
                            onChange={handleTableSelected}
                        >
                            {filterLayerOptions}
                        </select>
                    </div>
                    <div className="col-sm-1 ">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={applyFilter}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
            {(errorMsg != null || wmsErrorMsg != null) && (
                <div className="error-box">
                    <div className="card" style={{ width: '18rem;' }}>
                        <div className="card-body">
                            <h5 className="card-title">Error:</h5>
                            {errorMsg != null && (
                                <p className="card-text">{errorMsg}</p>
                            )}
                            {wmsErrorMsg != null && (
                                <p className="card-text">{wmsErrorMsg}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExampleApp;
