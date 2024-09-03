import './App.css';
import React, { useEffect, useState } from 'react';
import { GPUdb } from './lib/GPUdb';
import * as $ from 'jquery';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import ExampleApp from './pages/ExampleApp';
import ExampleWmsOpenlayers from './pages/ExampleWmsOpenlayers';
import ExampleWmsClassbreakOpenlayers from './pages/ExampleWmsClassbreakOpenlayers';
import ExampleVtsOpenlayers from './pages/ExampleVtsOpenlayers';
import ExampleWmsSpatialFilterOpenlayers from './pages/ExampleWmsSpatialFilterOpenlayers';

function App() {
  const [kUser, setKUser] = useState(null);
  const [kPass, setKPass] = useState(null);
  const [kUrl, setKUrl] = useState(null);
  const [gpudb, setGpudb] = useState(undefined);
  const [wmsLayer, setWmsLayer] = useState(null);
  const [vectorLayer, setVectorLayer] = useState(null);

  const loadConfig = () => {
    $.ajax({
      url: '/config.json',
      success: (config) => {
        setKUser(config.kUser);
        setKPass(config.kPass);
        setKUrl(config.kUrl);
        if (config.vectorLayer) {
          setVectorLayer(config.vectorLayer);
        }

        if (config.wmsLayer) {
          setWmsLayer(config.wmsLayer);
        }

      },
      error: (xhr, textStatus, errorThrown) => {
        console.log('Error loading config', errorThrown);
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ExampleWmsOpenlayers wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleApp" element={<ExampleApp wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleWms" element={<ExampleWmsOpenlayers wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleWmsClassbreak" element={<ExampleWmsClassbreakOpenlayers wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleVts" element={<ExampleVtsOpenlayers gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleWmsSpatialFilter" element={<ExampleWmsSpatialFilterOpenlayers wmsLayer={wmsLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="*" element={<ExampleApp wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
