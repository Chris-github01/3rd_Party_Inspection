# Infrastructure Security Configuration Guide
**Fire Protection Inspection Application**
**Date:** February 26, 2026

---

## OVERVIEW

This document outlines the remaining security configurations that must be completed via the **Supabase Dashboard**. These settings cannot be applied via SQL migrations and require manual configuration by a Supabase project administrator.

**Status:** ✅ Database migrations completed, ⚠️ Dashboard configurations pending

---

## ✅ COMPLETED FIXES

### 1. Function Search Path Security (CRITICAL)
**Status:** ✅ FIXED via Migration

**Issue:** 10 database functions had role-mutable search_path, vulnerable to search_path injection attacks (CWE-426).

**Fix Applied:**
- Migration: `fix_function_search_path_security.sql`
- Set explicit `search_path = public, pg_catalog` for all affected functions
- Prevents privilege escalation and SQL injection via search_path manipulation

**Functions Fixed:**
1. `approve_loading_and_create_members(uuid, uuid)`
2. `calculate_project_workflow_state(uuid)`
3. `get_executive_summary_data(uuid)`
4. `get_introduction_data(uuid)`
5. `get_next_pin_number(uuid)`
6. `get_pin_photos_with_urls(uuid)`
7. `get_workflow_blocking_reasons(uuid, text)`
8. `get_workflow_diagnostics(uuid)`
9. `log_workflow_event(uuid, text, jsonb)`
10. `recompute_project_workflow_state(uuid)`

**Security Impact:**
- BEFORE: Attackers could create malicious schemas/functions to hijack function execution
- AFTER: Functions use fixed, secure search_path; attack vector eliminated

**Verification:**
```sql
-- Verify search_path is now set
SELECT
  p.proname,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as is_security_definer,
  p.proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%workflow%'
ORDER BY p.proname;
```

---

### 2. Unused Index Removal (PERFORMANCE)
**Status:** ✅ FIXED via Migration

**Issue:** 67 unused indexes consuming storage and degrading write performance.

**Fix Applied:**
- Migration: `remove_unused_indexes.sql`
- Removed all verified unused indexes
- Preserved primary keys, unique constraints, and foreign key relationships

**Indexes Removed by Category:**
- Workflow Events: 4 indexes
- Projects Metadata: 14 indexes
- Foreign Keys: 8 indexes
- Documents: 3 indexes
- Drawing Pins: 12 indexes
- Inspections: 7 indexes
- NCRs: 3 indexes
- Materials/Exports: 4 indexes
- Pin Corrections: 9 indexes
- Pin Photos: 3 indexes

**Total Removed:** 67 indexes

**Performance Benefits:**
- ✅ Faster INSERT/UPDATE/DELETE operations
- ✅ Reduced storage consumption
- ✅ Lower index maintenance overhead
- ✅ Improved VACUUM performance
- ✅ Reduced memory footprint

**Safety:**
- All indexes verified as unused via `pg_stat_user_indexes`
- Can be recreated if needed using `CREATE INDEX CONCURRENTLY` (no downtime)
- Monitor query performance post-deployment with `EXPLAIN ANALYZE`

---

## ⚠️ REQUIRED DASHBOARD CONFIGURATIONS

The following security issues must be fixed via the **Supabase Dashboard**. These are infrastructure-level settings that cannot be applied via SQL migrations.

---

### 1. LEAKED PASSWORD PROTECTION (HIGH PRIORITY)
**Status:** ⚠️ REQUIRES DASHBOARD CONFIGURATION
**Severity:** HIGH
**Category:** Authentication Security

**Issue:**
Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org database. This feature is currently **DISABLED**, allowing users to register with known compromised passwords.

**Risk:**
- Users can set passwords that are known to be compromised
- Increased risk of credential stuffing attacks
- Weak authentication security posture
- Violation of NIST password guidelines

**How to Fix:**

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/[YOUR-PROJECT-ID]

2. **Open Authentication Settings**
   - Click **Authentication** in left sidebar
   - Click **Settings** tab

3. **Enable Leaked Password Protection**
   - Scroll to **Password Settings** section
   - Find **"Check for leaked passwords"** toggle
   - **Enable** this setting
   - Click **Save**

4. **Verification**
   - Try registering with a known compromised password (e.g., "password123")
   - Registration should be rejected with error message
   - Existing users with compromised passwords should be prompted to change on next login (optional)

**Expected Behavior After Fix:**
```javascript
// Attempt to register with compromised password
const { error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'  // Known compromised password
});

// Should receive error:
// "Password has been found in a data breach and cannot be used"
```

**Configuration Screenshot Location:**
`Authentication > Settings > Password Settings > "Check for leaked passwords"`

**Priority:** HIGH - Enable before production launch

---

### 2. MULTI-FACTOR AUTHENTICATION OPTIONS (MEDIUM PRIORITY)
**Status:** ⚠️ REQUIRES DASHBOARD CONFIGURATION
**Severity:** MEDIUM
**Category:** Authentication Security

**Issue:**
Project has insufficient MFA (Multi-Factor Authentication) options enabled, weakening account security. Only a single MFA method is available (or none).

**Risk:**
- Single point of failure for authentication
- Limited flexibility for users
- Reduced security for high-privilege accounts (admins, inspectors)
- Non-compliance with security best practices

**Recommended MFA Methods:**

1. **Time-based One-Time Password (TOTP)** - Google Authenticator, Authy, etc.
2. **SMS-based OTP** - Text message verification
3. **Email-based OTP** - Email verification codes

**How to Fix:**

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/[YOUR-PROJECT-ID]

2. **Open Authentication Settings**
   - Click **Authentication** in left sidebar
   - Click **Settings** tab

3. **Enable MFA Methods**
   - Scroll to **Multi-Factor Authentication** section
   - Enable **TOTP (Authenticator Apps)**:
     - Toggle **"Enable TOTP"**
     - Set minimum AAL (Authentication Assurance Level) if needed

   - Enable **Phone Auth (SMS)** (optional):
     - Configure SMS provider (Twilio, MessageBird, etc.)
     - Toggle **"Enable Phone Auth"**

   - Enable **Email OTP** (optional):
     - Toggle **"Enable Email OTP"**
     - Configure email templates

4. **Enforce MFA for Specific Roles (Recommended)**
   - Use RLS policies to require AAL2 (MFA) for admin operations
   - Example RLS policy:
     ```sql
     CREATE POLICY "Admins must use MFA"
     ON sensitive_table
     AS RESTRICTIVE
     FOR ALL
     TO authenticated
     USING (
       (auth.jwt()->>'aal') = 'aal2'  -- Requires MFA
       OR
       (auth.jwt()->>'role') != 'admin'  -- Or not admin
     );
     ```

5. **User Enrollment**
   - Update frontend to prompt users to enroll in MFA
   - Provide clear instructions for setting up authenticator apps
   - Allow users to choose their preferred MFA method

**Implementation in Code:**
```typescript
// Check MFA enrollment status
const { data: { user } } = await supabase.auth.getUser();
const hasMFA = user?.factors && user.factors.length > 0;

// Enroll in TOTP MFA
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp'
});

// Display QR code for user to scan
// data.qr_code contains the QR code
// data.secret contains backup code

// Verify and activate MFA
const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
  factorId: data.id,
  code: '123456'  // Code from authenticator app
});
```

**Configuration Screenshot Location:**
`Authentication > Settings > Multi-Factor Authentication`

**Priority:** MEDIUM - Implement within 2-4 weeks

---

### 3. AUTH DATABASE CONNECTION STRATEGY (MEDIUM PRIORITY)
**Status:** ⚠️ REQUIRES DASHBOARD CONFIGURATION
**Severity:** MEDIUM
**Category:** Performance & Scalability

**Issue:**
Auth server is configured to use a fixed maximum of **10 connections** instead of percentage-based allocation. Increasing instance size will NOT improve Auth server performance without manually adjusting this setting.

**Risk:**
- Auth server cannot scale with database upgrades
- Performance bottleneck during high concurrent authentication
- Manual intervention required after every instance upgrade
- Suboptimal resource utilization

**Current Configuration:**
- Max Auth Connections: **10 (fixed)**
- Total DB Connections: Varies by instance size
- Problem: Auth connections don't scale with instance

**How to Fix:**

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/[YOUR-PROJECT-ID]

2. **Open Database Settings**
   - Click **Database** in left sidebar
   - Click **Settings** tab

3. **Update Connection Pooling**
   - Scroll to **Connection Pooling** section
   - Find **Auth Server Connection Strategy**
   - Change from **"Fixed Number"** to **"Percentage"**
   - Set percentage to **5-10%** of total connections
   - Example:
     - Small instance (100 connections): 10% = 10 connections
     - Medium instance (200 connections): 10% = 20 connections
     - Large instance (500 connections): 10% = 50 connections

4. **Recommended Settings:**
   - **Auth Server:** 5-10% of total connections
   - **REST API (PostgREST):** 15-20% of total connections
   - **Realtime:** 5-10% of total connections
   - **Storage:** 5% of total connections
   - **Remaining:** Application direct connections

5. **Save and Apply**
   - Click **Save**
   - Changes apply immediately (no restart required)

**Verification:**
```sql
-- Check current connection usage
SELECT
  datname,
  usename,
  application_name,
  state,
  COUNT(*) as connection_count
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY datname, usename, application_name, state
ORDER BY connection_count DESC;
```

**Configuration Screenshot Location:**
`Database > Settings > Connection Pooling > Auth Server Strategy`

**Priority:** MEDIUM - Update before scaling to larger instance

---

### 4. POSTGRES VERSION UPGRADE (CRITICAL)
**Status:** ⚠️ REQUIRES DASHBOARD ACTION
**Severity:** CRITICAL
**Category:** Security Patches

**Issue:**
Current Postgres version **supabase-postgres-15.8.1.023** has outstanding security patches available. Running outdated database version exposes system to known vulnerabilities.

**Risk:**
- Known security vulnerabilities remain unpatched
- Potential data breach from exploited CVEs
- Compliance violations (SOC2, ISO27001, etc.)
- Performance improvements and bug fixes missing

**Current Version:** supabase-postgres-15.8.1.023
**Latest Version:** Check Supabase dashboard for latest available

**How to Fix:**

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/[YOUR-PROJECT-ID]

2. **Open Database Settings**
   - Click **Database** in left sidebar
   - Click **Settings** tab

3. **Check for Updates**
   - Scroll to **Database Version** section
   - Review available updates
   - Read release notes for breaking changes

4. **Create Backup (CRITICAL)**
   - Before upgrading, create full database backup
   - Method 1: Use Supabase Dashboard backup feature
   - Method 2: Manual pg_dump:
     ```bash
     pg_dump -h db.PROJECT_ID.supabase.co \
             -U postgres \
             -d postgres \
             --format=custom \
             --file=backup_before_upgrade.dump
     ```

5. **Plan Maintenance Window**
   - Upgrades require brief downtime (usually 2-10 minutes)
   - Schedule during low-traffic period
   - Notify users in advance
   - Prepare rollback plan

6. **Perform Upgrade**
   - Click **Upgrade Database**
   - Confirm upgrade
   - Wait for completion (monitor status in dashboard)
   - Database will be briefly unavailable

7. **Post-Upgrade Verification**
   - Test all critical application features
   - Check error logs for any issues
   - Verify RLS policies still function correctly
   - Run smoke tests on key workflows
   - Monitor performance metrics

**Verification Queries:**
```sql
-- Check current version
SELECT version();

-- Check for any failed functions
SELECT
  proname,
  prosrc
FROM pg_proc
WHERE proname IN (
  'approve_loading_and_create_members',
  'get_executive_summary_data',
  'get_introduction_data'
)
ORDER BY proname;

-- Verify indexes are still dropped
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Configuration Screenshot Location:**
`Database > Settings > Database Version`

**Priority:** CRITICAL - Schedule upgrade within 1 week

---

## RECOMMENDED SECURITY MONITORING

After completing all dashboard configurations, implement ongoing security monitoring:

### 1. Connection Monitoring
```sql
-- Monitor connection pool usage
SELECT
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active,
  COUNT(*) FILTER (WHERE state = 'idle') as idle,
  MAX(backend_start) as oldest_connection
FROM pg_stat_activity
WHERE datname = 'postgres';
```

### 2. Failed Authentication Monitoring
```sql
-- Check auth logs for failed attempts (if available)
-- This may require enabling auth event logging in Supabase
SELECT
  event_type,
  COUNT(*) as event_count,
  MAX(created_at) as last_occurrence
FROM auth.audit_log_entries
WHERE event_type IN ('user_signedup', 'user_signin_failed', 'user_deleted')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type;
```

### 3. Performance Monitoring
```sql
-- Monitor slow queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries taking > 100ms average
ORDER BY total_exec_time DESC
LIMIT 20;
```

---

## SUMMARY CHECKLIST

### ✅ Completed (Automated via Migrations)
- [x] Fix function search_path vulnerabilities (10 functions)
- [x] Remove 67 unused database indexes
- [x] Apply search_path security to all database functions

### ⚠️ Pending (Manual Dashboard Configuration)
- [ ] Enable leaked password protection (HIGH)
- [ ] Configure multiple MFA options (MEDIUM)
- [ ] Switch to percentage-based connection pooling (MEDIUM)
- [ ] Upgrade Postgres to latest version with security patches (CRITICAL)

### 📊 Next Steps
1. **Immediate (Within 24-48 hours):**
   - Schedule Postgres version upgrade
   - Create database backup before upgrade
   - Test upgrade in staging environment (if available)

2. **High Priority (Within 1 week):**
   - Enable leaked password protection
   - Perform Postgres upgrade
   - Verify all functions work post-upgrade

3. **Medium Priority (Within 2-4 weeks):**
   - Enable additional MFA methods
   - Switch to percentage-based connection pooling
   - Implement security monitoring dashboards

4. **Ongoing:**
   - Monitor connection usage
   - Review failed authentication attempts
   - Track database performance metrics
   - Keep Postgres version up to date

---

## SUPPORT & RESOURCES

### Supabase Documentation
- **Password Policies:** https://supabase.com/docs/guides/auth/auth-password-requirements
- **Multi-Factor Auth:** https://supabase.com/docs/guides/auth/auth-mfa
- **Connection Pooling:** https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
- **Database Upgrades:** https://supabase.com/docs/guides/platform/migrating-and-upgrading-projects

### Security Best Practices
- OWASP Authentication Cheat Sheet
- NIST Password Guidelines (SP 800-63B)
- PostgreSQL Security Best Practices

### Contact
For assistance with Supabase dashboard configurations:
- Supabase Support: https://supabase.com/support
- Community Forum: https://github.com/supabase/supabase/discussions

---

**Document Version:** 1.0
**Last Updated:** February 26, 2026
**Status:** Database migrations complete, dashboard configs pending
