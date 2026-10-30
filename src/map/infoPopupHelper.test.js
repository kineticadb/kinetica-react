import InfoPopupHelper from './infoPopupHelper';

// Fake GPUdb client: filter() reports `count` records in a temp table, as the real synchronous call does
const fakeGpudb = (count) => ({
    filter: vi.fn(() => ({ count, info: { qualified_view_name: 'sys_temp.filter_1' } })),
    clear_table: vi.fn(),
});

describe('expression builders', () => {
    test('GEODIST for lon/lat columns', () => {
        expect(InfoPopupHelper.buildGeoDistExpr(-74, 40.7, 'pickup_longitude', 'pickup_latitude', 500))
            .toBe('GEODIST(-74, 40.7, pickup_longitude, pickup_latitude) <= 500');
    });

    test('STXY_DWITHIN for a WKT column', () => {
        expect(InfoPopupHelper.buildSTXYDWithinExpr(-74, 40.7, 'WKT', 500))
            .toBe('STXY_DWITHIN(-74, 40.7, WKT, 500, 1) = 1');
    });

    test('click radius scales the map width by the pixel radius', () => {
        expect(InfoPopupHelper.getClickRadius(1000, 0, 500, 10)).toBe(20);
    });
});

describe('filterTableByRadius', () => {
    test('uses GEODIST when lon/lat columns are set', async () => {
        const gpudb = fakeGpudb(1);
        await InfoPopupHelper.filterTableByRadius(gpudb, 'demo.nyctaxi', 'lon', 'lat', '', -74, 40.7, 500);
        expect(gpudb.filter).toHaveBeenCalledWith('demo.nyctaxi', '', 'GEODIST(-74, 40.7, lon, lat) <= 500',
            { ttl: '10', create_temp_table: 'true' });
    });

    test('falls back to STXY_DWITHIN when lon/lat columns are empty', async () => {
        const gpudb = fakeGpudb(1);
        await InfoPopupHelper.filterTableByRadius(gpudb, 'ki_home.us_states', '', '', 'WKT', -74, 40.7, 500);
        expect(gpudb.filter.mock.calls[0][2]).toBe('STXY_DWITHIN(-74, 40.7, WKT, 500, 1) = 1');
    });
});

describe('checkMapLayerDataAtLocation', () => {
    const wms = (id) => ({ id, view: `demo.${id}`, lonColumn: 'lon', latColumn: 'lat' });

    test('keeps the temp table for a layer with matches', async () => {
        const gpudb = fakeGpudb(3);
        const [result] = await InfoPopupHelper.checkMapLayerDataAtLocation(gpudb, [wms('a')], -74, 40.7, 500);
        expect(result).toMatchObject({ id: 'a', queriedData: true, qualified_view_name: 'sys_temp.filter_1', count: 3 });
        expect(gpudb.clear_table).not.toHaveBeenCalled();
    });

    test('clears the temp table for a layer with no matches', async () => {
        const gpudb = fakeGpudb(0);
        const [result] = await InfoPopupHelper.checkMapLayerDataAtLocation(gpudb, [wms('a')], -74, 40.7, 500);
        expect(result).toMatchObject({ queriedData: true, qualified_view_name: null, count: 0 });
        expect(gpudb.clear_table).toHaveBeenCalledWith('sys_temp.filter_1', '', { no_error_if_not_exists: 'true' });
    });

    test('stops querying WMS layers after the first one with matches', async () => {
        const gpudb = fakeGpudb(3);
        const results = await InfoPopupHelper.checkMapLayerDataAtLocation(gpudb, [wms('a'), wms('b')], -74, 40.7, 500);
        expect(gpudb.filter).toHaveBeenCalledTimes(1);
        expect(results.map(r => r.queriedData)).toEqual([true, undefined]);
    });

    test('passes vector layers through only when they have features at the click', async () => {
        const gpudb = fakeGpudb(0);
        const withFeatures = { id: 'v1', vectorLayerType: 'vectorLayerType', records: { data: [{}], total_number_of_records: 1 } };
        const without = { id: 'v2', vectorLayerType: 'vectorLayerType' };
        const results = await InfoPopupHelper.checkMapLayerDataAtLocation(gpudb, [withFeatures, without], -74, 40.7, 500);
        expect(results.map(r => r.id)).toEqual(['v1']);
        expect(gpudb.filter).not.toHaveBeenCalled();
    });
});
