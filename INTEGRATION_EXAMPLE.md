# URL Security Integration Example

## How to Add Safe External Links to Your Pages

### Example 1: Settings Page with External Link

**Before (Unsafe):**
```tsx
function SettingsPage() {
  return (
    <div>
      <a href="https://3rd-party-coatings-i-udgh.bolt.host/" target="_blank">
        Open Coatings Database
      </a>
    </div>
  );
}
```

**After (Secure):**
```tsx
import { SafeExternalLink } from '../components/SafeExternalLink';

function SettingsPage() {
  return (
    <div>
      <SafeExternalLink
        url="https://3rd-party-coatings-i-udgh.bolt.host/"
        showIcon={true}
      >
        Open Coatings Database
      </SafeExternalLink>
    </div>
  );
}
```

---

### Example 2: Materials Page with Product Links

**Before (Unsafe):**
```tsx
function MaterialRow({ material }) {
  const handleViewProduct = () => {
    window.location.href = material.external_url; // UNSAFE!
  };

  return (
    <tr>
      <td>{material.name}</td>
      <td>
        <button onClick={handleViewProduct}>
          View Product
        </button>
      </td>
    </tr>
  );
}
```

**After (Secure):**
```tsx
import { SafeExternalButton } from '../components/SafeExternalLink';
import { safeRedirect } from '../lib/urlValidation';

function MaterialRow({ material }) {
  const handleViewProduct = async () => {
    try {
      await safeRedirect(material.external_url, { newWindow: true });
    } catch (error) {
      alert(`Cannot open this link: ${error.message}`);
    }
  };

  return (
    <tr>
      <td>{material.name}</td>
      <td>
        <button onClick={handleViewProduct}>
          View Product
        </button>
      </td>
    </tr>
  );
}
```

**Or using the component:**
```tsx
import { SafeExternalButton } from '../components/SafeExternalLink';

function MaterialRow({ material }) {
  return (
    <tr>
      <td>{material.name}</td>
      <td>
        <SafeExternalButton
          url={material.external_url}
          variant="secondary"
        >
          View Product
        </SafeExternalButton>
      </td>
    </tr>
  );
}
```

---

### Example 3: Navigation Menu with External Links

**Before (Unsafe):**
```tsx
function NavigationMenu() {
  const externalLinks = [
    { name: 'Coatings DB', url: 'https://3rd-party-coatings-i-udgh.bolt.host/' },
    { name: 'Materials', url: 'https://example.com/materials' }, // This will be blocked!
  ];

  return (
    <nav>
      {externalLinks.map(link => (
        <a key={link.name} href={link.url} target="_blank">
          {link.name}
        </a>
      ))}
    </nav>
  );
}
```

**After (Secure):**
```tsx
import { SafeExternalLink } from '../components/SafeExternalLink';

function NavigationMenu() {
  const externalLinks = [
    { name: 'Coatings DB', url: 'https://3rd-party-coatings-i-udgh.bolt.host/' },
    { name: 'Materials', url: 'https://example.com/materials' }, // Will show as blocked
  ];

  return (
    <nav>
      {externalLinks.map(link => (
        <SafeExternalLink
          key={link.name}
          url={link.url}
          showIcon={true}
          showWarning={true}  // Shows warning for invalid URLs
        >
          {link.name}
        </SafeExternalLink>
      ))}
    </nav>
  );
}
```

---

### Example 4: Dynamic URL from Database

**Before (Unsafe):**
```tsx
function ProductCard({ productId }) {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    loadProduct(productId).then(setProduct);
  }, [productId]);

  const openExternal = () => {
    if (product?.external_url) {
      window.open(product.external_url, '_blank'); // UNSAFE!
    }
  };

  return (
    <div>
      <h3>{product?.name}</h3>
      <button onClick={openExternal}>View Details</button>
    </div>
  );
}
```

**After (Secure):**
```tsx
import { validateRedirectUrl, safeRedirect } from '../lib/urlValidation';

function ProductCard({ productId }) {
  const [product, setProduct] = useState(null);
  const [urlValid, setUrlValid] = useState(false);

  useEffect(() => {
    loadProduct(productId).then(p => {
      setProduct(p);
      if (p?.external_url) {
        const validation = validateRedirectUrl(p.external_url);
        setUrlValid(validation.isValid);
        if (!validation.isValid) {
          console.warn(`Invalid external URL for ${p.name}: ${validation.reason}`);
        }
      }
    });
  }, [productId]);

  const openExternal = async () => {
    if (!product?.external_url) return;

    try {
      await safeRedirect(product.external_url, { newWindow: true });
    } catch (error) {
      alert(`Cannot open external link: ${error.message}`);
    }
  };

  return (
    <div>
      <h3>{product?.name}</h3>
      <button
        onClick={openExternal}
        disabled={!urlValid}
        title={!urlValid ? 'External URL not approved' : 'Open in new window'}
      >
        View Details {!urlValid && '🔒'}
      </button>
    </div>
  );
}
```

---

### Example 5: Form Submission with Redirect

**Before (Unsafe):**
```tsx
function RedirectForm() {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    window.location.href = url; // UNSAFE!
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
      />
      <button type="submit">Go</button>
    </form>
  );
}
```

**After (Secure):**
```tsx
import { validateRedirectUrl, safeRedirect } from '../lib/urlValidation';

function RedirectForm() {
  const [url, setUrl] = useState('');
  const [validation, setValidation] = useState({ isValid: false, reason: '' });

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    if (newUrl) {
      const result = validateRedirectUrl(newUrl);
      setValidation(result);
    } else {
      setValidation({ isValid: false, reason: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validation.isValid) {
      alert(`Cannot redirect to this URL:\n${validation.reason}`);
      return;
    }

    try {
      await safeRedirect(url, { newWindow: false });
    } catch (error) {
      alert(`Redirect failed: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="Enter URL"
          className={validation.isValid ? 'valid' : 'invalid'}
        />
        {url && !validation.isValid && (
          <p className="error">⚠️ {validation.reason}</p>
        )}
        {validation.isValid && (
          <p className="success">✅ Valid URL</p>
        )}
      </div>
      <button type="submit" disabled={!validation.isValid}>
        Go to URL
      </button>
    </form>
  );
}
```

---

### Example 6: Conditional External Links

```tsx
import { SafeExternalLink } from '../components/SafeExternalLink';
import { isApprovedUrl } from '../lib/urlValidation';

function MaterialsList({ materials }) {
  return (
    <table>
      <tbody>
        {materials.map(material => (
          <tr key={material.id}>
            <td>{material.name}</td>
            <td>
              {material.external_url ? (
                isApprovedUrl(material.external_url) ? (
                  <SafeExternalLink url={material.external_url} showIcon>
                    View Details
                  </SafeExternalLink>
                ) : (
                  <span className="text-muted" title="URL not approved">
                    External link unavailable 🔒
                  </span>
                )
              ) : (
                <span className="text-muted">No external link</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Summary

### Key Principles

1. **Never use direct redirects:**
   - ❌ `window.location.href = url`
   - ❌ `window.open(url)`
   - ✅ Use `safeRedirect(url)`

2. **Always use safe components:**
   - ❌ `<a href={url}>`
   - ✅ `<SafeExternalLink url={url}>`

3. **Validate before displaying:**
   - Check `isApprovedUrl()` or `validateRedirectUrl()`
   - Show appropriate UI for invalid URLs

4. **Handle errors gracefully:**
   - Use try/catch with `safeRedirect()`
   - Show user-friendly error messages
   - Log security events automatically

### Testing Checklist

- [ ] All external links use safe components
- [ ] No direct `window.location` or `window.open` calls
- [ ] URL validation in place for user inputs
- [ ] Error messages displayed to users
- [ ] Security logs being generated
- [ ] Build passes without errors
- [ ] Security tests run successfully
