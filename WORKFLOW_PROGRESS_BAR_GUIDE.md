# Workflow Progress Bar Components

## Overview
Two complementary components for tracking project workflow completion:

1. **WorkflowProgressBar** - Full detailed progress visualization
2. **WorkflowProgressIndicator** - Compact progress indicator for headers

---

## Workflow Stages

The fire protection inspection workflow consists of 8 sequential stages:

| Stage | Description | Key Completion Criteria |
|-------|-------------|------------------------|
| 1. Documents | Upload loading schedules and drawings | Documents uploaded to project |
| 2. Loading Schedule | Parse and review fire protection data | Schedule imported and parsed |
| 3. Site Manager | Organize drawings by blocks/levels | Pins placed on drawings |
| 4. Member Register | Register members with quantities | Members created in register |
| 5. Inspections | Conduct on-site inspections | Inspection records created |
| 6. NCRs | Non-conformance reports | NCRs recorded (if issues found) |
| 7. Pin Corrections | Review pin placements | Pin corrections reviewed |
| 8. Exports | Generate final reports | Reports exported |

---

## Component 1: WorkflowProgressBar

### Features
- Visual representation of all 8 workflow stages
- Real-time status updates from database
- Three states: Completed (green), Active (blue), Pending (gray)
- Horizontal or vertical orientation
- Compact or detailed view modes
- Stage icons and descriptions

### Usage

```tsx
import { WorkflowProgressBar } from '../components/WorkflowProgressBar';

// Full horizontal progress bar
<WorkflowProgressBar
  projectId={projectId}
  currentStage="member_register"
  orientation="horizontal"
  showLabels={true}
  compact={false}
/>

// Vertical sidebar version
<WorkflowProgressBar
  projectId={projectId}
  orientation="vertical"
  showLabels={true}
  compact={false}
/>

// Compact horizontal version
<WorkflowProgressBar
  projectId={projectId}
  currentStage="inspections"
  orientation="horizontal"
  compact={true}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `projectId` | string | required | Project UUID |
| `currentStage` | string | optional | Current active stage ID |
| `orientation` | 'horizontal' \| 'vertical' | 'horizontal' | Display orientation |
| `showLabels` | boolean | true | Show stage labels |
| `compact` | boolean | false | Compact mode (smaller text) |

### Stage IDs
- `documents`
- `loading_schedule`
- `site_manager`
- `member_register`
- `inspections`
- `ncrs`
- `pin_corrections`
- `exports`

---

## Component 2: WorkflowProgressIndicator

### Features
- Compact display showing X/8 stages completed
- Percentage completion
- Mini progress bar
- Color-coded status (red/yellow/blue/green)
- Auto-calculates completion from database

### Usage

```tsx
import { WorkflowProgressIndicator } from '../components/WorkflowProgressIndicator';

// In project header
<WorkflowProgressIndicator projectId={projectId} />
```

### Visual States

- **0%**: Gray - Not started
- **1-49%**: Yellow - In progress (early)
- **50-99%**: Blue - In progress (advanced)
- **100%**: Green - Complete ✓

---

## Integration Examples

### Example 1: Project Detail Page

```tsx
import { WorkflowProgressBar } from '../components/WorkflowProgressBar';
import { WorkflowProgressIndicator } from '../components/WorkflowProgressIndicator';

function ProjectDetail({ projectId }: { projectId: string }) {
  return (
    <div>
      {/* Header with compact indicator */}
      <div className="flex items-center justify-between">
        <h1>Project Details</h1>
        <WorkflowProgressIndicator projectId={projectId} />
      </div>

      {/* Full progress bar */}
      <div className="my-6">
        <h2 className="text-lg font-semibold mb-4">Workflow Progress</h2>
        <WorkflowProgressBar
          projectId={projectId}
          currentStage="member_register"
          orientation="horizontal"
          showLabels={true}
        />
      </div>

      {/* Rest of page content */}
    </div>
  );
}
```

### Example 2: Sidebar Navigation

```tsx
function ProjectSidebar({ projectId }: { projectId: string }) {
  return (
    <aside className="w-64 bg-slate-800 p-4">
      <h3 className="font-semibold mb-4">Project Progress</h3>
      <WorkflowProgressBar
        projectId={projectId}
        orientation="vertical"
        showLabels={true}
        compact={false}
      />
    </aside>
  );
}
```

### Example 3: Dashboard Card

```tsx
function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3>{project.name}</h3>
      <div className="mt-4">
        <WorkflowProgressIndicator projectId={project.id} />
      </div>
      <div className="mt-4">
        <WorkflowProgressBar
          projectId={project.id}
          orientation="horizontal"
          showLabels={false}
          compact={true}
        />
      </div>
    </div>
  );
}
```

---

## Database Queries

The components automatically query these tables to determine completion:

```sql
-- Documents stage
SELECT id FROM documents WHERE project_id = ?

-- Loading Schedule stage
SELECT id FROM loading_schedule_imports
WHERE project_id = ? AND status IN ('completed', 'needs_review')

-- Site Manager stage
SELECT id FROM drawing_pins WHERE project_id = ?

-- Member Register stage
SELECT id FROM members WHERE project_id = ?

-- Inspections stage
SELECT id FROM inspections WHERE project_id = ?

-- NCRs stage
SELECT id FROM ncrs WHERE project_id = ?

-- Pin Corrections stage
SELECT id FROM pin_corrections WHERE project_id = ?

-- Exports stage
SELECT id FROM inspection_readings WHERE project_id = ?
```

---

## Styling

### Color Scheme

**Completed Stages**
- Background: `bg-green-500/20`
- Border: `border-green-500/50`
- Text: `text-green-400`
- Icon: Green checkmark

**Active Stage**
- Background: `bg-blue-500/20`
- Border: `border-blue-500/50`
- Text: `text-blue-400`
- Icon: Clock icon

**Pending Stages**
- Background: `bg-slate-700/50`
- Border: `border-slate-600/50`
- Text: `text-slate-500`
- Icon: Stage-specific icon

### Responsive Design

The horizontal progress bar includes:
- Overflow scroll on mobile
- Minimum width to prevent squishing
- Compact mode for smaller screens

---

## Future Enhancements

Potential additions:
1. Click to navigate to stage
2. Estimated time to completion
3. Stage-specific error indicators
4. Export history tracking
5. Workflow step skipping (with permissions)
6. Automated stage progression
7. Email notifications on stage completion
8. Workflow analytics and reporting

---

## Troubleshooting

**Progress not updating?**
- Check project ID is correct
- Verify database permissions (RLS policies)
- Check browser console for errors
- Ensure tables exist in database

**Missing stages?**
- Verify all workflow tables exist
- Check data is being inserted correctly
- Review RLS policies for authenticated users

**Performance issues?**
- Component uses `LIMIT 1` queries for efficiency
- Results are cached until component remount
- Consider adding refresh button for manual updates
