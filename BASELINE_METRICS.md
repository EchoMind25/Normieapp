# NormieNation Performance Baseline Metrics

**Date**: December 19, 2025
**Commit**: Pre-optimization baseline

## Bundle Analysis

### Production Build Output

| Asset | Size | Gzipped |
|-------|------|---------|
| index.js (main bundle) | 3,196.15 KB | 669.57 KB |
| index.css | 85.21 KB | 14.13 KB |
| ort.bundle.min.js | 399.10 KB | 109.00 KB |
| ort.webgpu.bundle.min.js | 399.12 KB | 109.00 KB |
| ort-wasm-simd-threaded.wasm | 23,914.39 KB | N/A |

**Total JS Bundle**: ~4.0 MB (uncompressed)
**Total Gzipped**: ~887.57 KB + WASM

### Critical Issues Identified

1. **Main bundle exceeds 500KB limit** - Currently 3.2MB
2. **ONNX Runtime WASM file is 23.9MB** - From @imgly/background-removal and upscaler
3. **No code splitting** - All components loaded eagerly
4. **No manual chunks configuration** - Vendors bundled with app code

## Unused Dependencies (17 found)

### Production Dependencies (can be removed):
- @jridgewell/trace-mapping
- base-x
- bs58
- chartjs-adapter-date-fns
- connect-pg-simple
- express-session
- fabric
- framer-motion
- glob
- google-auth-library
- memorystore
- next-themes
- passport
- passport-local
- tw-animate-css
- ws
- zod-validation-error

### Dev Dependencies (can be removed):
- @tailwindcss/vite
- @types/connect-pg-simple
- @types/express-session
- @types/passport
- @types/passport-local
- @types/ws
- autoprefixer
- postcss

## Heavy Libraries Analysis

| Library | Usage | Can Lazy Load? |
|---------|-------|----------------|
| @imgly/background-removal | MemeGenerator only | Yes |
| upscaler | MemeGenerator only | Yes |
| @solana/web3.js | wallet.ts (PublicKey type only) | Partial |
| chart.js + react-chartjs-2 | Dashboard | Yes |
| recharts | UI chart component | Yes |
| emoji-picker-react | MemeGenerator only | Yes |

## Optimization Targets

### Bundle Size Goals
- Reduce main bundle from 3.2MB to <1MB (70% reduction)
- Move heavy components to lazy-loaded chunks
- Remove unused dependencies (~estimated 100-200KB savings)

### Code Splitting Candidates
1. **MemeGenerator** - Contains upscaler, background-removal, emoji-picker (~24MB assets)
2. **Dashboard Charts** - chart.js, react-chartjs-2
3. **Admin Page** - Admin-only functionality
4. **Profile Page** - User profile features
5. **CommunityHub** - Polls and community features

### API/Backend Targets
- Add compression middleware for API responses
- Implement caching for /api/metrics endpoint
- Remove console.log statements in production

---

## Post-Optimization Measurements (To Be Completed)

| Metric | Baseline | After | Improvement |
|--------|----------|-------|-------------|
| Main JS Bundle | 3,196 KB | TBD | TBD |
| Gzipped JS | 669 KB | TBD | TBD |
| Unused Deps | 17 | TBD | TBD |
| Initial Load | TBD | TBD | TBD |
