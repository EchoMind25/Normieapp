# Security Audit Report - normie.observer
**Date:** December 20, 2025
**Auditor:** Automated Security Scan
**Status:** PASSED

## Executive Summary
Security audit performed in preparation for iOS App Store submission. All critical vulnerabilities have been addressed.

## Audit Scope
- Frontend code (client/src/*)
- Backend code (server/*)
- Configuration files
- Database queries
- API endpoints

## Findings

### Critical - RESOLVED
| Issue | Status | Resolution |
|-------|--------|------------|
| API keys exposed in console.log | FIXED | No sensitive data logged |
| Hardcoded API keys in frontend | NONE FOUND | All API keys server-side only |
| HTML injection in email templates | FIXED | All user input HTML-escaped before email insertion |

### High Priority - RESOLVED
| Issue | Status | Resolution |
|-------|--------|------------|
| SQL Injection risk | SAFE | Using Drizzle ORM with parameterized queries |
| XSS vulnerabilities | SAFE | React auto-escapes user content |
| CORS misconfiguration | SAFE | Strict origin whitelist for embed endpoints |
| Bug report validation | FIXED | Zod schema validation with size limits |

### Medium Priority - RESOLVED
| Issue | Status | Resolution |
|-------|--------|------------|
| Support email consistency | FIXED | Updated all user-facing instances to support@tryechomind.net |
| Rate limiting | IN PLACE | API limiter at 300 req/min, Auth limiter at 10 req/15min |
| Input size limits | FIXED | Screenshot max 5MB, description max 5000 chars |

### Low Priority
| Issue | Status | Notes |
|-------|--------|-------|
| Informational console.log statements | ACCEPTABLE | Non-sensitive operational logs retained for debugging |

## API Key Security
- BIRDEYE_API_KEY: Server-only (not exposed to frontend)
- HELIUS_API_KEY: Server-only (not exposed to frontend)
- SENDGRID_API_KEY: Server-only (not exposed to frontend)
- VAPID keys: Server-only for push notifications

## Database Security
- All queries use Drizzle ORM (parameterized)
- No raw SQL with user input concatenation
- Password hashing with bcrypt
- Session tokens properly secured

## Authentication Security
- JWT tokens with expiration
- Session validation on protected routes
- Admin role verification for sensitive endpoints
- Rate limiting on authentication endpoints

## Bug Report Security
- Zod schema validation on all input fields
- HTML escaping for email content (description, pageUrl, userAgent)
- Screenshot size limit: 5MB
- Description limit: 5000 characters
- URL validation for pageUrl field

## Support Contact
All user-facing support emails updated to: **support@tryechomind.net**

Updated locations:
- client/src/pages/Terms.tsx
- client/src/pages/Privacy.tsx
- server/pushNotifications.ts (VAPID email fallback)

Note: System admin emails (admin@normienation.com) remain for internal operations only.

## Email Address Inventory
| Email | Purpose | User-facing |
|-------|---------|-------------|
| support@tryechomind.net | Support contact | Yes |
| noreply@normie.observer | SendGrid FROM address | No (system) |
| admin@normienation.com | Admin system email | No (internal) |

## Recommendations
1. Continue monitoring console.log statements in production builds
2. Consider implementing CSP headers for additional XSS protection
3. Regular dependency audits (npm audit)
4. Periodic review of rate limit thresholds

## Conclusion
The application passes security requirements for iOS App Store submission. All identified vulnerabilities have been addressed.
