# 3rd Party Coatings Inspector

A production-ready web application for independent NACE-style audit inspections of intumescent and cementitious fireproofing on structural steel.

## Features

### Project Management
- Create and manage multiple inspection projects
- Store project details including client information, site address, and references
- Track project progress with comprehensive dashboard

### Document Management
- Upload and organize project documents (drawings, fire schedules, steel schedules, PDS, SDS)
- Secure file storage with Supabase Storage
- Document categorization and viewing

### Member Register
- Manage steel member inventory (beams, columns, braces)
- Track coating specifications and requirements
- CSV import/export functionality
- Status tracking (not started, in progress, pass, repair required, closed)

### Comprehensive Inspections
- Create detailed inspection records per member
- Environmental condition monitoring with automatic dew point spread calculation
- Surface preparation verification
- Material traceability checks
- DFT (Dry Film Thickness) batch management with automatic statistics calculation
- Photo evidence upload and management
- Automated pass/fail determination based on required specifications

### NCR Management
- Create and track Non-Conformance Reports
- Severity classification (minor, major, critical)
- Issue type categorization
- Corrective action tracking
- Status workflow management

### PDF Export
- Generate professional audit inspection reports
- Includes executive summary, standards references, DFT summary tables
- Detailed inspection records and NCR listings
- Ready for client delivery

### Security & Authentication
- Role-based access control (Admin, Inspector, Client-ReadOnly)
- Secure authentication with Supabase Auth
- Row Level Security (RLS) on all database tables
- Inspectors can create/edit, clients have read-only access

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **PDF Generation:** jsPDF + jspdf-autotable
- **CSV Handling:** PapaParse
- **Date Handling:** date-fns
- **Routing:** React Router v6

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase project set up

### Installation

1. Clone the repository

2. Install dependencies:
```bash
npm install
```

3. Environment variables are already configured in `.env` file

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Usage

### First Time Setup

1. **Register a User**
   - Navigate to `/register`
   - Create an account with role (Admin, Inspector, or Client)
   - Recommended demo credentials: inspector@demo.com / demo123

2. **Demo Project**
   - A demo project "Alfriston College 3rd Party Inspection" is pre-loaded
   - Contains sample members ready for inspection
   - Use this to familiarize yourself with the system

3. **Create Your First Project**
   - Click "New Project" on the dashboard
   - Fill in project details
   - Upload relevant documents

4. **Add Members**
   - Navigate to Member Register tab
   - Add members manually or import via CSV
   - Specify coating system and required DFT values

5. **Conduct Inspections**
   - Go to Inspections tab
   - Click "New Inspection"
   - Select member and fill in all inspection details
   - System automatically calculates DFT statistics and dew point spread
   - Pass/fail determination based on requirements

6. **Generate Reports**
   - Navigate to Exports tab
   - Click "Generate Report"
   - Professional PDF audit report will be downloaded

### CSV Import Format

For bulk member import, use CSV with these columns:
```
member_mark,element_type,section,level,block,frr_minutes,coating_system,required_dft_microns,required_thickness_mm,notes
B734,beam,610UB125,L2,B,120,SC601,580,,Main structural beam
C105,column,310UC118,L1,A,90,SC601,480,,Primary column
```

## Business Rules

1. **DFT Compliance**
   - Inspection cannot be marked PASS if average DFT < required DFT
   - System automatically flags non-compliant readings

2. **Environmental Conditions**
   - Dew point spread must be ≥ 3°C for conformance
   - Automatic calculation: Steel Temp - Dew Point

3. **Calibration Checks**
   - Gauge calibration due dates are tracked
   - Warning displayed if overdue

4. **Member Status**
   - Status automatically updates based on latest inspection
   - NCR creation sets member to "repair required"

5. **NCR Workflow**
   - Open → In Progress → Ready for Reinspect → Closed
   - Closure requires corrective actions and passing reinspection

## Database Schema

The application uses 14 main tables:
- `user_profiles` - Extended user information with roles
- `projects` - Project master data
- `documents` - File references
- `members` - Steel member register
- `inspections` - Inspection records
- `env_readings` - Environmental conditions
- `surface_prep_checks` - Surface preparation verification
- `material_checks` - Product traceability
- `dft_batches` - DFT measurement batches
- `dft_readings` - Individual DFT readings
- `photos` - Photo evidence
- `drawing_pins` - Location markers on drawings
- `ncrs` - Non-conformance reports
- `ncr_actions` - NCR action logs

All tables have Row Level Security (RLS) enabled with appropriate policies.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Standards Compliance

The application follows industry standards:
- ISO 19840 - Paints and varnishes corrosion protection
- ISO 8501-1 - Steel substrate preparation
- FPA NZ COP-3 - Passive fire protection code of practice

## Architecture

### File Organization

```
src/
├── components/        # React components (tabs, modals)
├── contexts/         # React contexts (AuthContext)
├── lib/             # Utilities and configurations
├── pages/           # Page components (Dashboard, ProjectDetail, etc.)
├── App.tsx          # Main app with routing
└── main.tsx         # Entry point
```

### Key Features Implementation

- **Autosave** - Inspection forms autosave every 5 seconds (ready for implementation)
- **Offline Support** - Local storage draft saving (ready for implementation)
- **Drawing Pinning** - Interactive drawing viewer with member location pins (ready for implementation)
- **Real-time Calculations** - DFT statistics and dew point spread calculated on input
- **Validation** - Comprehensive form validation with clear error messages

## Security

- All database operations protected by Row Level Security
- Authentication required for all routes
- Role-based authorization (Admin/Inspector can edit, Client read-only)
- Secure file storage with signed URLs
- No sensitive data exposed in client code

## Support

For issues, questions, or feature requests, please refer to the project documentation or contact the development team.

## License

Proprietary - All rights reserved
