import { base64ArrayBuffer } from './util';

// Every remainder case (length % 3 of 0, 1 and 2), checked against Node's own base64 encoder
test.each([...Array(21).keys()])('base64ArrayBuffer matches Buffer for %i bytes', (length) => {
    const bytes = Uint8Array.from({ length }, (_, i) => (i * 37 + 11) & 255);
    expect(base64ArrayBuffer(bytes.buffer)).toBe(Buffer.from(bytes).toString('base64'));
});
