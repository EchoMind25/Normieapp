# Normie Observer Chart Widget - Integration Guide

This document provides complete instructions for embedding real-time $NORMIE price charts from normie.observer on external websites.

---

## SECTION 1: For normie.observer (Implementation Details)

### Files Created

1. **`client/src/pages/EmbedChart.tsx`** - Standalone React page for iframe embedding
2. **`client/public/normie-chart-widget.js`** - JavaScript SDK for easy integration
3. **`server/routes.ts`** - Added CORS-enabled embed API endpoints

### API Endpoints

| Endpoint | Description | CORS |
|----------|-------------|------|
| `GET /api/embed/price-history?range=24h` | Historical price data | Yes |
| `GET /api/embed/metrics` | Full token metrics (price, holders, burned, locked, liquidity, etc.) | Yes |
| `GET /api/embed/config` | Widget configuration | Yes |

### Metrics API Response

The `/api/embed/metrics` endpoint returns:

```json
{
  "price": 0.000305,
  "priceChange24h": 5.23,
  "marketCap": 293939,
  "marketCapChange24h": 5.23,
  "volume24h": 7309.22,
  "liquidity": 53048.02,
  "totalSupply": 1000000000,
  "circulatingSupply": 466800000,
  "burnedTokens": 31200000,
  "lockedTokens": 502000000,
  "holders": 177,
  "lastUpdated": "2025-12-20T02:40:03.599Z"
}
```

### Embed Page URL

```
https://normie.observer/embed/chart
```

Query parameters:
- `theme` - `dark` or `light` (default: `dark`)
- `height` - Chart height (default: `400px`)
- `range` - Default time range: `live`, `5m`, `1h`, `6h`, `24h`, `7d` (default: `24h`)
- `controls` - Show time range buttons: `true` or `false` (default: `true`)
- `branding` - Show "Powered by normie.observer": `true` or `false` (default: `true`)
- `color` - Accent color in HSL: e.g., `142 72% 45%` (default: green)
- `token` - Optional auth token if `EMBED_SECRET` is configured

### CORS Configuration

Whitelisted origins in `server/routes.ts`:
```typescript
const EMBED_ALLOWED_ORIGINS = [
  "https://normienation.com",
  "https://www.normienation.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
];
```

To add more origins, edit the `EMBED_ALLOWED_ORIGINS` array.

### Optional Token Authentication

To require authentication for embed access:

1. Set environment variable: `EMBED_SECRET=your-secret-token`
2. normienation.com must include this token in requests

### Testing

1. Start the development server: `npm run dev`
2. Visit: `http://localhost:5000/embed/chart?theme=dark&range=24h`
3. Test CORS: Open browser console on a different origin and fetch the API

### Deployment

The embed page and API endpoints are automatically deployed with the main application. No additional configuration required.

---

## SECTION 2: For normienation.com Developer (Handoff Instructions)

### Quick Start (Copy-Paste Ready)

#### Option A: JavaScript Widget (Recommended)

Add this to your HTML:

```html
<!-- Container where chart will appear -->
<div id="normie-chart"></div>

<!-- Load the widget SDK -->
<script src="https://normie.observer/normie-chart-widget.js"></script>

<!-- Initialize the chart -->
<script>
  NormieChart.init({
    container: '#normie-chart',
    theme: 'dark',
    height: '400px',
    range: '24h'
  });
</script>
```

#### Option B: Simple iFrame

```html
<iframe 
  src="https://normie.observer/embed/chart?theme=dark&range=24h&height=400px"
  width="100%"
  height="400"
  frameborder="0"
  title="NORMIE Price Chart"
  loading="lazy"
></iframe>
```

---

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | string/element | `'#normie-chart'` | CSS selector or DOM element |
| `theme` | string | `'dark'` | `'dark'` or `'light'` |
| `height` | string | `'400px'` | Chart height |
| `range` | string | `'24h'` | Default range: `'live'`, `'5m'`, `'1h'`, `'6h'`, `'24h'`, `'7d'` |
| `controls` | boolean | `true` | Show time range buttons |
| `branding` | boolean | `true` | Show "Powered by normie.observer" |
| `color` | string | `'142 72% 45%'` | Accent color (HSL format) |
| `token` | string | `null` | Auth token (if required) |
| `onLoad` | function | `null` | Callback when chart loads |
| `onError` | function | `null` | Callback on error |

---

### Advanced Usage

#### React Integration

```jsx
import { useEffect, useRef } from 'react';

function NormieChartEmbed({ theme = 'dark', height = '400px' }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    // Load the SDK dynamically
    const script = document.createElement('script');
    script.src = 'https://normie.observer/normie-chart-widget.js';
    script.onload = () => {
      if (window.NormieChart && containerRef.current) {
        widgetRef.current = window.NormieChart.init({
          container: containerRef.current,
          theme,
          height,
          onError: (err) => console.error('Chart error:', err)
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (widgetRef.current) widgetRef.current.destroy();
      document.body.removeChild(script);
    };
  }, [theme, height]);

  return <div ref={containerRef} style={{ width: '100%' }} />;
}

export default NormieChartEmbed;
```

#### Dynamic Theme Switching

```javascript
const chart = NormieChart.init({
  container: '#normie-chart',
  theme: 'dark'
});

// Later, switch to light theme
chart.setTheme('light');

// Or change time range
chart.setRange('7d');
```

#### Multiple Charts

```javascript
// Initialize all elements with class "normie-chart"
const charts = NormieChart.initAll('.normie-chart', {
  theme: 'dark',
  height: '300px'
});

// Destroy all charts when done
charts.forEach(chart => chart.destroy());
```

#### Check Service Availability

```javascript
NormieChart.ping((isAvailable, latency) => {
  if (isAvailable) {
    console.log(`normie.observer is up (${latency}ms)`);
    NormieChart.init({ container: '#normie-chart' });
  } else {
    console.log('Service unavailable, showing fallback');
    document.getElementById('normie-chart').innerHTML = 
      '<p>Chart temporarily unavailable</p>';
  }
});
```

---

### Styling & Customization

#### Matching Your Site's Theme

```javascript
NormieChart.init({
  container: '#normie-chart',
  theme: 'dark',
  color: '220 90% 56%',  // Blue accent to match your brand
  branding: false        // Remove normie.observer branding
});
```

#### Custom Container Styling

```html
<div id="normie-chart" style="
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
"></div>
```

#### Responsive Height

```javascript
const isMobile = window.innerWidth < 768;

NormieChart.init({
  container: '#normie-chart',
  height: isMobile ? '280px' : '450px'
});
```

---

### Error Handling & Fallbacks

```javascript
NormieChart.init({
  container: '#normie-chart',
  onLoad: () => {
    console.log('Chart loaded successfully');
  },
  onError: (error) => {
    console.error('Failed to load chart:', error);
    
    // Show fallback content
    document.getElementById('normie-chart').innerHTML = `
      <div style="padding: 20px; text-align: center; background: #1a1a1a; color: #888; border-radius: 8px;">
        <p>Price chart temporarily unavailable</p>
        <a href="https://normie.observer" target="_blank" style="color: #22c55e;">
          View on normie.observer
        </a>
      </div>
    `;
  }
});
```

---

### Troubleshooting

#### Chart Not Loading

1. **Check console for errors** - Look for CORS or network issues
2. **Verify the container exists** - Ensure `#normie-chart` is in the DOM before init
3. **Test the embed URL directly** - Visit `https://normie.observer/embed/chart`

#### CORS Errors

If you see CORS errors, contact normie.observer to whitelist your domain:
- Your production domain (e.g., `https://normienation.com`)
- Any staging domains

#### Slow Loading

- Use `loading="lazy"` on iframes
- Consider showing a skeleton loader while the chart initializes

#### Chart Too Small/Large

- Adjust the `height` parameter
- Ensure container has a defined width (use `width: 100%`)

---

### API Reference (Advanced)

If you need raw data instead of the widget, you can call the API directly:

```javascript
// Fetch price history
const response = await fetch(
  'https://normie.observer/api/embed/price-history?range=24h',
  {
    headers: {
      'X-Embed-Token': 'your-token-if-required'
    }
  }
);
const data = await response.json();
// Returns: [{ timestamp: 1703001234567, price: 0.000234 }, ...]

// Fetch current metrics (includes all token stats)
const metrics = await fetch('https://normie.observer/api/embed/metrics');
const { 
  price, 
  priceChange24h, 
  marketCap, 
  volume24h,
  liquidity,
  holders,
  burnedTokens,
  lockedTokens,
  circulatingSupply,
  totalSupply,
  lastUpdated
} = await metrics.json();
```

---

### Security Notes

- The embed widget runs in an iframe with appropriate sandboxing
- No cookies or user data are shared between domains
- CORS is strictly enforced with exact origin matching in production
- If `EMBED_SECRET` is configured:
  - Token must be passed via `X-Embed-Token` header (not URL query params)
  - This is designed for server-to-server authentication
  - For client-side embedding, coordinate with normie.observer to whitelist your domain instead

---

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.1 | Dec 2024 | Added stats bar with holders, burned, locked, liquidity. Fixed time range button response speed. Expanded metrics API. |
| 1.0.0 | Dec 2024 | Initial release |

---

### Support

For integration issues or to request additional origins:
- Open an issue on the normie.observer repository
- Contact the normie.observer team

---

*Document generated for normienation.com integration*
