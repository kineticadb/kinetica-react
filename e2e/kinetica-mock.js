// Stands in for the Kinetica server in end-to-end tests. Every request to Kinetica (:9191) is
// answered or aborted here, so tests never reach a real database, and config.json is served with a
// dummy password so the app creates its layers.
import fs from 'node:fs';

// Read from disk rather than fetched through the route, so no request is left in flight when a
// test that navigates ends
const CONFIG = JSON.parse(fs.readFileSync(new URL('../public/config.json', import.meta.url), 'utf8'));

// A 1x1 transparent PNG, returned for every WMS image request
const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
);

// A successful Kinetica REST response wrapping `data`, as GPUdb.js expects
export const ok = (data) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'OK', data_type: 'none', data: '', data_str: JSON.stringify(data), message: '' }),
});

// A /get/records response returning `rows`
export const records = (rows) => ok({
    table_name: '',
    type_name: '',
    type_schema: '',
    records_binary: [],
    records_json: rows.map(row => JSON.stringify(row)),
    total_number_of_records: rows.length,
    has_more_records: false,
    info: {},
});

// An /execute/sql response for a statement that returns no rows (e.g. CREATE ... VIEW)
export const sqlDone = () => ok({
    count_affected: 0,
    response_schema_str: '',
    binary_encoded_response: '',
    json_encoded_response: '{}',
    total_number_of_records: 0,
    has_more_records: false,
    paging_table: '',
    info: {},
});

// Routes the page's Kinetica traffic to `handlers` ({ '/endpoint': call => response | null }).
// Unhandled endpoints are aborted, as if the server were unreachable. Returns the list of calls
// made, each { path, body, params }.
export async function mockKinetica(page, handlers = {}) {
    const calls = [];
    await page.route('**/config.json', route => route.fulfill({ json: { ...CONFIG, kPass: 'e2e-dummy' } }));
    await page.route(url => url.port === '9191', async route => {
        const url = new URL(route.request().url());
        const call = { path: url.pathname, body: route.request().postData() || '', params: url.searchParams };
        calls.push(call);
        if (url.pathname === '/wms') {
            return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
        }
        const response = handlers[url.pathname]?.(call);
        return response ? route.fulfill(response) : route.abort();
    });
    return calls;
}

// Records uncaught page errors and React warnings (console.error "Warning: ...")
export function collectErrors(page) {
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
        if (message.type() === 'error' && message.text().startsWith('Warning:')) {
            errors.push(message.text());
        }
    });
    return errors;
}

// Clicks the map at an offset (in pixels) from its center
export async function clickMap(page, dx = 0, dy = 0) {
    const box = await page.locator('#map-container-id').boundingBox();
    await page.mouse.click(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy);
}
