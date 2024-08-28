export const DEFAULT_COLORMAP = 'jet';
export const DEFAULT_FILL_COLOR = '4a00e0';
export const DEFAULT_BORDER_COLOR = 'ca2c92';
export const DEFAULT_BLUR_RADIUS = '2';
export const DEFAULT_HEATMAP_ATTR = '';
export const DEFAULT_POINT_SIZE = '2';
export const DEFAULT_WIDTH = '1';
export const DEFAULT_OPACITY = 90;
export const DEFAULT_MAX_ZOOM = 28;
export const DEFAULT_MIN_ZOOM = 0;

export const WMS_PARAMS = {
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    SRS: 'EPSG:3857',
    CRS: 'EPSG:3857',
};

export const MAP_CLICK_PIXEL_RADIUS = 10;

export const INFO_MODAL_FETCH_LIMIT = 100;
export const INFO_MODAL_MAX_CONTENT_LENGTH = 64;
export const INFO_MODAL_MAX_COLUMNS_TO_SHOW = 70;


export const COLORMAPS = [
    'viridis',
    'inferno',
    'plasma',
    'magma',
    'Blues',
    'BuGn',
    'BuPu',
    'GnBu',
    'Greens',
    'Greys',
    'Oranges',
    'OrRd',
    'PuBu',
    'PuBuGn',
    'PuRd',
    'Purples',
    'RdPu',
    'Reds',
    'YlGn',
    'YlGnBu',
    'YlOrBr',
    'YlOrRd',
    'afmhot',
    'autumn',
    'bone',
    'cool',
    'copper',
    'gist_heat',
    'gray',
    'gist_gray',
    'gist_yarg',
    'binary',
    'hot',
    'pink',
    'spring',
    'summer',
    'winter',
    'BrBG',
    'bwr',
    'coolwarm',
    'PiYG',
    'PRGn',
    'PuOr',
    'RdBu',
    'RdGy',
    'RdYlBu',
    'RdYlGn',
    'Spectral',
    'seismic',
    'Accent',
    'Dark2',
    'Paired',
    'Pastel1',
    'Pastel2',
    'Set1',
    'Set2',
    'Set3',
    'gist_earth',
    'terrain',
    'ocean',
    'gist_stern',
    'brg',
    'CMRmap',
    'cubehelix',
    'gnuplot',
    'gnuplot2',
    'gist_ncar',
    'spectral',
    'nipy_spectral',
    'jet',
    'rainbow',
    'gist_rainbow',
    'hsv',
    'flag',
    'prism',
].sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
});

