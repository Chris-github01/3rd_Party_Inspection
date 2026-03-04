# Multi-Organization Support - Quick Start Guide

## What's New?

The inspection report system now supports multiple organizations! Each project can be assigned to a specific organization, and reports will automatically use that organization's branding (logo, name, address, etc.).

## Getting Started in 3 Steps

### Step 1: View Your Organizations

1. Log in to the system
2. Click **Settings** in the sidebar
3. Click **Organizations**

You should see your existing organization (migrated automatically from your previous company settings).

### Step 2: Create a New Organization (Optional)

If you work with multiple organizations:

1. On the Organizations page, click **Create Organization**
2. Fill in the organization details:
   - **Name** (required) - e.g., "Acme Inspection Services"
   - **Address** - Your organization's physical address
   - **Phone** - Contact phone number
   - **Email** - Contact email
   - **Website** - Your organization's website
   - **Logo** - Upload your logo (PNG or JPG, max 5MB)
   - **Active** - Check to make this organization available for projects
3. Click **Create Organization**

### Step 3: Create a Project with Organization

1. Navigate to **Projects**
2. Click **Create Project**
3. Fill in project details as usual
4. **New Field**: Select an **Organization** from the dropdown
5. The selected organization's branding will automatically appear in all reports for this project
6. Click **Create Project**

That's it! Your project is now linked to the organization, and all reports will use the correct branding.

## Key Features

### Organizations Management

**Access**: Settings → Organizations

**What You Can Do**:
- View all organizations in a grid layout
- Search organizations by name, email, or phone
- See which organizations are active/inactive
- Create new organizations
- Edit existing organizations
- Delete unused organizations (only if no projects are using them)
- Upload and update logos

### Project Creation

**New Requirement**: You must select an organization when creating a project.

**What Happens**:
- Organization selector appears in the create project form
- Only active organizations are shown
- First active organization is pre-selected by default
- If no active organizations exist, project creation is disabled until you create one

### Report Generation

**Automatic Branding**: When you generate any report (introduction, executive summary, complete report, etc.), the system automatically uses the project's assigned organization:

- Organization name
- Organization logo
- Address
- Phone
- Email
- Website

**No Extra Steps**: You don't need to select the organization when generating reports - it's automatic based on the project.

## Common Tasks

### Add a New Organization

```
Settings → Organizations → Create Organization
→ Fill in details → Upload logo → Save
```

### Edit Organization Details

```
Settings → Organizations → Find organization
→ Click Edit → Update details → Save Changes
```

### Make Organization Inactive

```
Settings → Organizations → Find organization
→ Click Edit → Uncheck "Active" → Save Changes
```

Inactive organizations won't appear in the project creation dropdown but existing projects using them will continue to work.

### Change Project's Organization

Currently, you cannot change a project's organization after creation. If you need to change it:

1. **Option A**: Create a new project with the correct organization
2. **Option B**: Contact support for manual database update

### Delete an Organization

```
Settings → Organizations → Find organization
→ Click Delete button → Confirm
```

**Note**: You cannot delete organizations that are being used by projects. You must either:
- Mark the organization as inactive instead, OR
- Delete all projects using that organization first (not recommended)

## FAQ

**Q: What happened to my existing company settings?**
A: Your existing company settings were automatically migrated to a new organization. You'll find it in Settings → Organizations.

**Q: Do I need to update my existing projects?**
A: No, all existing projects were automatically linked to your migrated organization.

**Q: Can I have multiple organizations with the same name?**
A: Yes, but it's not recommended as it can be confusing. Use unique names.

**Q: What if I upload a very large logo?**
A: Logos are limited to 5MB. Use a smaller file or compress your image.

**Q: Will this affect my existing reports?**
A: No, existing reports remain unchanged. New reports generated after this update will use the multi-organization system.

**Q: Can I switch organizations between projects?**
A: Not currently through the UI. Contact support if you need to reassign a project to a different organization.

**Q: What if I don't want to use multiple organizations?**
A: That's fine! Continue using your single organization. The system works the same way, you just now have the option to add more if needed.

**Q: Can different users manage different organizations?**
A: Currently, all admin users can manage all organizations. Organization-level permissions may be added in a future update.

## Tips & Best Practices

### Logo Guidelines
- **Recommended size**: 300x100 pixels
- **Formats**: PNG or JPG
- **Background**: Transparent PNG works best
- **File size**: Keep under 500KB for faster loading

### Organization Naming
- Use full legal business names
- Include relevant identifiers if you have multiple divisions
- Example: "Acme Inspection Services Ltd"
- Example: "Acme - Northern Division"

### Active vs Inactive
- Mark organizations as **Active** if they should appear in project creation
- Mark as **Inactive** for:
  - Retired/closed organizations
  - Organizations no longer taking new projects
  - Test organizations

### Organization Management
- Regularly review and clean up unused organizations
- Keep contact information up to date
- Update logos when rebranding
- Use meaningful organization names for easy selection

## Troubleshooting

### Problem: "No active organizations found"

**Cause**: All organizations are marked as inactive, or no organizations exist.

**Solution**:
1. Go to Settings → Organizations
2. Create a new organization, OR
3. Edit an existing organization and check "Active"

### Problem: Cannot create project

**Cause**: No active organizations available.

**Solution**: Create at least one active organization first.

### Problem: Wrong logo in reports

**Cause**: Logo not uploaded or incorrect organization selected.

**Solution**:
1. Check organization settings - ensure logo is uploaded
2. Verify correct organization was selected when creating project
3. Re-generate the report

### Problem: Organization details not updating in reports

**Cause**: Reports are generated at the time of export using current organization data.

**Solution**:
1. Update organization details in Settings → Organizations
2. Re-generate the report

## Need Help?

If you encounter issues or have questions:
1. Check this quick start guide
2. Review the full implementation plan
3. Contact your system administrator
4. Contact technical support

---

**Version**: 1.0
**Last Updated**: March 4, 2026
**Feature Status**: Live

Enjoy your new multi-organization capabilities! 🎉
