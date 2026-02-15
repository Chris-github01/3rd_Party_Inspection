# Theme Conversion Status

## Completed Files

### Main Components
- ✅ **CreateClientModal.tsx** - Fully converted to dark blue theme
  - Modal backgrounds: `bg-slate-800 backdrop-blur-sm`
  - Text labels: `text-white`
  - Form inputs: `border-slate-600 bg-slate-700 text-white placeholder-slate-400`
  - Error messages: `bg-red-500/10 border border-red-200 text-red-400`
  - Buttons: Borders updated to `border-slate-600`, hover to `hover:bg-slate-700`

## Files Pending Conversion

### Main Components
- CreateProjectModal.tsx
- DocumentsTab.tsx
- ExecutiveSummaryPreview.tsx
- ExportAttachmentsTab.tsx
- ExportsTab.tsx
- ImageUpload.tsx
- InspectionsTab.tsx
- InspectionStatusManager.tsx
- IntroductionPreview.tsx
- MemberDataViewer.tsx
- MembersTab.tsx
- NCRsTab.tsx
- ProjectWizard.tsx
- SimulationModePanel.tsx
- SiteManagerTab.tsx
- SteelMemberSelect.tsx

### Wizard Components
- wizard/WizardStep1.tsx
- wizard/WizardStep2.tsx
- wizard/WizardStep3.tsx
- wizard/WizardStep4.tsx
- wizard/WizardStep5.tsx
- wizard/WizardStep6.tsx
- wizard/WizardStep7.tsx

### Site Manager Components
- site-manager/AddBlockModal.tsx
- site-manager/AddLevelModal.tsx
- site-manager/AddPinModal.tsx
- site-manager/UploadDrawingModal.tsx
- site-manager/PinDetailModal.tsx
- ✅ site-manager/DrawingViewer.tsx (already dark themed)

## Conversion Rules Applied

### Background Colors
- `bg-white` → `bg-slate-800 backdrop-blur-sm` (for modals with solid backgrounds)
- `bg-slate-50` → `bg-white/10 backdrop-blur-sm`

### Border Colors
- `border-slate-200` → `border-slate-700`
- `border-slate-300` → `border-slate-600`

### Text Colors
- `text-slate-900` → `text-white`
- `text-slate-800` → `text-white`
- `text-slate-700` → `text-white`
- `text-slate-600` → `text-slate-300`
- `text-slate-500` → `text-slate-400`
- `text-slate-400` → `text-slate-400` (keep as is)

### Brand Colors
- `bg-blue-100` → `bg-primary-500/20`
- `bg-blue-50` → `bg-primary-500/10`
- `text-blue-600` → `text-primary-400`
- `bg-green-100` → `bg-green-500/20`
- `text-green-600` → `text-green-400`
- `bg-red-100` → `bg-red-500/20`
- `bg-red-50` → `bg-red-500/10`
- `text-red-600` → `text-red-400`
- `text-red-700` → `text-red-400`

### Interactive States
- `hover:bg-slate-50` → `hover:bg-slate-700`
- `hover:bg-slate-100` → `hover:bg-slate-700`
- `focus:border-blue-500` → `focus:border-primary-500`
- `focus:ring-blue-500` → `focus:ring-primary-500`

### Form Inputs (Special Rule)
For modal form inputs, apply comprehensive styling:
- `border-slate-300` → `border-slate-600 bg-slate-700 text-white placeholder-slate-400`

## Next Steps

To complete the conversion, apply the above rules systematically to each remaining file. The pattern established in CreateClientModal.tsx should be followed for all modal components.
