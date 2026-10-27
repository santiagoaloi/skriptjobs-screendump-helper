/**
 * Shared macOS Chrome Dark-Plum Mockup Renderer (@skriptjobs/ui compatible)
 *
 * Measured pixel-for-pixel from Santiago's reference screenshot (1711 x 1076):
 * - Top margin: 36px, Bottom margin: 62px, Left margin: 60px, Right margin: 86px (or 60px symmetric)
 * - Window corner radius: 12px
 * - Outer border: 1px #585a5f highlight + 1px #393344 inner rim
 * - Drop shadow: 0px X-offset, +20px Y-offset, sigma=16px (34px blur), 0.62 opacity
 * - Tab bar: 39px height (#231c2f), traffic lights (#ff5f57, #febc2e, #28c840),
 *   active tab (#3f384d) with Skriptjobs three-triangles favicon + title + close 'x', and '+' button (NO Ask Gemini)
 * - URL bar row: 46px height (#3f384d), full-width pill omnibox (#292335, 34px tall, rx=17)
 *   with circular Skriptjobs three-triangles logo badge at the start of the URL bar + full URL
 *   (NO back/forward/refresh, NO right toolbar icons)
 * - Bottom header divider: 1px solid #48444e
 */

export const CHROME_MOCKUP_THEME = {
  referenceCanvas: { width: 1711, height: 1076 },
  referenceWindow: { width: 1565, height: 978 },
  margins: {
    reference: { top: 36, bottom: 62, left: 60, right: 86 },
    symmetric: { top: 36, bottom: 62, left: 60, right: 60 },
  },
  windowRadius: 12,
  borderOuter: '#585a5f',
  borderInner: '#393344',
  shadow: {
    offsetX: 0,
    offsetY: 20,
    sigma: 16,
    blurCss: 34,
    alpha: 0.62,
  },
  header: {
    tabBarHeight: 39,
    toolbarHeight: 46,
    dividerHeight: 1,
    totalHeight: 86, // 39 + 46 + 1
    tabBarBg: '#231c2f',
    toolbarBg: '#3f384d',
    omniboxBg: '#292335',
    dividerColor: '#48444e',
    tabText: '#e6e0ee',
    tabClose: '#b8b0c4',
    newTabPlus: '#b8adc5',
    urlScheme: '#9e95ad',
    urlHost: '#f3eef8',
    urlPath: '#b8b0c8',
  },
  trafficLights: [
    { cx: 20, cy: 20.5, r: 6, fill: '#ff5f57', stroke: '#e0443e' },
    { cx: 43, cy: 20.5, r: 6, fill: '#febc2e', stroke: '#dfa023' },
    { cx: 66, cy: 20.5, r: 6, fill: '#28c840', stroke: '#1aab29' },
  ],
};

/**
 * Official Skriptjobs three-triangles mark polygons (from bimi-logo-dark.svg / logo-three-triangles.svg, viewBox 0 0 32 32).
 */
export function buildSkriptjobsTrianglesSvgGroup({
  x = 0,
  y = 0,
  size = 16,
  fill = '#ffffff',
  withDarkTile = false,
  tileFill = '#141318',
  tileStroke = '#4d455e',
}) {
  const scale = size / 32;
  const tileMarkup = withDarkTile
    ? `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${(size * 0.22).toFixed(2)}" fill="${tileFill}" stroke="${tileStroke}" stroke-width="0.6" />`
    : '';
  const innerSize = withDarkTile ? size * 0.76 : size;
  const innerOffset = withDarkTile ? (size - innerSize) / 2 : 0;
  const innerScale = innerSize / 32;

  return `${tileMarkup}
  <g transform="translate(${(x + innerOffset).toFixed(2)}, ${(y + innerOffset).toFixed(2)}) scale(${innerScale.toFixed(4)})" fill="${fill}" shape-rendering="geometricPrecision">
    <polygon points="16,3.2 22.6,14.5 9.4,14.5" />
    <polygon points="8.2,17.5 14.8,28.8 1.6,28.8" />
    <polygon points="23.8,17.5 30.4,28.8 17.2,28.8" />
  </g>`;
}

/**
 * Parse a URL string into { scheme, host, path } for styled rendering in the omnibox.
 */
export function splitUrlParts(rawUrl) {
  const str = String(rawUrl || 'https://docs.skriptjobs.localhost:3050').trim();
  const match = str.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)?([^/?#]+)(.*)$/);
  if (!match) {
    return { scheme: '', host: str, path: '' };
  }
  return {
    scheme: match[1] || '',
    host: match[2] || '',
    path: match[3] || '',
  };
}

/**
 * Escape XML special characters for SVG rendering.
 */
export function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build the crisp vector SVG for the simplified macOS Chrome header (width x 86px).
 * Includes:
 * - Row 1 (39px, #231c2f): macOS traffic lights, active tab (#3f384d) with Skriptjobs three-triangles favicon + title + close 'x', and '+' button. No Ask Gemini.
 * - Row 2 (46px, #3f384d): Clean pill URL bar (#292335) showing circular Skriptjobs three-triangles logo badge at the start + full URL. No back/forward/refresh, no right toolbar icons.
 * - Row 3 (1px, #48444e): Bottom divider line.
 */
export function buildChromeHeaderSvg({
  windowWidth = 1565,
  title = 'Installation - Skriptjobs',
  url = 'https://docs.skriptjobs.localhost:3050/getting-started/installation',
  faviconDataUrl = null,
}) {
  const T = CHROME_MOCKUP_THEME;
  const H = T.header.totalHeight; // 86
  const tabBarH = T.header.tabBarHeight; // 39
  const toolbarH = T.header.toolbarHeight; // 46

  // Active tab geometry (matches x=153..420 in ref image -> offset 93..360 from window left)
  const tabX = 93;
  const tabY = 6;
  const tabW = 267;
  const tabH = tabBarH - tabY; // 33
  const tabR = 10;
  const scoopR = 8;

  const displayTitle =
    title.length > 28 ? title.slice(0, 27).trimEnd() + '…' : title;

  const plusCx = tabX + tabW + 20; // 380
  const plusCy = tabY + tabH / 2; // 22.5

  // Omnibox geometry: clean full-width pill without left nav buttons or right extension buttons
  const omniX = 14;
  const omniY = tabBarH + 6; // 45
  const omniW = windowWidth - 28;
  const omniH = 34;
  const omniR = 17;

  const { scheme, host, path } = splitUrlParts(url);

  // Active Tab Favicon: Skriptjobs three-triangles favicon tile (or custom faviconDataUrl if explicitly passed)
  const tabFaviconMarkup = faviconDataUrl
    ? `<image href="${escapeXml(faviconDataUrl)}" x="${tabX + 14}" y="${tabY + 8.5}" width="16" height="16" />`
    : buildSkriptjobsTrianglesSvgGroup({
        x: tabX + 14,
        y: tabY + 8.5,
        size: 16,
        fill: '#ffffff',
        withDarkTile: true,
        tileFill: '#141318',
        tileStroke: '#524963',
      });

  // Omnibox Start Badge: Circular badge at (omniX + 17, omniY + 17) with the Skriptjobs three-triangles mark inside
  const badgeCx = omniX + 17;
  const badgeCy = omniY + 17;
  const badgeLogoSize = 16.5;
  const omniboxBadgeLogoMarkup = buildSkriptjobsTrianglesSvgGroup({
    x: badgeCx - badgeLogoSize / 2,
    y: badgeCy - badgeLogoSize / 2 - 0.3,
    size: badgeLogoSize,
    fill: '#f3eef8',
    withDarkTile: false,
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${windowWidth}" height="${H}" viewBox="0 0 ${windowWidth} ${H}">
  <defs>
    <clipPath id="tabTitleClip">
      <rect x="${tabX + 36}" y="${tabY}" width="${tabW - 64}" height="${tabH}" />
    </clipPath>
    <clipPath id="omniTextClip">
      <rect x="${omniX + 38}" y="${omniY}" width="${omniW - 54}" height="${omniH}" />
    </clipPath>
  </defs>

  <!-- Row 1: Tab Bar Background -->
  <rect x="0" y="0" width="${windowWidth}" height="${tabBarH}" fill="${T.header.tabBarBg}" />

  <!-- Row 2: Toolbar Background -->
  <rect x="0" y="${tabBarH}" width="${windowWidth}" height="${toolbarH}" fill="${T.header.toolbarBg}" />

  <!-- macOS Traffic Lights -->
  ${T.trafficLights
    .map(
      (tl) =>
        `<circle cx="${tl.cx}" cy="${tl.cy}" r="${tl.r}" fill="${tl.fill}" stroke="${tl.stroke}" stroke-width="0.5" />`
    )
    .join('\n  ')}

  <!-- Active Tab with Chrome bottom-left and bottom-right inverted fillets -->
  <path d="
    M ${tabX - scoopR} ${tabBarH}
    A ${scoopR} ${scoopR} 0 0 0 ${tabX} ${tabBarH - scoopR}
    L ${tabX} ${tabY + tabR}
    A ${tabR} ${tabR} 0 0 1 ${tabX + tabR} ${tabY}
    L ${tabX + tabW - tabR} ${tabY}
    A ${tabR} ${tabR} 0 0 1 ${tabX + tabW} ${tabY + tabR}
    L ${tabX + tabW} ${tabBarH - scoopR}
    A ${scoopR} ${scoopR} 0 0 0 ${tabX + tabW + scoopR} ${tabBarH}
    Z
  " fill="${T.header.toolbarBg}" />

  <!-- Active Tab Favicon (Skriptjobs Three-Triangles Favicon) -->
  ${tabFaviconMarkup}

  <!-- Active Tab Title -->
  <g clip-path="url(#tabTitleClip)">
    <text x="${tabX + 38}" y="${tabY + 21}" fill="${T.header.tabText}" font-family="'Geist', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', sans-serif" font-size="12.5" font-weight="500">${escapeXml(displayTitle)}</text>
  </g>

  <!-- Active Tab Close 'x' -->
  <g transform="translate(${tabX + tabW - 22}, ${tabY + 16.5})" stroke="${T.header.tabClose}" stroke-width="1.5" stroke-linecap="round">
    <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" />
    <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" />
  </g>

  <!-- New Tab '+' Button -->
  <g transform="translate(${plusCx}, ${plusCy})" stroke="${T.header.newTabPlus}" stroke-width="1.7" stroke-linecap="round">
    <line x1="-5" y1="0" x2="5" y2="0" />
    <line x1="0" y1="-5" x2="0" y2="5" />
  </g>

  <!-- Row 2: Full-width Pill URL Omnibox (stripped of nav & right toolbar clutter) -->
  <rect x="${omniX}" y="${omniY}" width="${omniW}" height="${omniH}" rx="${omniR}" ry="${omniR}" fill="${T.header.omniboxBg}" />

  <!-- Omnibox Left Badge Circle + Official Skriptjobs Three-Triangles Mark -->
  <circle cx="${badgeCx}" cy="${badgeCy}" r="12" fill="${T.header.toolbarBg}" />
  ${omniboxBadgeLogoMarkup}

  <!-- Omnibox URL Text (scheme + host + path) -->
  <g clip-path="url(#omniTextClip)">
    <text x="${omniX + 38}" y="${omniY + 22}" font-family="'Geist', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', sans-serif" font-size="13.5" font-weight="400" xml:space="preserve"><tspan fill="${T.header.urlScheme}">${escapeXml(scheme)}</tspan><tspan fill="${T.header.urlHost}" font-weight="500">${escapeXml(host)}</tspan><tspan fill="${T.header.urlPath}">${escapeXml(path)}</tspan></text>
  </g>

  <!-- Bottom 1px Divider Line -->
  <rect x="0" y="${H - 1}" width="${windowWidth}" height="1" fill="${T.header.dividerColor}" />
</svg>`;
}

/**
 * Browser Canvas 2D renderer (used by the Chrome Extension popup, content script, & Vue component).
 */
export async function renderFramedScreenshotToCanvas({
  canvas,
  viewportImage,
  backgroundImage,
  url = 'https://docs.skriptjobs.localhost:3050/getting-started/installation',
  title = 'Installation - Skriptjobs',
  faviconDataUrl = null,
  marginMode = 'reference',
  fitReferenceSize = true,
}) {
  const T = CHROME_MOCKUP_THEME;
  const margins = T.margins[marginMode] || T.margins.reference;

  const winW = fitReferenceSize ? T.referenceWindow.width : viewportImage.width + 4;
  const vpW = winW - 4;
  const vpH = fitReferenceSize
    ? T.referenceWindow.height - T.header.totalHeight - 4
    : Math.round(viewportImage.height * (vpW / viewportImage.width));
  const winH = T.header.totalHeight + vpH + 4;

  const totalW = winW + margins.left + margins.right;
  const totalH = winH + margins.top + margins.bottom;

  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  // 1. Draw Background Wallpaper (cover)
  if (backgroundImage) {
    const imgRatio = backgroundImage.width / backgroundImage.height;
    const canvasRatio = totalW / totalH;
    let sx = 0, sy = 0, sw = backgroundImage.width, sh = backgroundImage.height;
    if (imgRatio > canvasRatio) {
      sw = backgroundImage.height * canvasRatio;
      sx = (backgroundImage.width - sw) / 2;
    } else {
      sh = backgroundImage.width / canvasRatio;
      sy = (backgroundImage.height - sh) / 2;
    }
    ctx.drawImage(backgroundImage, sx, sy, sw, sh, 0, 0, totalW, totalH);
  } else {
    const grad = ctx.createLinearGradient(0, 0, totalW, totalH);
    grad.addColorStop(0, '#2c2ab3');
    grad.addColorStop(0.5, '#1a90ac');
    grad.addColorStop(1, '#28016b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, totalW, totalH);
  }

  const winX = margins.left;
  const winY = margins.top;
  const r = T.windowRadius;

  function traceRoundedRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // 2. Draw macOS Window Drop Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.56)';
  ctx.shadowBlur = T.shadow.blurCss;
  ctx.shadowOffsetX = T.shadow.offsetX;
  ctx.shadowOffsetY = T.shadow.offsetY;
  traceRoundedRect(winX, winY, winW, winH, r);
  ctx.fillStyle = T.borderOuter;
  ctx.fill();
  ctx.restore();

  // 3. Draw Outer 1px Highlight Rim (#585a5f) and Inner 1px Dark Rim (#393344)
  traceRoundedRect(winX, winY, winW, winH, r);
  ctx.fillStyle = T.borderOuter;
  ctx.fill();

  traceRoundedRect(winX + 1, winY + 1, winW - 2, winH - 2, r - 1);
  ctx.fillStyle = T.borderInner;
  ctx.fill();

  // 4. Clip to Inner Window Surface (winX+2, winY+2, winW-4, winH-4)
  ctx.save();
  traceRoundedRect(winX + 2, winY + 2, winW - 4, winH - 4, r - 2);
  ctx.clip();

  // 5. Render Header SVG onto inner top
  const headerSvg = buildChromeHeaderSvg({
    windowWidth: winW - 4,
    title,
    url,
    faviconDataUrl,
  });
  const svgBlob = new Blob([headerSvg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const headerImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = svgUrl;
    });
    ctx.drawImage(headerImg, winX + 2, winY + 2, winW - 4, T.header.totalHeight);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }

  // 6. Draw Viewport Image below header
  ctx.fillStyle = '#3f384d';
  ctx.fillRect(winX + 2, winY + 2 + T.header.totalHeight, vpW, vpH);
  ctx.drawImage(
    viewportImage,
    0,
    0,
    viewportImage.width,
    viewportImage.height,
    winX + 2,
    winY + 2 + T.header.totalHeight,
    vpW,
    vpH
  );

  ctx.restore();
  return canvas;
}
