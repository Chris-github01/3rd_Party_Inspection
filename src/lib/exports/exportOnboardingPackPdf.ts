import jsPDF from 'jspdf';
import { supabase } from '../supabase';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  onboarding_config: any;
}

export async function exportOnboardingPackPdf(organization: Organization): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  const config = organization.onboarding_config || {};

  let logoDataUrl: string | null = null;
  if (organization.logo_url) {
    try {
      logoDataUrl = await loadLogoAsDataUrl(organization.logo_url);
    } catch (error) {
      console.warn('Failed to load logo, continuing without it:', error);
    }
  }

  let currentPage = 1;

  if (config.includeCoverPage !== false) {
    addCoverPage(doc, organization, config, logoDataUrl, pageWidth, pageHeight, margin);
    currentPage++;
  }

  if (config.includeSubscriptionAgreement !== false) {
    if (currentPage > 1) doc.addPage();
    addSubscriptionAgreement(doc, organization, config, pageWidth, pageHeight, margin, contentWidth);
    currentPage++;
  }

  if (config.includeDirectDebitAuthority !== false) {
    if (currentPage > 1) doc.addPage();
    addDirectDebitAuthority(doc, organization, config, pageWidth, pageHeight, margin, contentWidth);
    currentPage++;
  }

  if (config.includeOrganisationSetup !== false) {
    if (currentPage > 1) doc.addPage();
    addOrganisationSetup(doc, organization, config, pageWidth, pageHeight, margin, contentWidth);
    currentPage++;
  }

  if (config.includeAuthorisedSignatory !== false) {
    if (currentPage > 1) doc.addPage();
    addAuthorisedSignatory(doc, organization, config, pageWidth, pageHeight, margin, contentWidth);
  }

  const filename = `verifytrade_client_onboarding_pack_${slugify(organization.name)}.pdf`;
  doc.save(filename);
}

function addCoverPage(
  doc: jsPDF,
  organization: Organization,
  config: any,
  logoDataUrl: string | null,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  let yPos = 40;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, yPos, 60, 20);
      yPos += 30;
    } catch (error) {
      console.warn('Failed to add logo to PDF:', error);
      yPos += 10;
    }
  }

  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('VerifyTrade', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(config.platformTagline || 'Commercial Trade Compliance Platform', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text('A service operated by', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(config.serviceOperatedBy || 'P&R Consulting Limited', pageWidth / 2, yPos, { align: 'center' });
  yPos += 25;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Client Onboarding Pack', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  const description = doc.splitTextToSize(
    'This document contains the required forms and agreements to onboard your organisation to the VerifyTrade platform.',
    pageWidth - 2 * margin - 20
  );
  doc.text(description, pageWidth / 2, yPos, { align: 'center' });
  yPos += description.length * 6 + 15;

  doc.setFillColor(249, 250, 251);
  doc.rect(margin + 10, yPos, pageWidth - 2 * margin - 20, 40, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin + 10, yPos, pageWidth - 2 * margin - 20, 40, 'S');

  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('Included Documents:', margin + 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  const items = [
    'Enterprise Subscription Agreement',
    'Direct Debit Authority',
    'Organisation Onboarding Details'
  ];
  items.forEach(item => {
    doc.text(`- ${item}`, margin + 15, yPos);
    yPos += 5;
  });

  yPos = pageHeight - 40;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('Return completed documents to:', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text(config.returnEmail || 'admin@verifytrade.co.nz', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(config.footerLine || 'VerifyTrade | Commercial Compliance Platform | Operated by P&R Consulting Limited', pageWidth / 2, yPos, { align: 'center' });
}

function addSubscriptionAgreement(
  doc: jsPDF,
  organization: Organization,
  config: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
) {
  let yPos = margin;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('1. VerifyTrade Enterprise Subscription Agreement', margin, yPos);
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  const description = doc.splitTextToSize(
    `This agreement is entered into between ${config.serviceOperatedBy || 'P&R Consulting Limited'} (trading as VerifyTrade) and the Client Organisation listed below for the provision of the VerifyTrade platform services.`,
    contentWidth
  );
  doc.text(description, margin, yPos);
  yPos += description.length * 5 + 10;

  const fields = [
    { label: 'Client Organisation Name', width: contentWidth },
    { label: 'Trading Name', width: contentWidth },
    { label: 'Registered Address', width: contentWidth },
    { label: 'Authorised Representative', width: contentWidth }
  ];

  fields.forEach(field => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(field.label + ':', margin, yPos);
    yPos += 5;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, margin + field.width, yPos);
    yPos += 8;
  });

  yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Subscription Details', margin, yPos);
  yPos += 7;

  const subscriptionDetails = [
    { label: 'Package', value: config.packageName || 'VerifyTrade Full Package - 5 Users' },
    { label: 'Billing Frequency', value: config.billingFrequency || 'Monthly' },
    { label: 'Subscription Fee', value: config.subscriptionFeeLabel || 'NZD ______ per month excl GST' }
  ];

  doc.setFontSize(10);
  subscriptionDetails.forEach(detail => {
    doc.setFont('helvetica', 'bold');
    doc.text(detail.label + ':', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(detail.value, margin + 45, yPos);
    yPos += 6;
  });

  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const agreementDesc = doc.splitTextToSize(
    config.agreementDescription || 'The VerifyTrade platform provides commercial quote auditing, compliance review tools, and reporting capabilities designed to support construction commercial management.',
    contentWidth
  );
  doc.text(agreementDesc, margin, yPos);

  addFooter(doc, config, pageWidth, pageHeight);
}

function addDirectDebitAuthority(
  doc: jsPDF,
  organization: Organization,
  config: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
) {
  let yPos = margin;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('2. Direct Debit Authority', margin, yPos);
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  const description = doc.splitTextToSize(
    config.debitAuthorityDescription || 'I/We authorise P&R Consulting Limited trading as VerifyTrade to debit the nominated bank account for the monthly subscription relating to the VerifyTrade platform.',
    contentWidth
  );
  doc.text(description, margin, yPos);
  yPos += description.length * 5 + 10;

  const fields = [
    { label: 'Account Name', width: contentWidth },
    { label: 'Bank Name', width: contentWidth / 2 - 5 },
    { label: 'Bank Account Number', width: contentWidth / 2 - 5 }
  ];

  fields.forEach((field, index) => {
    if (index === 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(field.label + ':', margin, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, margin + field.width, yPos);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(fields[2].label + ':', margin + field.width + 10, yPos - 5);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + field.width + 10, yPos, pageWidth - margin, yPos);
      yPos += 8;
    } else if (index < 2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(field.label + ':', margin, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, margin + field.width, yPos);
      yPos += 8;
    }
  });

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Preferred Debit Date:', margin, yPos);
  yPos += 7;

  const dates = ['1st', '5th', '10th', '15th', '20th', 'Other ______'];
  const boxSize = 4;
  const spacing = 25;

  dates.forEach((date, index) => {
    const xPos = margin + (index % 3) * spacing;
    const yBoxPos = yPos + Math.floor(index / 3) * 8;

    doc.rect(xPos, yBoxPos - 3, boxSize, boxSize);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(date, xPos + boxSize + 2, yBoxPos);
  });

  yPos += 25;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  const notice = doc.splitTextToSize(
    'This authority will remain in effect until cancelled in writing with at least 7 days notice prior to the next billing cycle.',
    contentWidth
  );
  doc.text(notice, margin, yPos);

  addFooter(doc, config, pageWidth, pageHeight);
}

function addOrganisationSetup(
  doc: jsPDF,
  organization: Organization,
  config: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
) {
  let yPos = margin;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('3. Organisation Setup Details', margin, yPos);
  yPos += 12;

  const fields = [
    { label: 'Legal Organisation Name', width: contentWidth },
    { label: 'Industry Type', value: config.industryType, width: contentWidth / 2 - 5 },
    { label: 'Primary Trade Focus', value: config.primaryTradeFocus, width: contentWidth / 2 - 5 },
    { label: 'Typical Project Size', value: config.projectSizeRange, width: contentWidth }
  ];

  fields.forEach((field, index) => {
    if (index === 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(field.label + ':', margin, yPos);
      if (field.value) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`(Default: ${field.value})`, margin + 30, yPos);
      }
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, margin + field.width, yPos);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      doc.text(fields[2].label + ':', margin + field.width + 10, yPos - 5);
      if (fields[2].value) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`(Default: ${fields[2].value})`, margin + field.width + 10 + 42, yPos - 5);
      }
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + field.width + 10, yPos, pageWidth - margin, yPos);
      yPos += 8;
    } else if (index < 2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      doc.text(field.label + ':', margin, yPos);
      if (field.value) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`(Default: ${field.value})`, margin + 55, yPos);
      }
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, margin + field.width, yPos);
      yPos += 8;
    } else if (index === 3) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      doc.text(field.label + ':', margin, yPos);
      if (field.value) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`(Default: ${field.value})`, margin + 50, yPos);
      }
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, margin + field.width, yPos);
      yPos += 8;
    }
  });

  yPos += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('Primary Contact Details', margin, yPos);
  yPos += 7;

  const contactFields = [
    { label: 'Owner Full Name', width: contentWidth },
    { label: 'Role / Title', width: contentWidth / 2 - 5 },
    { label: 'Email', width: contentWidth / 2 - 5 },
    { label: 'Phone', width: contentWidth }
  ];

  contactFields.forEach((field, index) => {
    if (index === 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(field.label + ':', margin, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, margin + field.width, yPos);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(contactFields[2].label + ':', margin + field.width + 10, yPos - 5);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + field.width + 10, yPos, pageWidth - margin, yPos);
      yPos += 8;
    } else if (index < 2 || index > 2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(field.label + ':', margin, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, margin + field.width, yPos);
      yPos += 8;
    }
  });

  yPos += 8;
  doc.setFillColor(239, 246, 255);
  doc.rect(margin, yPos, contentWidth, 18, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.rect(margin, yPos, contentWidth, 18, 'S');
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Note:', margin + 3, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(37, 99, 235);
  doc.text('Please also provide your company logo (PNG or SVG format) to be included in your', margin + 3, yPos);
  yPos += 4;
  doc.text('organisation workspace.', margin + 3, yPos);

  addFooter(doc, config, pageWidth, pageHeight);
}

function addAuthorisedSignatory(
  doc: jsPDF,
  organization: Organization,
  config: any,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
) {
  let yPos = margin;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('4. Authorised Signatory', margin, yPos);
  yPos += 15;

  const fields = [
    { label: 'Name', width: contentWidth },
    { label: 'Position', width: contentWidth },
    { label: 'Signature', width: contentWidth / 2 - 5, isSignature: true },
    { label: 'Date', width: contentWidth / 2 - 5 }
  ];

  fields.forEach((field, index) => {
    if (index === 2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(field.label + ':', margin, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, margin + field.width, yPos);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(fields[3].label + ':', margin + field.width + 10, yPos - 5);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + field.width + 10, yPos, pageWidth - margin, yPos);
      yPos += 12;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(field.label + ':', margin, yPos);
      yPos += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, margin + field.width, yPos);
      yPos += 10;
    }
  });

  yPos += 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('Return completed documents to:', margin, yPos);
  yPos += 7;

  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text(config.returnEmail || 'admin@verifytrade.co.nz', margin, yPos);

  addFooter(doc, config, pageWidth, pageHeight);
}

function addFooter(doc: jsPDF, config: any, pageWidth: number, pageHeight: number) {
  const yPos = pageHeight - 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text(
    config.footerLine || 'VerifyTrade | Commercial Compliance Platform | Operated by P&R Consulting Limited',
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
}

async function loadLogoAsDataUrl(logoPath: string): Promise<string> {
  if (logoPath.startsWith('http')) {
    const response = await fetch(logoPath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(logoPath);

    if (error) throw error;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(data);
    });
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
