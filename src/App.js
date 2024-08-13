import './App.css';
import React, { useEffect, useState } from 'react';
import Map from './map/Map'
import { GPUdb } from './lib/GPUdb';
import * as $ from 'jquery';

function App() {
  const [kUser, setKUser] = useState(null);
  const [kPass, setKPass] = useState(null);
  const [kUrl, setKUrl] = useState(null);
  const [gpudb, setGpudb] = useState(undefined);
  const [errorMsg, setErrorMsg] = useState(undefined);
  const [wmsErrorMsg, setWmsErrorMsg] = useState(undefined);
  const [mapLayers, setMapLayers] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);


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
    console.log('createLayerFiltersStmt: ', stmt);
    return stmt;
  };

  const loadConfig = () => {
    $.ajax({
      url: '/config.json',
      success: (config) => {
        const configMapLayers = [];
        if (config.vectorLayer) {
          configMapLayers.push(config.vectorLayer);
        }

        if (config.wmsLayer) {
          configMapLayers.push(config.wmsLayer);
        }

        console.log('loaded config', config);
        setKUser(config.kUser);
        setKPass(config.kPass);
        setKUrl(config.kUrl);
        setMapLayers(configMapLayers);
        setSelectedTable(configMapLayers[0].id);
        setErrorMsg(null);
      },
      error: (xhr, textStatus, errorThrown) => {
        console.log('Error loading config', errorThrown);
        setErrorMsg(
          'Config.json load error: ' + errorThrown.toString()
        );
      }
    });
  };

  // Load Config
  useEffect(() => {
    if (kUser === null) {
      loadConfig();
    }
  }, []);

  // Initialize GPUdb object
  useEffect(() => {
    const options = {
      timeout: 60000,
      username: kUser,
      password: kPass
    };
    if (kUser == null || kPass == null) {
      console.log('No user available skipping');
      return;
    }

    const gpudb = new GPUdb(kUrl, options);
    setGpudb(gpudb);
  }, [kUrl, kPass, kUser]);

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

  console.log(kUrl, kUser, kPass, mapLayers);
  const filterLayerOptions = mapLayers.map((lyr) => <option value={lyr.id}>{lyr.label}</option>);

  return (
    <div className="App">
      {kUser && mapLayers && mapLayers.length > 0 ? (
        <Map
          kUser={kUser}
          kPass={kPass}
          kUrl={kUrl}
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

export default App;
