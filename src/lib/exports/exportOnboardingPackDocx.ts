import { supabase } from '../supabase';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  onboarding_config: any;
}

export async function exportOnboardingPackDocx(organization: Organization): Promise<void> {
  const config = organization.onboarding_config || {};

  let content = '';

  if (config.includeCoverPage !== false) {
    content += generateCoverPage(organization, config);
  }

  if (config.includeSubscriptionAgreement !== false) {
    content += '\n\n' + generateSubscriptionAgreement(organization, config);
  }

  if (config.includeDirectDebitAuthority !== false) {
    content += '\n\n' + generateDirectDebitAuthority(organization, config);
  }

  if (config.includeOrganisationSetup !== false) {
    content += '\n\n' + generateOrganisationSetup(organization, config);
  }

  if (config.includeAuthorisedSignatory !== false) {
    content += '\n\n' + generateAuthorisedSignatory(organization, config);
  }

  const htmlContent = generateHtmlDocument(content, organization, config);

  const blob = new Blob([htmlContent], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `verifytrade_client_onboarding_pack_${slugify(organization.name)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function generateHtmlDocument(content: string, organization: Organization, config: any): string {
  return `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>VerifyTrade Client Onboarding Pack</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1f2937;
    }
    h1 {
      font-size: 24pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 0;
      margin-bottom: 12pt;
    }
    h2 {
      font-size: 18pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 24pt;
      margin-bottom: 12pt;
    }
    h3 {
      font-size: 14pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 16pt;
      margin-bottom: 8pt;
    }
    .cover-title {
      text-align: center;
      font-size: 32pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 40pt;
    }
    .cover-subtitle {
      text-align: center;
      font-size: 14pt;
      color: #4b5563;
      margin-top: 12pt;
    }
    .cover-service {
      text-align: center;
      font-size: 11pt;
      color: #6b7280;
      margin-top: 15pt;
    }
    .cover-company {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      color: #1f2937;
      margin-top: 8pt;
    }
    .cover-heading {
      text-align: center;
      font-size: 24pt;
      font-weight: bold;
      color: #2563eb;
      margin-top: 25pt;
      margin-bottom: 15pt;
    }
    .cover-description {
      text-align: center;
      color: #4b5563;
      margin-top: 15pt;
      margin-bottom: 25pt;
    }
    .cover-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 15pt;
      margin: 20pt 40pt;
    }
    .cover-box-title {
      font-weight: bold;
      margin-bottom: 8pt;
    }
    .cover-box-item {
      margin-left: 15pt;
      margin-bottom: 5pt;
    }
    .return-section {
      text-align: center;
      margin-top: 40pt;
    }
    .return-email {
      color: #2563eb;
      font-size: 12pt;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      font-size: 9pt;
      color: #9ca3af;
      margin-top: 12pt;
    }
    .field-label {
      font-weight: bold;
      font-size: 9pt;
      margin-top: 10pt;
      margin-bottom: 3pt;
    }
    .field-line {
      border-bottom: 1px solid #d1d5db;
      min-height: 20pt;
      margin-bottom: 10pt;
    }
    .checkbox {
      display: inline-block;
      width: 12pt;
      height: 12pt;
      border: 1px solid #000;
      margin-right: 6pt;
      vertical-align: middle;
    }
    .note-box {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 10pt;
      margin: 15pt 0;
      color: #1e40af;
    }
    .note-title {
      font-weight: bold;
      margin-bottom: 5pt;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

function generateCoverPage(organization: Organization, config: any): string {
  return `
    <div class="cover-title">VerifyTrade</div>
    <div class="cover-subtitle">${config.platformTagline || 'Commercial Trade Compliance Platform'}</div>
    <div class="cover-service">A service operated by</div>
    <div class="cover-company">${config.serviceOperatedBy || 'P&R Consulting Limited'}</div>
    <div class="cover-heading">Client Onboarding Pack</div>
    <div class="cover-description">
      This document contains the required forms and agreements to onboard your organisation to the VerifyTrade platform.
    </div>
    <div class="cover-box">
      <div class="cover-box-title">Included Documents:</div>
      <div class="cover-box-item">- Enterprise Subscription Agreement</div>
      <div class="cover-box-item">- Direct Debit Authority</div>
      <div class="cover-box-item">- Organisation Onboarding Details</div>
    </div>
    <div class="return-section">
      <div style="font-weight: bold; margin-bottom: 7pt;">Return completed documents to:</div>
      <div class="return-email">${config.returnEmail || 'admin@verifytrade.co.nz'}</div>
      <div class="footer">${config.footerLine || 'VerifyTrade | Commercial Compliance Platform | Operated by P&R Consulting Limited'}</div>
    </div>
  `;
}

function generateSubscriptionAgreement(organization: Organization, config: any): string {
  return `
    <div class="page-break"></div>
    <h2>1. VerifyTrade Enterprise Subscription Agreement</h2>
    <p>
      This agreement is entered into between ${config.serviceOperatedBy || 'P&R Consulting Limited'} (trading as VerifyTrade)
      and the Client Organisation listed below for the provision of the VerifyTrade platform services.
    </p>

    <div class="field-label">Client Organisation Name:</div>
    <div class="field-line"></div>

    <div class="field-label">Trading Name:</div>
    <div class="field-line"></div>

    <div class="field-label">Registered Address:</div>
    <div class="field-line">${formatRegisteredAddress(config)}</div>

    <div class="field-label">Authorised Representative:</div>
    <div class="field-line">${formatAuthorisedRep(config)}</div>

    <h3>Subscription Details</h3>
    <p><strong>Package:</strong> ${config.packageName || 'VerifyTrade Full Package - 5 Users'}</p>
    <p><strong>Billing Frequency:</strong> ${config.billingFrequency || 'Monthly'}</p>
    <p><strong>Subscription Fee:</strong> ${config.subscriptionFeeLabel || 'NZD ______ per month excl GST'}</p>

    <p style="margin-top: 15pt;">
      ${config.agreementDescription || 'The VerifyTrade platform provides commercial quote auditing, compliance review tools, and reporting capabilities designed to support construction commercial management.'}
    </p>

    <div class="footer">${config.footerLine || 'VerifyTrade | Commercial Compliance Platform | Operated by P&R Consulting Limited'}</div>
  `;
}

function generateDirectDebitAuthority(organization: Organization, config: any): string {
  return `
    <div class="page-break"></div>
    <h2>2. Direct Debit Authority</h2>
    <p>
      ${config.debitAuthorityDescription || 'I/We authorise P&R Consulting Limited trading as VerifyTrade to debit the nominated bank account for the monthly subscription relating to the VerifyTrade platform.'}
    </p>

    <div class="field-label">Account Name:</div>
    <div class="field-line"></div>

    <div class="field-label">Bank Name:</div>
    <div class="field-line"></div>

    <div class="field-label">Bank Account Number:</div>
    <div class="field-line"></div>

    <div class="field-label">Preferred Debit Date:</div>
    <p style="margin-top: 10pt;">
      <span class="checkbox"></span> 1st &nbsp;&nbsp;&nbsp;
      <span class="checkbox"></span> 5th &nbsp;&nbsp;&nbsp;
      <span class="checkbox"></span> 10th &nbsp;&nbsp;&nbsp;
      <span class="checkbox"></span> 15th &nbsp;&nbsp;&nbsp;
      <span class="checkbox"></span> 20th &nbsp;&nbsp;&nbsp;
      <span class="checkbox"></span> Other ______
    </p>

    <p style="margin-top: 20pt; color: #6b7280; font-size: 9pt;">
      This authority will remain in effect until cancelled in writing with at least 7 days notice prior to the next billing cycle.
    </p>

    <div class="footer">${config.footerLine || 'VerifyTrade | Commercial Compliance Platform | Operated by P&R Consulting Limited'}</div>
  `;
}

function generateOrganisationSetup(organization: Organization, config: any): string {
  return `
    <div class="page-break"></div>
    <h2>3. Organisation Setup Details</h2>

    <div class="field-label">Legal Organisation Name:</div>
    <div class="field-line"></div>

    <div class="field-label">Industry Type: ${config.industryType ? `(Default: ${config.industryType})` : ''}</div>
    <div class="field-line"></div>

    <div class="field-label">Primary Trade Focus: ${config.primaryTradeFocus ? `(Default: ${config.primaryTradeFocus})` : ''}</div>
    <div class="field-line"></div>

    <div class="field-label">Typical Project Size: ${config.projectSizeRange ? `(Default: ${config.projectSizeRange})` : ''}</div>
    <div class="field-line"></div>

    <h3>Primary Contact Details</h3>

    <div class="field-label">Owner Full Name:</div>
    <div class="field-line"></div>

    <div class="field-label">Role / Title:</div>
    <div class="field-line"></div>

    <div class="field-label">Email:</div>
    <div class="field-line"></div>

    <div class="field-label">Phone:</div>
    <div class="field-line"></div>

    <h3>Platform Administrator</h3>

    <div class="field-label">Platform Administrator Full Name:</div>
    <div class="field-line">${formatPlatformAdmin(config)}</div>

    <div class="field-label">Platform Administrator Email:</div>
    <div class="field-line">${config.platformAdministrator?.email || ''}</div>

    <div class="field-label">Platform Administrator Phone:</div>
    <div class="field-line">${config.platformAdministrator?.phone || ''}</div>

    <div class="note-box">
      <div class="note-title">Note:</div>
      <div>Please also provide your company logo (PNG or SVG format) to be included in your organisation workspace.</div>
    </div>

    <div class="footer">${config.footerLine || 'VerifyTrade | Commercial Compliance Platform | Operated by P&R Consulting Limited'}</div>
  `;
}

function generateAuthorisedSignatory(organization: Organization, config: any): string {
  return `
    <div class="page-break"></div>
    <h2>4. Authorised Signatory</h2>

    <div class="field-label">Name:</div>
    <div class="field-line"></div>

    <div class="field-label">Position:</div>
    <div class="field-line"></div>

    <div class="field-label">Signature:</div>
    <div class="field-line"></div>

    <div class="field-label">Date:</div>
    <div class="field-line"></div>

    <div style="margin-top: 40pt;">
      <h3>Return completed documents to:</h3>
      <p class="return-email">${config.returnEmail || 'admin@verifytrade.co.nz'}</p>
    </div>

    <div class="footer">${config.footerLine || 'VerifyTrade | Commercial Compliance Platform | Operated by P&R Consulting Limited'}</div>
  `;
}

function formatRegisteredAddress(config: any): string {
  const address = config.registeredAddress || {};
  if (!address.line1) return '';

  const parts = [
    address.line1,
    address.line2,
    address.suburb,
    address.city,
    address.postcode,
    address.country
  ].filter(Boolean);

  return parts.join(', ');
}

function formatAuthorisedRep(config: any): string {
  const rep = config.authorisedRepresentative || {};
  if (!rep.name) return '';

  let text = rep.name;
  if (rep.title) text += ` (${rep.title})`;
  if (rep.email) text += ` - ${rep.email}`;

  return text;
}

function formatPlatformAdmin(config: any): string {
  const admin = config.platformAdministrator || {};
  if (!admin.fullName) return '';

  return admin.fullName;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
