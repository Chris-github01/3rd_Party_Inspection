# Deterministic Workflow Engine - Implementation Guide

**Version:** 2.0
**Date:** February 24, 2026
**Status:** 60% Complete - Core Engine Operational

---

## Implementation Summary

### What Has Been Completed ✅

#### 1. Database Layer (100% Complete)
- ✅ `project_workflow_state` table - single source of truth
- ✅ `workflow_events` table - complete audit trail
- ✅ RPC functions for state management
- ✅ Automatic triggers on all major tables
- ✅ RLS policies for security
- ✅ `approve_loading_and_create_members()` transactional function

#### 2. Frontend Workflow Engine (100% Complete)
- ✅ Workflow definition with zero circular dependencies
- ✅ WorkflowContext provider with real-time updates
- ✅ WorkflowStepper visual progress component
- ✅ DiagnosticsPanel for debugging
- ✅ Step-by-step action recommendations

### What Needs Completion 🚧

#### 3. Mobile Site Mode (0% Complete)
- 🚧 New route: `/projects/:id/site-mobile`
- 🚧 Mobile-optimized inspection interface
- 🚧 Photo capture with compression
- 🚧 Offline queue with IndexedDB
- 🚧 Auto-sync when online

#### 4. Integration Updates (0% Complete)
- 🚧 Update ProjectDetail.tsx to use WorkflowProvider
- 🚧 Update LoadingScheduleTab.tsx to use new approve function
- 🚧 Add DiagnosticsPanel toggle button
- 🚧 Remove old workflow blocking logic

#### 5. PWA Enhancements (0% Complete)
- 🚧 Service worker for offline support
- 🚧 Manifest updates
- 🚧 Install prompt

---

## Core Architecture

### Database Schema

```sql
-- Single source of truth
project_workflow_state
├── project_id (PK)
├── documents_count (int)
├── loading_items_count (int)
├── members_count (int)
├── drawings_count (int)
├── pins_count (int)
├── inspections_count (int)
├── ncr_count (int)
├── last_import_at (timestamptz)
├── last_member_create_at (timestamptz)
├── last_error (text)
├── last_error_at (timestamptz)
└── updated_at (timestamptz)

-- Audit trail
workflow_events
├── id (uuid, PK)
├── project_id (uuid, FK)
├── user_id (uuid, FK)
├── event_type (text)
├── payload (jsonb)
└── created_at (timestamptz)
```

### Auto-Update Triggers

All major tables trigger automatic workflow state recalculation:
- documents → trigger_documents_workflow_update
- loading_schedule_items → trigger_loading_items_workflow_update
- members → trigger_members_workflow_update
- drawing_pins → trigger_pins_workflow_update
- inspections → trigger_inspections_workflow_update
- ncrs → trigger_ncrs_workflow_update

### RPC Functions

**State Management:**
```typescript
// Recompute state (authoritative)
recompute_project_workflow_state(project_id: uuid): void

// Log events
log_workflow_event(project_id: uuid, event_type: text, payload: jsonb): uuid

// Get diagnostics
get_workflow_diagnostics(project_id: uuid): jsonb
```

**Member Creation:**
```typescript
// Transactional member creation
approve_loading_and_create_members(
  project_id: uuid,
  import_id?: uuid
): {
  success: boolean,
  created_members: number,
  updated_members: number,
  skipped_members: number,
  error_count: number,
  errors: array
}
```

---

## Workflow Step Definitions

### NO CIRCULAR DEPENDENCIES

All steps are **always accessible**, but may show warnings:

| Step | Always Accessible | Ready When | Warnings If Missing |
|------|------------------|------------|---------------------|
| Documents | ✅ Yes | documents_count > 0 | No documents uploaded |
| Loading Schedule | ✅ Yes | loading_items_count > 0 AND members_count > 0 | No schedule imported OR not approved |
| Site Manager | ✅ Yes | drawings_count > 0 AND pins_count > 0 | No drawings OR no pins |
| Member Register | ✅ Yes | members_count > 0 | No members in register |
| Inspections | ✅ Yes | members_count > 0 | No members available |
| NCRs | ✅ Yes | members_count > 0 | No members available |
| Exports | ✅ Yes | inspections_count > 0 | Limited report content |
| Site Mode | ✅ Yes | members_count > 0 AND drawings_count > 0 | Limited functionality |

---

## Frontend Integration Guide

### 1. Wrap Project Pages with WorkflowProvider

```typescript
// In ProjectDetail.tsx
import { WorkflowProvider } from '../contexts/WorkflowContext';

function ProjectDetail() {
  const { id } = useParams();

  return (
    <WorkflowProvider projectId={id}>
      {/* Your existing content */}
      <WorkflowStepper
        currentStep={activeTab}
        onNavigate={(stepId) => setActiveTab(stepId)}
      />
      {/* Rest of page */}
    </WorkflowProvider>
  );
}
```

### 2. Use Workflow Hook in Components

```typescript
import { useWorkflow } from '../contexts/WorkflowContext';

function MyComponent() {
  const { workflowState, loading, refreshState } = useWorkflow();

  if (!workflowState) return <div>Loading...</div>;

  return (
    <div>
      <p>Members: {workflowState.members_count}</p>
      <button onClick={refreshState}>Refresh</button>
    </div>
  );
}
```

### 3. Update LoadingScheduleTab to Use New Approve Function

```typescript
// In LoadingScheduleTab.tsx
const handleApproveAndCreateMembers = async () => {
  try {
    setSyncing(true);

    // Call new transactional RPC
    const { data, error } = await supabase.rpc(
      'approve_loading_and_create_members',
      {
        p_project_id: projectId,
        p_import_id: selectedImport?.id // or null for all items
      }
    );

    if (error) throw error;

    // Show results
    alert(`Success!
Created: ${data.created_members}
Updated: ${data.updated_members}
Errors: ${data.error_count}`);

    // Workflow state updates automatically via triggers

  } catch (err) {
    console.error('Approve failed:', err);
    alert('Failed to create members');
  } finally {
    setSyncing(false);
  }
};
```

### 4. Add Diagnostics Panel Toggle

```typescript
import DiagnosticsPanel from '../components/DiagnosticsPanel';

function ProjectDetail() {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <div>
      {/* Bug icon button */}
      <button onClick={() => setShowDiagnostics(true)}>
        <Bug className="w-5 h-5" />
      </button>

      {/* Diagnostics panel */}
      {showDiagnostics && (
        <DiagnosticsPanel
          projectId={projectId}
          onClose={() => setShowDiagnostics(false)}
        />
      )}
    </div>
  );
}
```

---

## Mobile Site Mode - Planned Architecture

### Route Structure

```
/projects/:id/site-mobile
  ├── /pins        - Pin list view
  ├── /drawings    - Drawing view with pins
  ├── /inspect/:pinId - Inspection form
  └── /queue       - Offline queue status
```

### Key Features

**1. Touch-Optimized UI:**
- Minimum 48px touch targets
- Large buttons
- Minimal typing required
- Quick member selection with search

**2. Photo Capture:**
```typescript
// Compressed photo capture
<input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handlePhotoCapture}
/>

async function handlePhotoCapture(e) {
  const file = e.target.files[0];
  const compressed = await compressImage(file, {
    maxWidth: 1600,
    quality: 0.75
  });
  // Store in IndexedDB if offline
  // Upload when online
}
```

**3. Offline Queue:**
```typescript
interface QueuedInspection {
  id: string;
  project_id: string;
  member_id: string;
  photos: Blob[];
  readings: number[];
  result: string;
  timestamp: number;
  synced: boolean;
}

// IndexedDB structure
const db = {
  queued_inspections: IDBObjectStore,
  queued_photos: IDBObjectStore
};
```

**4. Auto-Sync:**
```typescript
// Monitor connection status
window.addEventListener('online', async () => {
  await syncQueuedInspections();
});

async function syncQueuedInspections() {
  const queue = await db.queued_inspections.getAll();

  for (const item of queue) {
    try {
      // Upload photos
      for (const photo of item.photos) {
        await uploadPhoto(photo);
      }

      // Create inspection
      await supabase.from('inspections').insert(item);

      // Mark as synced
      item.synced = true;
      await db.queued_inspections.put(item);

      // Log event
      await supabase.rpc('log_workflow_event', {
        p_project_id: item.project_id,
        p_event_type: 'INSPECTION_SYNCED',
        p_payload: { inspection_id: item.id }
      });
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }
}
```

---

## Testing Checklist

### Workflow State Tests

- [ ] Create project → workflow_state record created automatically
- [ ] Upload document → documents_count increments
- [ ] Import loading schedule → loading_items_count increments
- [ ] Approve & create members → members_count increments
- [ ] Upload drawing → drawings_count increments
- [ ] Add pin → pins_count increments
- [ ] Create inspection → inspections_count increments
- [ ] Create NCR → ncr_count increments
- [ ] All counts update in real-time without refresh

### Workflow Engine Tests

- [ ] Documents tab always accessible
- [ ] Loading Schedule tab always accessible
- [ ] All other tabs accessible but may show warnings
- [ ] WorkflowStepper shows correct progress percentage
- [ ] WorkflowStepper highlights current step
- [ ] Action buttons navigate to correct tabs
- [ ] No circular dependencies exist

### Approve Function Tests

- [ ] Approve with no items → returns error message
- [ ] Approve with valid items → creates members
- [ ] Approve with duplicate member_marks → updates existing
- [ ] Approve logs workflow event
- [ ] Approve triggers state recalculation
- [ ] Error handling returns detailed error information

### Diagnostics Panel Tests

- [ ] Shows current workflow state
- [ ] Shows raw table counts
- [ ] Shows recent events
- [ ] Shows user profile
- [ ] Refresh button works
- [ ] Real-time updates appear
- [ ] Error messages display correctly

---

## Migration Path for Existing Projects

### Step 1: Run Migrations

All migrations are automatically applied. No manual action needed.

### Step 2: Verify State

```sql
-- Check workflow state exists for all projects
SELECT p.id, p.name, ws.members_count, ws.inspections_count
FROM projects p
LEFT JOIN project_workflow_state ws ON ws.project_id = p.id;

-- If any NULL, manually trigger recompute
SELECT recompute_project_workflow_state('project-id-here');
```

### Step 3: Update Frontend Code

1. Wrap ProjectDetail with WorkflowProvider
2. Add WorkflowStepper component
3. Update LoadingScheduleTab approve button
4. Add DiagnosticsPanel toggle
5. Remove old blocking logic

### Step 4: Test End-to-End

1. Create new project
2. Upload document
3. Import loading schedule
4. Approve and create members
5. Verify all counts in diagnostics
6. Verify no blocking occurs

---

## Common Issues & Solutions

### Issue: Workflow state not updating

**Solution:**
```typescript
// Manually refresh state
const { refreshState } = useWorkflow();
await refreshState();
```

### Issue: Members not created after approve

**Check:**
1. Open Diagnostics Panel
2. View recent events - should see 'MEMBERS_CREATED'
3. Check for errors in payload
4. Verify loading_items_count > 0
5. Check last_error field

**Fix:**
```sql
-- Check loading schedule items
SELECT COUNT(*) FROM loading_schedule_items WHERE project_id = 'xxx';

-- Manually run approve if needed
SELECT approve_loading_and_create_members('project-id-here');
```

### Issue: Realtime updates not working

**Solution:**
1. Check browser console for Supabase realtime errors
2. Verify RLS policies allow SELECT on project_workflow_state
3. Check network tab for websocket connection
4. Try refresh button in Diagnostics Panel

---

## Performance Considerations

### Trigger Optimization

Triggers fire on every INSERT/UPDATE/DELETE, which is efficient for:
- Individual operations
- Small batch operations

For large bulk operations (1000+ rows), consider:
```typescript
// Disable triggers temporarily (admin only)
ALTER TABLE members DISABLE TRIGGER trigger_members_workflow_update;

// Bulk insert

// Re-enable and manually recompute
ALTER TABLE members ENABLE TRIGGER trigger_members_workflow_update;
SELECT recompute_project_workflow_state('project-id');
```

### Realtime Subscription

Only one subscription per project is needed. Don't create multiple:
```typescript
// GOOD - One subscription in WorkflowProvider
useEffect(() => {
  const channel = supabase.channel(`workflow-${projectId}`)...
  return () => supabase.removeChannel(channel);
}, [projectId]);

// BAD - Multiple subscriptions
// Don't subscribe in every component
```

---

## Next Steps for Full Implementation

### Priority 1: Complete Mobile Site Mode

1. Create `/src/pages/SiteMobile.tsx`
2. Implement offline queue with IndexedDB
3. Add photo compression
4. Test offline/online scenarios

### Priority 2: Update Existing Components

1. Update ProjectDetail.tsx
2. Update LoadingScheduleTab.tsx
3. Remove old workflow_states table references
4. Remove old blocking logic

### Priority 3: PWA Enhancements

1. Update manifest.json
2. Create service worker
3. Add install prompt
4. Test offline functionality

### Priority 4: Documentation

1. Update COMPLETE_WORKFLOW_GUIDE.md
2. Add mobile site mode instructions
3. Add offline queue documentation
4. Create video tutorials

---

## API Reference

### React Hooks

**useWorkflow()**
```typescript
const {
  workflowState: WorkflowState | null,
  diagnostics: WorkflowDiagnostics | null,
  loading: boolean,
  error: string | null,
  refreshState: () => Promise<void>,
  loadDiagnostics: () => Promise<void>
} = useWorkflow();
```

### Workflow Functions

**calculateWorkflowProgress(state: WorkflowState): number**
- Returns 0-100 percentage of workflow completion

**getWorkflowStep(stepId: WorkflowStepId): WorkflowStep | undefined**
- Gets step definition by ID

**getNextRecommendedAction(state: WorkflowState): { step, action } | null**
- Returns next recommended action for user

---

## Conclusion

The deterministic workflow engine provides:

✅ **Single Source of Truth:** Database-backed state, not derived
✅ **No Circular Dependencies:** All tabs always accessible
✅ **Real-Time Updates:** Automatic state refresh via triggers
✅ **Complete Visibility:** Diagnostics panel shows everything
✅ **Audit Trail:** Full event log for debugging
✅ **Transactional Operations:** Approve function is atomic

**Remaining work:** Mobile Site Mode + Integration updates (~40%)

**Status:** Core engine operational and ready for testing

---

**Document Version:** 2.0
**Author:** AI Implementation Assistant
**Date:** February 24, 2026
