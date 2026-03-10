# PDF Generated Files Feature

## Overview
Added a complete system for storing, displaying, downloading, and deleting generated PDF files from InspectPDF operations.

## What Was Added

### 1. Database Schema
- **New Table**: `pdf_generated_files`
  - Stores metadata for all generated PDF files
  - Links to workspace and operation
  - Tracks filename, file path, size, page count, and operation type
  - Includes RLS policies for secure access

### 2. Storage Bucket
- **New Bucket**: `pdf-generated-files`
  - Stores actual PDF file data
  - 50MB file size limit
  - Secure storage policies ensuring users can only access their own files

### 3. UI Component
- **GeneratedFilesPanel**: New component displaying all generated files
  - Shows file information (name, size, page count, creation date)
  - Download button for each file
  - Delete button for each file
  - Operation type badge (Merged PDF, Split PDF, Rotated PDF, etc.)
  - Real-time updates when new files are generated

### 4. Integration
- **InspectPDFWorkspace**: Updated to include the GeneratedFilesPanel
  - Displayed in a right sidebar (320px width)
  - Automatically saves generated files from:
    - **Merge operations**: Saves the merged PDF
    - **Split operations**: Saves all split PDF parts
    - **Rotate operations**: Saves the rotated PDF
  - Files refresh automatically after operations complete

## How It Works

### When You Merge PDFs
1. The merged PDF is created
2. It's automatically saved to the `pdf-generated-files` storage bucket
3. A database record is created with file metadata
4. The file appears in the "Generated Files" panel on the right
5. You can download or delete it at any time

### When You Split PDFs
1. Multiple PDF files are created (one for each split part)
2. All parts are saved to storage
3. Database records are created for each part
4. All parts appear in the "Generated Files" panel
5. Each part can be downloaded or deleted independently

### When You Rotate PDFs
1. The rotated PDF is created
2. It's saved to storage with metadata about the rotation (degrees, affected pages)
3. It appears in the "Generated Files" panel
4. You can download or delete it

## Security
- All files are protected by Row Level Security (RLS)
- Users can only see, download, and delete their own generated files
- Storage policies ensure files are isolated by user ID
- No public access to any generated files

## UI Layout
```
┌─────────────────────────────────────────────────────────────┐
│                        Header (Download Button)              │
├──────────┬──────────────────────────────────┬───────────────┤
│          │                                   │               │
│ PDF      │      PDF Preview                 │  Generated    │
│ Operations│      (Main Viewer)              │  Files        │
│ Panel    │                                   │  Panel        │
│          │                                   │               │
│ - Merge  │                                   │  - File 1     │
│ - Split  │                                   │  - File 2     │
│ - Rotate │                                   │  - File 3     │
│ - Extract│                                   │               │
│          │                                   │               │
└──────────┴──────────────────────────────────┴───────────────┘
```

## File Information Displayed
For each generated file:
- File name
- Operation type badge (blue)
- File size (KB or MB)
- Page count (if available)
- Creation date and time
- Download button
- Delete button

## User Experience
1. Perform any PDF operation (merge, split, rotate)
2. Wait for the operation to complete
3. The generated files automatically appear in the right panel
4. Click the download button to save any file to your computer
5. Click the delete button to remove files you no longer need
6. Files persist across sessions until you delete them
