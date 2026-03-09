# Workflow Progress Bar - Visual Guide

## 🎯 Overview

Two complementary components for tracking fire protection inspection workflow completion across 8 sequential stages.

---

## 📊 Component 1: Compact Progress Indicator

**Location**: Project header (top-right)

### Visual States

#### ✅ Complete (100%)
```
┌─────────────────────────────────────┐
│ ✓  8/8 Stages (100%)               │
│    ████████████████████████████    │ ← Green progress bar
└─────────────────────────────────────┘
Green background, checkmark icon
```

#### 🔵 In Progress - Advanced (50-99%)
```
┌─────────────────────────────────────┐
│ ○  5/8 Stages (63%)                │
│    ████████████░░░░░░░░░░░░░       │ ← Blue progress bar
└─────────────────────────────────────┘
Blue background, circle icon
```

#### 🟡 In Progress - Early (1-49%)
```
┌─────────────────────────────────────┐
│ ○  2/8 Stages (25%)                │
│    ██████░░░░░░░░░░░░░░░░░░░░      │ ← Yellow progress bar
└─────────────────────────────────────┘
Yellow background, circle icon
```

#### ⚪ Not Started (0%)
```
┌─────────────────────────────────────┐
│ ○  0/8 Stages (0%)                 │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░      │ ← Gray progress bar
└─────────────────────────────────────┘
Gray background, circle icon
```

---

## 📈 Component 2: Full Progress Bar (Horizontal)

### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ●────●────●────●────●────●────●────●                                       │
│  │    │    │    │    │    │    │    │                                       │
│  ✓    ✓    ✓    ○    ○    ○    ○    ○                                       │
│  │    │    │    │    │    │    │    │                                       │
│ Docs Load Site Memb Insp NCRs Pins Expo                                    │
│      Sch  Mgr  Reg                                                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Stage Icons & Status

| Stage | Icon | Completed | Active | Pending |
|-------|------|-----------|--------|---------|
| Documents | 📄 | ✓ Green | ⏰ Blue | 📄 Gray |
| Loading Schedule | 📋 | ✓ Green | ⏰ Blue | 📋 Gray |
| Site Manager | 🗺️ | ✓ Green | ⏰ Blue | 🗺️ Gray |
| Member Register | 👥 | ✓ Green | ⏰ Blue | 👥 Gray |
| Inspections | ✅ | ✓ Green | ⏰ Blue | ✅ Gray |
| NCRs | ⚠️ | ✓ Green | ⏰ Blue | ⚠️ Gray |
| Pin Corrections | 📍 | ✓ Green | ⏰ Blue | 📍 Gray |
| Exports | ⬇️ | ✓ Green | ⏰ Blue | ⬇️ Gray |

### Example: 3 Stages Complete
```
     ✓              ✓              ✓              ⏰              ○              ○              ○              ○
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│   📄    │────│   📋    │────│   🗺️    │────│   👥    │────│   ✅    │────│   ⚠️    │────│   📍    │────│   ⬇️    │
│         │    │         │    │         │    │         │    │         │    │         │    │         │    │         │
│Documents│    │ Loading │    │  Site   │    │ Member  │    │Inspec-  │    │  NCRs   │    │   Pin   │    │ Exports │
│         │    │Schedule │    │ Manager │    │Register │    │ tions   │    │         │    │Correct. │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
   GREEN          GREEN          GREEN          BLUE           GRAY           GRAY           GRAY           GRAY
```

---

## 📱 Component 3: Vertical Progress Bar

**Perfect for**: Sidebar navigation, mobile views

```
┌────────────────────────────────┐
│                                │
│  ●  Documents              ✓   │
│  │  Upload schedules           │
│  │                             │
│  ●  Loading Schedule       ✓   │
│  │  Parse data                 │
│  │                             │
│  ●  Site Manager          ✓   │
│  │  Organize drawings          │
│  │                             │
│  ●  Member Register       ⏰   │  ← Current
│  │  Register members           │
│  │                             │
│  ○  Inspections                │
│  │  Conduct inspections        │
│  │                             │
│  ○  NCRs                       │
│  │  Track issues               │
│  │                             │
│  ○  Pin Corrections            │
│  │  Review pins                │
│  │                             │
│  ○  Exports                    │
│     Generate reports           │
│                                │
└────────────────────────────────┘
```

---

## 🎨 Color Scheme

### Stage Status Colors

**Completed Stages**
- Background: `rgba(34, 197, 94, 0.2)` - Light green
- Border: `rgba(34, 197, 94, 0.5)` - Medium green
- Text: `rgb(74, 222, 128)` - Bright green
- Icon: Green checkmark ✓

**Active Stage** (Current working stage)
- Background: `rgba(59, 130, 246, 0.2)` - Light blue
- Border: `rgba(59, 130, 246, 0.5)` - Medium blue
- Text: `rgb(96, 165, 250)` - Bright blue
- Icon: Clock ⏰

**Pending Stages** (Not started)
- Background: `rgba(51, 65, 85, 0.5)` - Dark slate
- Border: `rgba(71, 85, 105, 0.5)` - Medium slate
- Text: `rgb(100, 116, 139)` - Slate
- Icon: Stage-specific icon (gray)

### Connector Lines

**Between completed stages**: Green line
**Between pending stages**: Gray line

---

## 💡 Implementation Examples

### Example 1: Project Header Integration

```tsx
<div className="project-header">
  <h1>Alfriston Commercial Tower</h1>
  <div className="header-actions">
    {/* Compact progress indicator */}
    <WorkflowProgressIndicator projectId={projectId} />

    <button>Workflow Status</button>
    <button>Site Mode</button>
  </div>
</div>
```

**Result**:
```
┌──────────────────────────────────────────────────────────────┐
│ Alfriston Commercial Tower                                   │
│                                    [5/8 Stages ████████░░]   │
│                                    [Workflow Status]          │
│                                    [Site Mode]               │
└──────────────────────────────────────────────────────────────┘
```

### Example 2: Dashboard Card

```tsx
<div className="project-card">
  <h3>Alfriston Commercial Tower</h3>
  <WorkflowProgressIndicator projectId={projectId} />
  <WorkflowProgressBar
    projectId={projectId}
    orientation="horizontal"
    compact={true}
  />
</div>
```

**Result**:
```
┌─────────────────────────────────────────┐
│ Alfriston Commercial Tower              │
│                                          │
│ [5/8 Stages (63%) ████████████░░░░]    │
│                                          │
│ ●──●──●──●──●──○──○──○                 │
│ ✓  ✓  ✓  ✓  ✓  ○  ○  ○                 │
│                                          │
└─────────────────────────────────────────┘
```

### Example 3: Full Page Progress View

```tsx
<div className="progress-page">
  <h2>Project Workflow Progress</h2>
  <WorkflowProgressBar
    projectId={projectId}
    currentStage="inspections"
    orientation="horizontal"
    showLabels={true}
    compact={false}
  />
</div>
```

**Result**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Project Workflow Progress                            │
│                                                                          │
│       ●────────────●────────────●────────────●────────────○             │
│       ✓            ✓            ✓            ⏰            ○             │
│   Documents    Loading Sch   Site Mgr    Inspections    NCRs           │
│   Upload       Parse data    Organize    ← Current      Track           │
│   schedules                  drawings    Conduct        issues          │
│                                          inspections                     │
│                                                                          │
│       ○────────────○────────────○                                       │
│       ○            ○            ○                                       │
│  Pin Correct.   Exports                                                 │
│  Review pins    Generate                                                │
│                 reports                                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📱 Responsive Behavior

### Desktop (> 1024px)
- Full horizontal layout
- All 8 stages visible
- Complete labels and descriptions

### Tablet (768px - 1024px)
- Horizontal scroll enabled
- Shortened labels
- Icons remain visible

### Mobile (< 768px)
- Switches to vertical layout automatically
- Collapsible descriptions
- Touch-friendly spacing

---

## 🔄 Real-time Updates

The progress bar automatically updates when:

1. **Documents uploaded**: Documents stage → Completed ✓
2. **Schedule parsed**: Loading Schedule stage → Completed ✓
3. **Pins placed**: Site Manager stage → Completed ✓
4. **Members registered**: Member Register stage → Completed ✓
5. **Inspection created**: Inspections stage → Completed ✓
6. **NCR logged**: NCRs stage → Completed ✓
7. **Pin correction reviewed**: Pin Corrections stage → Completed ✓
8. **Report exported**: Exports stage → Completed ✓

---

## 🎯 Key Features

✅ **Auto-detection** - Queries database to determine completion
✅ **Real-time status** - Updates reflect current project state
✅ **Visual clarity** - Color-coded stages (green/blue/gray)
✅ **Responsive design** - Works on all screen sizes
✅ **Accessible** - WCAG compliant color contrast
✅ **Performant** - Optimized database queries (LIMIT 1)
✅ **Flexible** - Horizontal or vertical orientations
✅ **Customizable** - Compact or detailed views

---

## 📊 Database Tracking

Each stage completion is determined by checking specific tables:

| Stage | Database Check |
|-------|---------------|
| Documents | `documents` table has records |
| Loading Schedule | `loading_schedule_imports` with status completed/needs_review |
| Site Manager | `drawing_pins` table has records |
| Member Register | `members` table has records |
| Inspections | `inspections` table has records |
| NCRs | `ncrs` table has records |
| Pin Corrections | `pin_corrections` table has records |
| Exports | `inspection_readings` table has records |

---

## 🚀 Quick Start

1. **Import component**:
```tsx
import { WorkflowProgressIndicator } from '../components/WorkflowProgressIndicator';
```

2. **Add to header**:
```tsx
<WorkflowProgressIndicator projectId={project.id} />
```

3. **That's it!** The component handles everything automatically.

---

## 📝 Notes

- Component uses RLS policies - ensure authenticated user has project access
- Progress calculations run on component mount
- Refreshes automatically when component remounts
- No manual refresh needed - user navigation triggers updates
- Optimized queries use `LIMIT 1` for fast performance

---

**Created**: 2026-03-09
**Technology**: React + TypeScript + Supabase
**Framework**: Tailwind CSS
**Icons**: Lucide React
