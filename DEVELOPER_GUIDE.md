# Developer Quick Reference Guide

## 🚀 Quick Start

### Using Toast Notifications

```typescript
import { useToast } from '../contexts/ToastContext';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Operation completed successfully!');
  };

  const handleError = (error: any) => {
    toast.error('Something went wrong: ' + error.message);
  };

  const handleWarning = () => {
    toast.warning('Please review your input');
  };

  const handleInfo = () => {
    toast.info('This is informational');
  };

  return <button onClick={handleSuccess}>Click Me</button>;
}
```

---

## 🔔 Toast Notification Best Practices

### When to Use Each Type:

- **Success** ✅ - Data saved, item created, operation completed
- **Error** ❌ - Failed operations, validation errors, server errors
- **Warning** ⚠️ - Non-critical issues, deprecation notices
- **Info** ℹ️ - Informational messages, tips, guidance

### Message Guidelines:

```typescript
// ✅ GOOD - Clear and specific
toast.success('Template "Intumescent Standard" created successfully');
toast.error('Failed to delete template: Permission denied');

// ❌ BAD - Vague and unhelpful
toast.success('Done');
toast.error('Error occurred');
```

---

## 🎨 Button Styling Guide

### Primary Action Buttons

```typescript
// Large, prominent buttons for main actions
<button className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
  <Plus className="w-5 h-5 mr-2" />
  Create New
</button>
```

### Empty State Buttons

```typescript
// Extra large buttons to encourage first action
<button className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg">
  <Plus className="w-6 h-6 mr-2" />
  Create Your First Template
</button>
```

### Secondary Buttons

```typescript
// Less prominent, supporting actions
<button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 font-medium">
  Cancel
</button>
```

### Danger Buttons

```typescript
// For destructive actions
<button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md">
  Delete
</button>
```

---

## 🔐 Permission Checks

### Check User Permissions

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { profile } = useAuth();
  const canManageTemplates = profile?.role === 'admin' || profile?.role === 'inspector';

  return (
    <>
      {canManageTemplates && (
        <button>Create Template</button>
      )}
    </>
  );
}
```

### Permission Matrix

| Role | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Inspector | ✅ | ✅ | ✅ | ✅ |
| Other | ✅ | ❌ | ❌ | ❌ |

---

## 🎯 Empty State Pattern

### Standard Empty State Structure

```typescript
{items.length === 0 ? (
  <div className="bg-white/10 backdrop-blur-sm rounded-lg border-2 border-dashed border-white/10 p-12 text-center">
    <IconComponent className="w-16 h-16 text-blue-300 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-white mb-2">
      No items yet
    </h3>
    <p className="text-blue-100 mb-6">
      Get started by creating your first item
    </p>
    {canManage && (
      <button
        onClick={handleCreate}
        className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg"
      >
        <Plus className="w-6 h-6 mr-2" />
        Create Your First Item
      </button>
    )}
  </div>
) : (
  // Display items
)}
```

---

## 📝 Form Validation Pattern

### Basic Form with Validation

```typescript
function MyForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const validate = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.includes('@')) {
      newErrors.email = 'Valid email is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix validation errors');
      return;
    }

    setLoading(true);

    try {
      // Save data
      await saveData(formData);
      toast.success('Data saved successfully');
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className={errors.name ? 'border-red-500' : ''}
      />
      {errors.name && (
        <p className="text-red-400 text-sm mt-1">{errors.name}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

---

## 🔄 CRUD Operations Pattern

### Standard CRUD Implementation

```typescript
function ResourceManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const toast = useToast();

  // CREATE
  const handleCreate = async (data: ItemInput) => {
    try {
      const { error } = await supabase.from('items').insert(data);
      if (error) throw error;
      toast.success('Item created successfully');
      await loadItems();
    } catch (error: any) {
      toast.error('Failed to create: ' + error.message);
    }
  };

  // READ
  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  // UPDATE
  const handleUpdate = async (id: string, data: ItemInput) => {
    try {
      const { error } = await supabase
        .from('items')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      toast.success('Item updated successfully');
      await loadItems();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  // DELETE
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Item deleted successfully');
      await loadItems();
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    // Your component JSX
  );
}
```

---

## 🎨 Color System

### Brand Colors

```typescript
// Use these consistent colors throughout the app
const colors = {
  // Forms & Primary Actions
  blue: {
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  // Project Templates & Success
  green: {
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  // Materials & Warnings
  orange: {
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
  },

  // Errors & Delete Actions
  red: {
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  // Warnings
  yellow: {
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
  },
};
```

### Usage by Context

- **Forms:** Blue buttons and highlights
- **Project Templates:** Green buttons and highlights
- **Materials:** Orange buttons and highlights
- **Delete/Destructive:** Red buttons
- **Warnings:** Yellow/amber backgrounds

---

## 📱 Responsive Design Breakpoints

```typescript
// Tailwind breakpoints used in the app
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large
};
```

### Responsive Grid Example

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

---

## 🔄 Loading States

### Page-Level Loading

```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}
```

### Button Loading State

```typescript
<button
  disabled={loading}
  className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loading ? (
    <>
      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
      Saving...
    </>
  ) : (
    'Save'
  )}
</button>
```

---

## 🎭 Modal Pattern

### Standard Modal Structure

```typescript
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white/5 backdrop-blur-sm rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Modal Title</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Modal content */}
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 p-6 border-t border-white/10">
        <button
          onClick={onClose}
          className="px-4 py-2 text-white hover:bg-white/10 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 🎯 Common Patterns Cheat Sheet

### Supabase Query Examples

```typescript
// Simple select
const { data, error } = await supabase
  .from('table_name')
  .select('*');

// Select with filter
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

// Select with ordering
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .order('created_at', { ascending: false });

// Insert
const { data, error } = await supabase
  .from('table_name')
  .insert({ column1: value1, column2: value2 });

// Update
const { data, error } = await supabase
  .from('table_name')
  .update({ column: newValue })
  .eq('id', itemId);

// Delete
const { data, error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', itemId);
```

### Error Handling Pattern

```typescript
try {
  const { data, error } = await supabase.from('table').select('*');

  if (error) throw error;

  // Success path
  toast.success('Data loaded successfully');
  return data;

} catch (error: any) {
  // Error path
  console.error('Operation failed:', error);
  toast.error(error.message || 'An error occurred');
  return null;
}
```

---

## 📚 Component Library

### Available Reusable Components

1. **Toast** - `src/components/Toast.tsx`
2. **ConfirmDialog** - `src/components/ConfirmDialog.tsx`
3. **Layout** - `src/components/Layout.tsx`

### Available Contexts

1. **AuthContext** - `src/contexts/AuthContext.tsx`
2. **ToastContext** - `src/contexts/ToastContext.tsx`

---

## 🐛 Debugging Tips

### Enable Console Logging

```typescript
// Temporary debug logs
console.log('Current state:', state);
console.log('API response:', data);
console.log('Error details:', error);

// Remember to remove before commit!
```

### Check Supabase Logs

```typescript
// Add detailed error logging
const { data, error } = await supabase.from('table').select('*');
if (error) {
  console.error('Supabase error:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
}
```

### React DevTools

- Install React DevTools browser extension
- Inspect component props and state
- Track re-renders and performance

---

## ✅ Pre-Commit Checklist

- [ ] Remove console.log statements
- [ ] Check for TypeScript errors (`npm run typecheck`)
- [ ] Test on mobile viewport
- [ ] Test all CRUD operations
- [ ] Verify loading states appear
- [ ] Check error handling works
- [ ] Verify toast notifications display
- [ ] Test permission-based UI
- [ ] Build succeeds (`npm run build`)

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Check Bundle Size

```bash
npm run build
# Check dist/ folder sizes
```

---

*Happy Coding!* 🎉
