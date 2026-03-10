/*
  # Add Onboarding Configuration to Organizations

  1. New Column
    - `onboarding_config` (jsonb) - Stores onboarding pack configuration and defaults
  
  2. Configuration Structure
    - Service/branding details (serviceOperatedBy, returnEmail, platformTagline)
    - Subscription agreement details (packageName, billingFrequency, subscriptionFeeLabel, agreementDescription)
    - Direct debit authority details (debitAuthorityDescription, preferredDebitDateOptions)
    - Organization setup defaults (countryRegion, industryType, primaryTradeFocus, projectSizeRange, jurisdictionCodeSet, complianceRole)
    - Signature/return details (footerLine)
    - Section toggles (includeCoverPage, includeSubscriptionAgreement, etc.)
  
  3. Security
    - No additional RLS policies needed (inherits from organizations table)
    - Only users with organization access can modify
*/

-- Add onboarding_config column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS onboarding_config jsonb DEFAULT '{
  "serviceOperatedBy": "P&R Consulting Limited",
  "returnEmail": "admin@verifytrade.co.nz",
  "platformTagline": "Commercial Trade Compliance Platform",
  "packageName": "VerifyTrade Full Package - 5 Users",
  "billingFrequency": "Monthly",
  "subscriptionFeeLabel": "NZD ______ per month excl GST",
  "agreementDescription": "The VerifyTrade platform provides commercial quote auditing, compliance review tools, and reporting capabilities designed to support construction commercial management.",
  "debitAuthorityDescription": "I/We authorise P&R Consulting Limited trading as VerifyTrade to debit the nominated bank account for the monthly subscription relating to the VerifyTrade platform.",
  "preferredDebitDateOptions": ["1st", "5th", "10th", "15th", "20th", "Other"],
  "countryRegion": "New Zealand",
  "industryType": "Main Contractor",
  "primaryTradeFocus": "Passive Fire Protection",
  "projectSizeRange": "Less than $5m",
  "jurisdictionCodeSet": "NZBC",
  "complianceRole": "Awarding Party",
  "footerLine": "VerifyTrade | Commercial Compliance Platform | Operated by P&R Consulting Limited",
  "includeCoverPage": true,
  "includeSubscriptionAgreement": true,
  "includeDirectDebitAuthority": true,
  "includeOrganisationSetup": true,
  "includeAuthorisedSignatory": true
}'::jsonb;

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_organizations_onboarding_config 
ON organizations USING gin(onboarding_config);
