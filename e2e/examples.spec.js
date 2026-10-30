import { test, expect } from '@playwright/test';
import { mockKinetica, ok, records, sqlDone, collectErrors, clickMap } from './kinetica-mock.js';

// Routes and dropdown labels, in the order Layout lists them
const EXAMPLES = [
    ['/exampleWms', 'WMS with info popup'],
    ['/exampleWmsClassbreak', 'Classbreak WMS'],
    ['/exampleWmsHighlight', 'Highlight with 2 WMS layers'],
    ['/exampleWmsMutlipleLayersAtDiffZooms', 'Zoom Level layers'],
    ['/exampleWmsSpatialFilter', 'Spatial Filter on Table'],
    ['/exampleVts', 'Vector Tiles'],
    ['/exampleApp', 'Example App'],
];

const count = (calls, path) => calls.filter(call => call.path === path).length;

// The map's click handler is registered by the same effect that adds the first WMS layer
const waitForWmsLayer = (calls) => expect.poll(() => count(calls, '/wms')).toBeGreaterThan(0);

test.describe('every example', () => {
    for (const [path, title] of EXAMPLES) {
        test(`${path} renders its map without errors`, async ({ page }) => {
            const errors = collectErrors(page);
            await mockKinetica(page);
            await page.goto(path);
            await expect(page.locator('#map-container-id .ol-viewport')).toHaveCount(1);
            await expect(page.locator('#dropdown-basic-button')).toHaveText(title);
            await page.waitForLoadState('networkidle');
            expect(errors).toEqual([]);
        });
    }

    test('the dropdown lists every example and navigates to one', async ({ page }) => {
        await mockKinetica(page);
        await page.goto('/');
        await expect(page.locator('#dropdown-basic-button')).toHaveText('Select Example');
        await page.locator('#dropdown-basic-button').click();
        const items = page.locator('.dropdown-menu.show .dropdown-item');
        await expect(items).toHaveText(EXAMPLES.map(([, title]) => title));
        await items.filter({ hasText: 'Vector Tiles' }).click();
        await expect(page).toHaveURL(/\/exampleVts$/);
        await expect(page.locator('#dropdown-basic-button')).toHaveText('Vector Tiles');
    });
});

test.describe('server-side setup', () => {
    test('config.json is applied once per load', async ({ page }) => {
        let applied = 0;
        page.on('requestfinished', request => { if (request.url().endsWith('/config.json')) applied++; });
        await mockKinetica(page);
        await page.goto('/exampleWmsHighlight');
        await page.waitForLoadState('networkidle');
        expect(applied).toBe(1);
    });

    for (const [path, endpoint, expected] of [
        ['/exampleWmsHighlight', '/execute/sql', 1],
        ['/exampleWmsSpatialFilter', '/execute/sql', 1],
        ['/exampleWmsMutlipleLayersAtDiffZooms', '/show/table', 2],
    ]) {
        test(`${path} sends ${endpoint} ${expected}x per load`, async ({ page }) => {
            const calls = await mockKinetica(page);
            await page.goto(path);
            await page.waitForLoadState('networkidle');
            expect(count(calls, endpoint)).toBe(expected);
        });
    }

    test('no WMS image is requested twice (layers are removed on cleanup)', async ({ page }) => {
        const calls = await mockKinetica(page);
        await page.goto('/exampleWms');
        await page.waitForLoadState('networkidle');
        const urls = calls.filter(call => call.path === '/wms').map(call => {
            const params = new URLSearchParams(call.params);
            params.delete('BBOX');
            return params.toString();
        });
        expect(urls.length).toBeGreaterThan(0);
        expect(new Set(urls).size).toBe(urls.length);
    });
});

test.describe('standalone popups', () => {
    for (const path of ['/exampleWms', '/exampleWmsClassbreak']) {
        test(`${path}: a click shows the record, closes cleanly, and keeps its radius after a resize`, async ({ page }) => {
            const calls = await mockKinetica(page, {
                '/get/records': () => records([{ vendor_id: 'YCAB', passenger_count: 2 }]),
            });
            await page.goto(path);
            await waitForWmsLayer(calls);

            // Click and return the radius sent to Kinetica; exactly one query per click
            const clickRadius = async () => {
                const before = calls.length;
                await clickMap(page);
                await expect.poll(() => count(calls.slice(before), '/get/records')).toBe(1);
                const query = calls.slice(before).find(call => call.path === '/get/records');
                return Number(query.body.match(/<=\s*([\d.]+)/)[1]);
            };

            const radius = await clickRadius();
            await expect(page.locator('#popup-content tr')).toHaveCount(2);
            await expect(page.locator('#popup-content')).toContainText('YCAB');
            await page.locator('#popup-closer').click();
            await expect(page.locator('#popup-content tr')).toHaveCount(0);
            expect(page.url()).not.toContain('#');

            // The radius is "5 pixels" in map units, so it must not change when the window resizes
            await page.setViewportSize({ width: 700, height: 1000 });
            await page.waitForTimeout(500);
            expect(await clickRadius()).toBeCloseTo(radius, 1);
        });
    }
});

test.describe('Example App', () => {
    test('a click opens the Handlebars popup even while vector tiles fail', async ({ page }) => {
        const errors = collectErrors(page);
        const calls = await mockKinetica(page, {
            '/filter': () => ok({ count: 1, info: { qualified_view_name: 'sys_temp.e2e_filter' } }),
            '/get/records': () => records([{
                pickup_longitude: -73.98, pickup_latitude: 40.74, passenger_count: 3,
                vendor_id: 'YCAB', fare_amount: 12.5, payment_type: 'Cash', trip_distance: 2.1,
            }]),
        });
        await page.goto('/exampleApp');
        await waitForWmsLayer(calls);

        // The aborted vector tiles produce an error box; it must not cover the dropdown or the popup
        await expect(page.locator('.error-box')).toContainText('Vector Layer Error');

        await clickMap(page);
        await expect(page.locator('.info_grid')).toContainText('Pickup Location: -73.98,40.74');
        await expect(page.locator('.card-header').first()).toHaveText('NYC Taxi');
        const overlaps = async (a, b) => {
            const [r1, r2] = [await page.locator(a).first().boundingBox(), await page.locator(b).first().boundingBox()];
            return r1.x < r2.x + r2.width && r2.x < r1.x + r1.width && r1.y < r2.y + r2.height && r2.y < r1.y + r1.height;
        };
        expect(await overlaps('.error-box', '.card-header')).toBe(false);
        expect(await overlaps('.error-box', '#dropdown-basic-button')).toBe(false);

        // The layer picker is a react-bootstrap dropdown
        await page.locator('#select-info-layer').click();
        await expect(page.locator('.dropdown-menu.show .dropdown-item')).toHaveText(['NYC Taxi']);
        await page.keyboard.press('Escape');

        await page.getByRole('button', { name: 'Close' }).click();
        await expect(page.locator('.card-header')).toHaveCount(0);
        expect(page.url()).not.toContain('#');
        expect(errors).toEqual([]);
    });

    test('Apply creates a uniquely named filter view and points the WMS layer at it', async ({ page }) => {
        const calls = await mockKinetica(page, { '/execute/sql': () => sqlDone() });
        await page.goto('/exampleApp');
        await waitForWmsLayer(calls);

        await page.selectOption('#table-select-field', 'nyc_taxi_id');
        await page.fill('#where-field', 'passenger_count > 5');
        await page.getByRole('button', { name: 'Apply' }).click();

        await expect.poll(() => count(calls, '/execute/sql')).toBe(1);
        const { statement } = JSON.parse(calls.find(call => call.path === '/execute/sql').body);
        expect(statement).toMatch(/^create or replace temp materialized view demo\.nyctaxi_temp_\d+ as \(SELECT \* FROM demo\.nyctaxi WHERE passenger_count > 5\) using table properties \(ttl=3\)$/);
        const view = statement.match(/view (\S+)/)[1];
        await expect.poll(() => calls.some(call => call.path === '/wms' && call.params.get('LAYERS') === view)).toBe(true);
    });
});
