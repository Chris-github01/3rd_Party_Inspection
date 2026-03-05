# Instructions: Update Your GitHub Repository

Follow these steps to deploy the Jotun parser update:

## Step 1: Copy File Contents

You need to update 2 files in your GitHub repository. The complete file contents are below.

## Step 2: Update Files on GitHub

### Option A: Using GitHub Web Interface (Easiest)

1. Go to https://github.com/Chris-github01/3rd_Party_Inspection
2. Navigate to `python-parser/parser.py`
3. Click the pencil icon (Edit this file)
4. Delete all content and paste the new `parser.py` content from below
5. Scroll down and click "Commit changes"
6. Repeat for `python-parser/main.py`

### Option B: Using Git Command Line

1. Open your local `3rd_Party_Inspection` folder
2. Update the two files with the content below
3. Run these commands:
   ```bash
   git add python-parser/parser.py python-parser/main.py
   git commit -m "Add Jotun loading schedule parser support"
   git push origin main
   ```

## Step 3: Wait for Automatic Deployment

1. Go back to your Render dashboard
2. You'll see a new deployment start automatically
3. Wait for it to show "Deploy live"

---

## File 1: parser.py

See the file at: `/tmp/cc-agent/63715896/project/python-parser/parser.py`
(1113 lines - too large to include here)

To get this file:
- Copy it from your current workspace at `python-parser/parser.py`
- Or view it in the file explorer and copy all contents

---

## File 2: main.py

See below for the complete contents of `main.py`.

---

# After Deployment

Once Render shows "Deploy live", test the parser by:
1. Go back to your app
2. Navigate to a project
3. Click "Upload Loading Schedule"
4. Upload your Jotun PDF
5. It should now parse correctly and show the steel members
