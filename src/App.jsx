import './App.css';
import { lazy, useEffect, useMemo, useState } from 'react';
import { GPUdb } from './lib/GPUdb';
import * as $ from 'jquery';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";

// Each example page, with the OpenLayers modules (and, for Example App, Handlebars) it uses, is
// downloaded only when it's opened. Layout shows a fallback while a page loads.
const ExampleApp = lazy(() => import('./pages/ExampleApp'));
const ExampleWmsOpenlayers = lazy(() => import('./pages/ExampleWmsOpenlayers'));
const ExampleWmsClassbreakOpenlayers = lazy(() => import('./pages/ExampleWmsClassbreakOpenlayers'));
const ExampleWmsHighlightOpenlayers = lazy(() => import('./pages/ExampleWmsHighlightOpenlayers'));
const ExampleWmsDifferentLayersAtDifferentZoomLevelsOpenlayers = lazy(() => import('./pages/ExampleWmsDifferentLayersAtDifferentZoomLevelsOpenlayers'));
const ExampleVtsOpenlayers = lazy(() => import('./pages/ExampleVtsOpenlayers'));
const ExampleWmsSpatialFilterOpenlayers = lazy(() => import('./pages/ExampleWmsSpatialFilterOpenlayers'));

function App() {
  const [kUser, setKUser] = useState(null);
  const [kPass, setKPass] = useState(null);
  const [kUrl, setKUrl] = useState(null);
  const [wmsLayer, setWmsLayer] = useState(null);
  const [vectorLayer, setVectorLayer] = useState(null);

  const loadConfig = () => {
    return $.ajax({
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
        if (textStatus !== 'abort') {
          console.log('Error loading config', errorThrown);
        }
      }
    });
  };

  // Load Config
  useEffect(() => {
    const request = loadConfig();
    // StrictMode mounts twice in development; abort the first request so the config (and the
    // wmsLayer object every example depends on) is only applied once
    return () => request.abort();
  }, []);

  // GPUdb client for the loaded config (undefined until it has a user); creating it doesn't
  // contact the server
  const gpudb = useMemo(() => {
    if (kUser == null || kPass == null) {
      return undefined;
    }
    return new GPUdb(kUrl, {
      timeout: 60000,
      username: kUser,
      password: kPass
    });
  }, [kUrl, kPass, kUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ExampleWmsOpenlayers wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleApp" element={<ExampleApp wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleWms" element={<ExampleWmsOpenlayers wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleWmsClassbreak" element={<ExampleWmsClassbreakOpenlayers wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleWmsHighlight" element={<ExampleWmsHighlightOpenlayers wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleWmsMutlipleLayersAtDiffZooms" element={<ExampleWmsDifferentLayersAtDifferentZoomLevelsOpenlayers wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleVts" element={<ExampleVtsOpenlayers gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="exampleWmsSpatialFilter" element={<ExampleWmsSpatialFilterOpenlayers wmsLayer={wmsLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
          <Route path="*" element={<ExampleApp wmsLayer={wmsLayer} vectorLayer={vectorLayer} gpudb={gpudb} kUser={kUser} kPass={kPass} kUrl={kUrl} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
