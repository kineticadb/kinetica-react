// import './App.css';
import React, { useMemo, useState } from 'react';
import Map from '../map/Map'
import { createLayerFiltersStmt } from '../filterHelper';



function ExampleApp(props) {

    const { kUser, kPass, kUrl, gpudb, vectorLayer, wmsLayer } = props;
    const [errorMsg, setErrorMsg] = useState(undefined);
    const [wmsErrorMsg, setWmsErrorMsg] = useState(undefined);
    // The view each layer has been filtered to by "Apply", by layer id
    const [filteredViews, setFilteredViews] = useState({});
    const [chosenTable, setChosenTable] = useState(null);

    // The config's layers, pointed at their filtered views
    const mapLayers = useMemo(() => [vectorLayer, wmsLayer].filter(Boolean).map((lyr) => (
        filteredViews[lyr.id] ? { ...lyr, kineticaSettings: { ...lyr.kineticaSettings, view: filteredViews[lyr.id] } } : lyr
    )), [vectorLayer, wmsLayer, filteredViews]);
    const selectedTable = chosenTable ?? mapLayers[0]?.id ?? null;

    const applyFilter = () => {
        if (mapLayers && mapLayers.length > 0) {
            const whereField = document.getElementById('where-field');
            const origTableName = mapLayers.filter((lyr) => lyr.id === selectedTable)[0].kineticaSettings.baseTable;
            // Unique per filter so concurrent users don't replace each other's view; ttl=3 cleans it up
            const randomNumber = Math.floor(Math.random() * 1000000000) + 1;
            const newView = `${origTableName}_temp_${randomNumber}`;
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
                    setFilteredViews(views => ({ ...views, [thisSelectTable]: newView }));
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
        setChosenTable(e.target.value);
    };

    const filterLayerOptions = mapLayers.map((lyr) => <option key={lyr.id} value={lyr.id}>{lyr.label}</option>);

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
                    <label htmlFor="where-field" className="col-sm-1 col-form-label">
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
                            className="form-select"
                            id="table-select-field"
                            value={selectedTable ?? ''}
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
                    <div className="card" style={{ width: '18rem' }}>
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
