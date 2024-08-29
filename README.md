# Kinetica React/JavaScript Map Examples

This is an example project to show developers how to use Kinetica WMS, vector tiles, filters, and get/records with React and Openlayers. This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).  

## Examples

### Kinetica Wep Map Service(WMS) Example
[KWmsOlLayer.js](src/map/KWmsOlLayer.js) is a react component used to render Kinetica's WMS layers on an Openlayers map.  The code uses the `ol/source/ImageWMS` object to make Kinetica WMS requests with basic authentication headers.  The requestParams property contains all the necessary parameters for the WMS request.  More details about the necessary Kinetica WMS parameters can be found here: [Kinetica WMS Documentation](https://docs.kinetica.com/7.2/feature_overview/wms_feature_overview/)

The WMS layer configuration can be found in [config.json](public/config.json) under property `wmsLayer.kineticaSettings`.  The `kineticaSettings` objects is converted to Kinetica WMS request parameters in KWmsOlLayer.js

### Kinetica Vector Tiles Service(VTS) Example

[KVectorOlLayer.js](src/map/KVectorOlLayer.js) is a react component used to render Kinetica vector layers on an Openlayers map.  The code uses `ol/source/VectorTile` and configures the tileLoadFunction to make requests to Kinetica with basic authentication headers.  The `attributes` request parameter specifies the WKT column and any additional attributes to be included with each tile request.  These attributes can then be used for a map's info popup.  More details about Kinetica vector tiles can be found here: [Kinetica VTS Documentation](https://docs.kinetica.com/7.2/api/rest/vts_rest/)

The VTS layer configuration can be found in [config.json](public/config.json) under property `vectorLayer.kineticaSettings`.   The `kineticaSettings` object is converted to Kinetica VTS request parameters in KVectorOlLayers.js.


### Kinetica Filter Example

The `applyFilter` function in [App.js](src/App.js) performs a filter on a Kinetica table and creates a view for the WMS or VTS layers to render on the map.

### Display Kinetica Column Data Example

When a user clicks on the map, a map click event fires sending a REST call to Kinetica for the WMS table data using the `filterTableByRadius` function in [infoPopupHelper.js](src/map/infoPopupHelper.js).  

The vector tile layer already contains the table column data in the tiles and can be retrieved from the map using `map.forEachFeatureAtPixel` in [Map.js](src/map/Map.js)

## Initial Setup

Before running the application you will need to configure it and load the necessary tables into Kinetica. All configurations are done in [config.json](public/config.json).  

1. Set kUrl to the kinetica url i.e. http(s)://localhost:9191
2. Set kUser and kPass to a Kinetica user's username and password
3. Import the nyctaxi demo data in GAdmin
   1. Navigate to GAdmin from your browser
   2. Click Cluster(top panel) 
   3. Click Demo(left side panel) 
   4. Click Load Sample Data(green button under NYC Taxi)
4. Import [ki_home.us_states.csv](data/ki_home.us_states.csv) into Kinetica with workbench      
   1. Navigate to Kinetica workbench from your browser
   2. Click on the Files tab on the left
   3. Click the `+` under the Files tab and select "Upload New File"
   4. Select a folder and upload the [ki_home.us_states.csv](data/ki_home.us_states.csv).  
   5. After the file uploads to workbench, click the "Import" button
   6. Click the Next button twice to reach the "Destination" step.  
   7. Fill in the schema as ki_home and leave the table name as us_states
   8. Click the purple Import button.

## Running Application

In the project directory, you can run:

### `npm install`

Installs all the necessary node dependencies

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Additional Scripts
[Create React Scripts](CREATE_REACT_APP.md)

## Notes

Note due to an issue in openlayers, this code will not work with openlayers 8.  Instead this project uses Openlayers 7.  See [ImageWMS imageLoadFunction asynchronous loading is broken](https://github.com/openlayers/openlayers/issues/15093)

<!-- Need openlayers 7 until this fix is released for 8, https://github.com/openlayers/openlayers/issues/15093, https://github.com/openlayers/openlayers/issues/15109 -->
`npm install ol@7.5.2`