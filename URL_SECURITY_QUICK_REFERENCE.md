# URL Redirect Security - Quick Reference

## 🔒 Approved Redirect URL

**ONLY THIS URL IS ALLOWED:**
```
https://3rd-party-coatings-i-udgh.bolt.host/
```

All other URLs are automatically blocked.

---

## 🚀 Quick Start

### Use Safe Link Component

```tsx
import { SafeExternalLink } from '../components/SafeExternalLink';

<SafeExternalLink url="https://3rd-party-coatings-i-udgh.bolt.host/">
  Visit External System
</SafeExternalLink>
```

### Use Safe Button

```tsx
import { SafeExternalButton } from '../components/SafeExternalLink';

<SafeExternalButton url="https://3rd-party-coatings-i-udgh.bolt.host/">
  Open Database
</SafeExternalButton>
```

### Programmatic Redirect

```tsx
import { safeRedirect } from '../lib/urlValidation';

await safeRedirect('https://3rd-party-coatings-i-udgh.bolt.host/', {
  newWindow: true
});
```

---

## ✅ What's Allowed

- ✅ `https://3rd-party-coatings-i-udgh.bolt.host/` (exact match)

## ❌ What's Blocked

- ❌ `http://3rd-party-coatings-i-udgh.bolt.host/` (HTTP not allowed)
- ❌ `https://3rd-party-coatings-i-udgh.bolt.host/admin` (path not allowed)
- ❌ `https://3rd-party-coatings-i-udgh.bolt.host/?id=123` (query not allowed)
- ❌ `https://evil.com/` (different domain)
- ❌ `https://malicious.3rd-party-coatings-i-udgh.bolt.host/` (subdomain)
- ❌ Any other URL

---

## 🧪 Testing

```javascript
// Browser console
runUrlValidationTests();  // Run all security tests
testApprovedUrl();        // Test approved URL
```

---

## 📊 View Security Logs

Navigate to: **Settings → Security Logs**

Monitor:
- Blocked redirect attempts
- Attempted URLs
- Block reasons
- User activity

---

## 🛠️ Configuration

**File:** `src/lib/urlValidation.ts`

**Line 21:**
```typescript
const APPROVED_REDIRECT_URL = 'https://3rd-party-coatings-i-udgh.bolt.host/';
```

**⚠️ Only admins should modify this**

---

## 📚 Full Documentation

See `URL_REDIRECT_SECURITY.md` for complete details.

---

## 🆘 Troubleshooting

**Approved URL is blocked:**
1. Check exact URL (including trailing `/`)
2. Ensure `https://` protocol
3. No query parameters
4. Run `testApprovedUrl()` in console

**Need to add another URL:**
1. Contact system administrator
2. Provide business justification
3. Security review required
4. Update `APPROVED_REDIRECT_URL` constant

---

## 🔐 Security Contact

For security concerns or to report vulnerabilities:
- Check Security Logs page
- Review documentation
- Contact IT security team
