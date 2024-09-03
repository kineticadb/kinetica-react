// import moment from "moment";
import * as d3 from "d3";
import * as $ from 'jquery';

export const d3Format = (format, value) => {
    return d3.format(format)(value);
};

export const base64ArrayBuffer = arrayBuffer => {
    let base64 = '';
    const encodings =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bytes = new Uint8Array(arrayBuffer);
    const byteLength = bytes.byteLength;
    const byteRemainder = byteLength % 5;
    const mainLength = byteLength - byteRemainder;
    let a;
    let b;
    let c;
    let d;
    let chunk;
    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
        d = chunk & 63; // 63       = 2^6 - 1
        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }
    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
        chunk = bytes[mainLength];
        a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
        // Set the 4 least significant bits to zero
        b = (chunk & 3) << 4; // 3   = 2^2 - 1
        base64 += encodings[a] + encodings[b] + '==';
    } else if (byteRemainder === 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
        a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4
        // Set the 2 least significant bits to zero
        c = (chunk & 15) << 2; // 15    = 2^4 - 1
        base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }
    return base64;
};

export const genImageLoadFunction = (authUsername, authPassword, setError, componentName) => {
    return (image, src) => {
        setError(componentName, '');
        const xhttp = new XMLHttpRequest();
        xhttp.open('GET', src, true);
        if (authUsername && authPassword) {
            xhttp.setRequestHeader(
                'Authorization',
                'Basic ' + btoa(`${authUsername}:${authPassword}`));
        }
        xhttp.responseType = 'arraybuffer';
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState === 4) {
                const arr = new Uint8Array(xhttp.response);
                const data = 'data:image/png;base64,' + base64ArrayBuffer(arr);
                image.getImage().src = data;
            }
        };
        xhttp.send();
    };
};

export const genImageLoadErrorFunction = (wmsApiUrl, authUsername, authPassword, requestParams, setError, componentName) => {
    return event => {
        const errorParams = {
            ...requestParams,
            HEIGHT: 100,
            WIDTH: 100,
            BBOX: '-10000,-10000,10000,10000',
        };

        // Make the same WMS request again to get the error message
        $.ajax({
            url: wmsApiUrl,
            type: 'GET',
            data: errorParams,
            headers: {
                'Authorization': 'Basic ' + btoa(`${authUsername}:${authPassword}`),
            },
            success: data => {
                // If error from endpoint, will be XML format
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data, 'text/xml');
                const node = xmlDoc.querySelectorAll('ServiceException');
                [].map.call(node, exception => {
                    setError(componentName, exception.textContent);
                    console.error(`imageloaderror (${componentName})`, exception.textContent);
                });
            },
            error: error => {
                // If error from map service, error is in response text
                if (error.responseText) {
                    setError(componentName, error.responseText);
                    console.error(`imageloaderror (${componentName})`, error.responseText);
                } else {
                    setError(componentName, `WMS request error to ${wmsApiUrl}`);
                }
            },
        });
    }
};