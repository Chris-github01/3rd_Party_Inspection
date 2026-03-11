import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Download, FileText, Layers, AlertCircle, Camera, CreditCard as Edit3, CheckSquare } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { PDFDocument } from 'pdf-lib';
import { createDividerPage } from '../lib/pdfUtils';
import { InspectedMemberSelector } from './InspectedMemberSelector';
import { PhotoExportPinSelector } from './PhotoExportPinSelector';
import { generateInspectionReportWithPhotos } from '../lib/pdfInspectionWithPhotos';
import { generateEnhancedInspectionReportWithPhotos } from '../lib/pdfInspectionWithPhotosEnhanced';
import { generateQuantityReadingsPhotoReport } from '../lib/pdfQuantityReadingsWithPhotos';
import { generateIntroduction } from '../lib/introductionGenerator';
import { generateExecutiveSummary } from '../lib/executiveSummaryGenerator';
import { addIntroductionToPDF } from '../lib/pdfIntroduction';
import { addExecutiveSummaryToPDF } from '../lib/pdfExecutiveSummary';
import { addMarkupDrawingsSection } from '../lib/pdfMarkupDrawings';
import { blobToCleanDataURL } from '../lib/pinPhotoUtils';
import { calculateReadingStats, buildHistogram } from '../lib/readingStatistics';

async function generateProfessionalDFTReport(
  projectData: any,
  members: any[],
  readingsMap: Map<string, any[]>
) {
  console.log('🎨 Starting Professional DFT Report Generation');
  console.log('📊 Project:', projectData?.name);
  console.log('👥 Members to process:', members.length);
  console.log('📈 Readings map size:', readingsMap.size);

  const doc = new jsPDF();
  const logoUrl = projectData?.organizations?.logo_url;
  const companyName = projectData?.organizations?.name || 'P&R Consulting Limited';

  let processedMembers = 0;

  for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
    const member = members[memberIndex];
    const readings = readingsMap.get(member.id) || [];

    console.log(`📝 Processing member ${memberIndex + 1}/${members.length}: ${member.member_mark}`);
    console.log(`   Readings found: ${readings.length}`);

    if (readings.length === 0) {
      console.log(`   ⚠️ Skipping member ${member.member_mark} - no readings`);
      continue;
    }

    try {
      const dftValues = readings.map((r: any) => r.dft_average);
      console.log(`   DFT values: ${dftValues.length} readings, range: ${Math.min(...dftValues).toFixed(1)} - ${Math.max(...dftValues).toFixed(1)} µm`);

      const stats = calculateReadingStats(dftValues);
      const histogram = buildHistogram(dftValues, 8);

      console.log(`   Stats calculated: mean=${stats.mean.toFixed(1)}, min=${stats.min.toFixed(1)}, max=${stats.max.toFixed(1)}`);
      console.log(`   Histogram bins: ${histogram.length}`);

    // Page 1: Summary with Metadata and Charts
    if (memberIndex > 0) doc.addPage();

    let yPos = 20;

    // Header
    if (logoUrl) {
      try {
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        const dataUrl = await blobToCleanDataURL(blob);
        doc.addImage(dataUrl, 'PNG', 15, 10, 40, 20);
      } catch (error) {
        console.warn('Failed to load logo:', error);
      }
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DFT Inspection Report', 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(12);
    doc.text(`Member: ${member.member_mark}`, 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Section: ${member.section || 'N/A'} | Required DFT: ${member.required_dft_microns} µm`, 20, yPos);
    yPos += 15;

    // Metadata panels
    const metadataY = yPos;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);

    // Project info
    doc.roundedRect(15, metadataY, 85, 25, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Project', 18, metadataY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(projectData?.name || 'N/A', 18, metadataY + 10);

    // Statistics
    doc.roundedRect(110, metadataY, 85, 25, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text('Statistics', 113, metadataY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Avg: ${stats.mean.toFixed(1)} µm | Min: ${stats.min.toFixed(1)} µm`, 113, metadataY + 10);
    doc.text(`Max: ${stats.max.toFixed(1)} µm | Readings: ${readings.length}`, 113, metadataY + 15);

    yPos = metadataY + 30;

    // Simple histogram
    const histWidth = 170;
    const histHeight = 60;
    const histX = 20;
    const histY = yPos;

    doc.setDrawColor(100, 100, 100);
    doc.line(histX, histY + histHeight, histX + histWidth, histY + histHeight);
    doc.line(histX, histY, histX, histY + histHeight);

    const maxFreq = Math.max(...histogram.map(b => b.count), 1);
    const barWidth = histWidth / histogram.length;

    histogram.forEach((bin, i) => {
      const barHeight = maxFreq > 0 ? (bin.count / maxFreq) * histHeight : 0;
      const x = histX + i * barWidth;
      const y = histY + histHeight - barHeight;

      doc.setFillColor(59, 130, 246);
      doc.rect(x + 2, y, barWidth - 4, barHeight, 'F');

      doc.setFontSize(7);
      doc.text(`${Math.round(bin.start)}-${Math.round(bin.end)}`, x + barWidth / 2, histY + histHeight + 5, { align: 'center' });
    });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DFT Distribution (µm)', histX + histWidth / 2, histY - 5, { align: 'center' });

    // Page 2: Readings Table
    doc.addPage();
    yPos = 20;

    if (logoUrl) {
      try {
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        const dataUrl = await blobToCleanDataURL(blob);
        doc.addImage(dataUrl, 'PNG', 15, 10, 40, 20);
      } catch (error) {
        console.warn('Failed to load logo:', error);
      }
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Inspection Readings', 105, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Member: ${member.member_mark}`, 20, yPos);
    yPos += 10;

    const tableData = readings.map((r: any) => [
      format(new Date(r.created_at), 'dd/MM/yyyy HH:mm'),
      r.sequence_number.toString(),
      `${r.dft_average.toFixed(1)} µm`,
      r.reading_type || 'Standard'
    ]);

      autoTable(doc, {
        head: [['Date/Time', 'Reading #', 'Thickness', 'Type']],
        body: tableData,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { bottom: 30 }
      });

      processedMembers++;
      console.log(`   ✅ Member ${member.member_mark} processed successfully`);
    } catch (memberError: any) {
      console.error(`   ❌ Error processing member ${member.member_mark}:`, memberError);
      console.error('   Error details:', memberError.message, memberError.stack);
      // Continue with next member
    }
  }

  console.log(`📊 Processed ${processedMembers} members out of ${members.length}`);

  if (processedMembers === 0) {
    throw new Error('No members with readings were found to generate the report. Please ensure selected members have inspection readings.');
  }

  // Add footers to all pages
  console.log('📄 Adding footers to all pages...');
  const totalPages = doc.getNumberOfPages();
  console.log(`   Total pages: ${totalPages}`);

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Prepared by ${companyName}`, 105, 285, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, 105, 290, { align: 'center' });
  }

  const filename = `Professional_DFT_Report_${(projectData?.name || 'Report').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  console.log(`💾 Saving PDF: ${filename}`);
  doc.save(filename);
  console.log('✅ Professional DFT Report generated successfully!');
}

interface Project {
  id: string;
  name: string;
  client_name: string;
  main_contractor: string;
  site_address: string;
  project_ref: string;
}


export function ExportsTab({ project }: { project: Project }) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [generatingMerged, setGeneratingMerged] = useState(false);
  const [generatingPhotoReport, setGeneratingPhotoReport] = useState(false);
  const [generatingEnhancedPhotoReport, setGeneratingEnhancedPhotoReport] = useState(false);
  const [generatingQuantityPhotoReport, setGeneratingQuantityPhotoReport] = useState(false);
  const [generatingProfessionalReport, setGeneratingProfessionalReport] = useState(false);
  const [selectedPinIds, setSelectedPinIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);

  useEffect(() => {
    loadAttachments();
  }, [project.id]);

  const loadAttachments = async () => {
    try {
      const { data: attachmentsData, error } = await supabase
        .from('project_export_attachments')
        .select('*')
        .eq('project_id', project.id)
        .eq('is_active', true)
        .order('sequence_no', { ascending: true});

      if (error) {
        console.warn('project_export_attachments table not found or error loading:', error);
        setAttachments([]);
        setLoadingAttachments(false);
        return;
      }

      // Manually fetch related documents
      if (attachmentsData && attachmentsData.length > 0) {
        const documentIds = attachmentsData.map(a => a.document_id);
        const { data: docs } = await supabase
          .from('documents')
          .select('id, filename, storage_path, size_bytes, mime_type')
          .in('id', documentIds);

        // Also fetch converted documents if they exist
        const convertedIds = attachmentsData
          .map(a => a.converted_pdf_document_id)
          .filter(id => id != null);

        let convertedDocs = [];
        if (convertedIds.length > 0) {
          const { data: converted } = await supabase
            .from('documents')
            .select('id, storage_path')
            .in('id', convertedIds);
          convertedDocs = converted || [];
        }

        // Also fetch user profiles
        const userIds = [...new Set(attachmentsData.map(a => a.uploaded_by_user_id).filter(id => id != null))];
        let userProfiles = [];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, name')
            .in('id', userIds);
          userProfiles = profiles || [];
        }

        // Combine the data
        const enrichedAttachments = attachmentsData.map(att => {
          const doc = docs?.find(d => d.id === att.document_id);
          const converted = convertedDocs.find(d => d.id === att.converted_pdf_document_id);
          const user = userProfiles.find(u => u.id === att.uploaded_by_user_id);

          return {
            ...att,
            documents: doc || { filename: 'Unknown', storage_path: '', size_bytes: 0, mime_type: '' },
            converted_documents: converted || null,
            user_profiles: user || null
          };
        });

        setAttachments(enrichedAttachments);
      } else {
        setAttachments([]);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const generateAuditReport = async (): Promise<jsPDF> => {
    console.log('📝 Starting audit report generation...');

    // Generate Introduction and Executive Summary using dedicated generators
    console.log('🔍 Fetching introduction and executive summary data...');
    const [introductionData, executiveSummaryData] = await Promise.all([
      generateIntroduction(project.id).catch(err => {
        console.error('⚠️ Error generating introduction:', err);
        console.error('Introduction error details:', err.message, err.stack);
        return null;
      }),
      generateExecutiveSummary(project.id).catch(err => {
        console.error('⚠️ Error generating executive summary:', err);
        console.error('Executive summary error details:', err.message, err.stack);
        return null;
      })
    ]);

    console.log('📊 Introduction data:', introductionData ? 'Retrieved' : 'Failed/Null');
    console.log('📊 Executive summary data:', executiveSummaryData ? 'Retrieved' : 'Failed/Null');

    console.log('🗄️ Fetching database records...');
    const [
      membersRes,
      inspectionsRes,
      ncrsRes,
      simulatedMemberSetsRes,
      quantityReadingsRes,
      companySettingsFallbackRes,
      projectDetailsRes,
    ] = await Promise.all([
      supabase.from('members').select('*').eq('project_id', project.id).order('member_mark'),
      supabase
        .from('inspections')
        .select('*, members(member_mark)')
        .eq('project_id', project.id)
        .order('inspection_date_time'),
      supabase.from('ncrs').select('*').eq('project_id', project.id),
      supabase
        .from('inspection_member_sets')
        .select('*, inspection_member_readings(*)')
        .in(
          'inspection_id',
          (await supabase.from('inspections').select('id').eq('project_id', project.id)).data?.map(
            (i) => i.id
          ) || []
        ),
      supabase.from('inspection_readings').select('*').eq('project_id', project.id).order('member_id, sequence_number'),
      supabase.from('company_settings').select('*').limit(1).maybeSingle(),
      supabase.from('projects').select(`
        *,
        clients(name, company),
        organizations(id, name, logo_url, address, phone, email, website)
      `).eq('id', project.id).single(),
    ]);

    // Check for errors in database queries
    if (membersRes.error) {
      console.error('❌ Error fetching members:', membersRes.error);
      throw new Error('Failed to fetch members: ' + membersRes.error.message);
    }
    if (inspectionsRes.error) {
      console.error('❌ Error fetching inspections:', inspectionsRes.error);
      throw new Error('Failed to fetch inspections: ' + inspectionsRes.error.message);
    }
    if (ncrsRes.error) {
      console.error('❌ Error fetching NCRs:', ncrsRes.error);
      throw new Error('Failed to fetch NCRs: ' + ncrsRes.error.message);
    }
    if (projectDetailsRes.error) {
      console.error('❌ Error fetching project details:', projectDetailsRes.error);
      throw new Error('Failed to fetch project details: ' + projectDetailsRes.error.message);
    }

    console.log('✅ Database records fetched successfully');

    const members = membersRes.data || [];
    const inspections = inspectionsRes.data || [];
    const ncrs = ncrsRes.data || [];
    const dftBatches: any[] = [];
    const simulatedMemberSets = simulatedMemberSetsRes.data || [];
    const quantityReadings = quantityReadingsRes.data || [];
    const companySettingsFallback = companySettingsFallbackRes.data;
    const projectDetails = projectDetailsRes.data;
    const orgSettings = projectDetails?.organizations || companySettingsFallback;

    // Debug: Log organization settings
    console.log('🏢 Organization Settings:', {
      projectDetails: projectDetails,
      organizations: projectDetails?.organizations,
      orgSettings: orgSettings,
      fallback: companySettingsFallback
    });

    // Group quantity readings by member_id
    const readingsByMember = quantityReadings.reduce((acc: Record<string, any[]>, reading: any) => {
      if (!acc[reading.member_id]) {
        acc[reading.member_id] = [];
      }
      acc[reading.member_id].push(reading);
      return acc;
    }, {});

    // Data validation logging
    console.log('📊 Report Data Summary:');
    console.log(`  - Members: ${members.length}`);
    console.log(`  - Inspections: ${inspections.length}`);
    console.log(`  - NCRs: ${ncrs.length}`);
    console.log(`  - DFT Batches: ${dftBatches.length}`);
    console.log(`  - Simulated Sets: ${simulatedMemberSets.length}`);
    console.log(`  - Introduction: ${introductionData ? 'Generated' : 'Not available'}`);
    console.log(`  - Executive Summary: ${executiveSummaryData ? 'Generated' : 'Not available'}`);
    console.log(`  - Drawings/Pins: ${executiveSummaryData?.data?.drawings_pins ?
      `${executiveSummaryData.data.drawings_pins.total_drawings} drawings, ${executiveSummaryData.data.drawings_pins.total_pins} pins` :
      'Not available'}`);

    // Count total batches in inspections
    const totalBatchesInInspections = inspections.reduce((sum, i) => sum + (i.dft_batches?.length || 0), 0);
    console.log(`  - Total DFT Batches in Inspections: ${totalBatchesInInspections}`);

    // Validate data integrity
    if (members.length === 0) {
      console.warn('⚠️ No members found for this project');
    }
    if (inspections.length === 0) {
      console.warn('⚠️ No inspections found for this project');
    }
    if (executiveSummaryData) {
      console.log(`  - Materials in Summary: ${executiveSummaryData.materials_list.length}`);
      console.log(`  - FRR Ratings in Summary: ${executiveSummaryData.frr_list.length}`);
    }

    const doc = new jsPDF();
    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    const MARGIN = {
      top: 20,
      bottom: 30,
      left: 20,
      right: 20,
    };
    const MAX_Y = PAGE_HEIGHT - MARGIN.bottom;
    const CONTENT_WIDTH = 210 - MARGIN.left - MARGIN.right;

    // Helper function for page breaks
    const checkPageBreak = (currentY: number, requiredSpace: number = 10): number => {
      if (currentY + requiredSpace > MAX_Y) {
        doc.addPage();
        return MARGIN.top;
      }
      return currentY;
    };

    let yPos = 20;

    // Load organization logo with multi-bucket fallback
    if (orgSettings?.logo_url) {
      try {
        console.log('[Audit Report] Loading organization logo:', orgSettings.logo_url.substring(0, 100));
        let logoDataUrl = null;

        // Check if full URL
        if (orgSettings.logo_url.startsWith('http://') || orgSettings.logo_url.startsWith('https://')) {
          const response = await fetch(orgSettings.logo_url);
          const logoBlob = await response.blob();
          console.log('[Audit Report] Logo blob loaded:', logoBlob.size, 'bytes, type:', logoBlob.type);

          // Use canvas-based conversion to ensure jsPDF compatibility
          logoDataUrl = await blobToCleanDataURL(logoBlob);
          console.log('[Audit Report] ✓ Logo converted to clean JPEG format');
        } else {
          // Try multiple buckets
          const buckets = ['organization-logos', 'project-documents', 'documents'];
          for (const bucket of buckets) {
            try {
              const { data: logoData } = await supabase.storage
                .from(bucket)
                .getPublicUrl(orgSettings.logo_url);

              if (logoData?.publicUrl) {
                const response = await fetch(logoData.publicUrl);
                const logoBlob = await response.blob();
                console.log(`[Audit Report] Logo loaded from ${bucket}:`, logoBlob.size, 'bytes');

                // Use canvas-based conversion to ensure jsPDF compatibility
                logoDataUrl = await blobToCleanDataURL(logoBlob);
                console.log('[Audit Report] ✓ Logo converted to clean JPEG format');
                if (logoDataUrl) break;
              }
            } catch (err) {
              console.log(`[Audit Report] Failed to load from ${bucket}, trying next...`);
              continue;
            }
          }
        }

        if (logoDataUrl) {
          const logoWidth = 40;
          const logoHeight = 20;
          const logoX = (210 - logoWidth) / 2;
          doc.addImage(logoDataUrl, 'JPEG', logoX, yPos, logoWidth, logoHeight);
          console.log('[Audit Report] ✓ Logo added centered at position (' + logoX + ', ' + yPos + ')');
          yPos += logoHeight + 2;

          // Add two line breaks (spacing) then company name
          yPos += 14;
          const orgName = orgSettings?.name || orgSettings?.company_name || 'P&R Consulting Limited';
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(orgName, 105, yPos, { align: 'center' });
          yPos += 10;
        } else {
          console.warn('[Audit Report] ✗ Could not load logo from any bucket');
          const orgName = orgSettings?.name || orgSettings?.company_name || 'P&R Consulting Limited';
          doc.setFontSize(22);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 40, 80);
          doc.text(orgName, 105, yPos, { align: 'center' });
          yPos += 12;
        }
      } catch (error) {
        console.error('[Audit Report] ✗ Error loading organization logo:', error);
        const orgName = orgSettings?.name || orgSettings?.company_name || 'P&R Consulting Limited';
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 40, 80);
        doc.text(orgName, 105, yPos, { align: 'center' });
        yPos += 12;
      }
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Third Party Coatings Inspection Report', 105, yPos, { align: 'center' });
    yPos += 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(project.name, 20, yPos);
    yPos += 12;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Client: ${project.client_name}`, 20, yPos);
    yPos += 7;
    if (project.main_contractor) {
      doc.text(`Contractor: ${project.main_contractor}`, 20, yPos);
      yPos += 7;
    }
    if (project.site_address) {
      doc.text(`Site: ${project.site_address}`, 20, yPos);
      yPos += 7;
    }
    if (project.project_ref) {
      doc.text(`Reference: ${project.project_ref}`, 20, yPos);
      yPos += 7;
    }
    doc.text(`Report Date: ${format(new Date(), 'MMM d, yyyy')}`, 20, yPos);
    yPos += 15;

    // Add Introduction section if available
    if (introductionData) {
      doc.addPage();
      yPos = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('1. Introduction', 20, yPos);
      yPos += 10;

      doc.setDrawColor(0, 40, 80);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, 190, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const introParagraphs = introductionData.full_introduction_text
        .split('\n\n')
        .filter((p: string) => !p.startsWith('1. Introduction'));

      for (const paragraph of introParagraphs) {
        if (paragraph.trim() === '') continue;

        const lines = doc.splitTextToSize(paragraph, 170);
        for (const line of lines) {
          yPos = checkPageBreak(yPos, 5);
          doc.text(line, 20, yPos);
          yPos += 5;
        }
        yPos += 5;
      }
    }

    // Add Executive Summary section
    doc.addPage();
    yPos = 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('2. Executive Summary', 20, yPos);
    yPos += 10;

    doc.setDrawColor(0, 40, 80);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    if (executiveSummaryData) {
      // Use generated executive summary
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const summaryParagraphs = executiveSummaryData.full_summary_text.split('\n\n');
      for (const paragraph of summaryParagraphs) {
        if (paragraph.trim() === '') continue;
        if (paragraph.startsWith('Executive Summary')) continue;

        const lines = doc.splitTextToSize(paragraph, 170);
        for (const line of lines) {
          yPos = checkPageBreak(yPos, 5);
          doc.text(line, 20, yPos);
          yPos += 5;
        }
        yPos += 5;
      }
    } else {
      // Fallback to manual statistics if generator failed
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const totalMembers = members.length;
      const inspectedMembers = members.filter((m) => m.status !== 'not_started').length;
      const passedMembers = members.filter((m) => m.status === 'pass').length;
      const repairRequired = members.filter((m) => m.status === 'repair_required').length;
      const openNCRs = ncrs.filter((n) => n.status !== 'closed').length;

      yPos = checkPageBreak(yPos, 40);
      doc.text(`Total Members: ${totalMembers}`, 20, yPos);
      yPos += 7;
      doc.text(`Inspected: ${inspectedMembers} (${((inspectedMembers / totalMembers) * 100).toFixed(1)}%)`, 20, yPos);
      yPos += 7;
      doc.text(`Passed: ${passedMembers}`, 20, yPos);
      yPos += 7;
      doc.text(`Repair Required: ${repairRequired}`, 20, yPos);
      yPos += 7;
      doc.text(`Open NCRs: ${openNCRs}`, 20, yPos);
      yPos += 15;
    }

    yPos = checkPageBreak(yPos, 30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Report Inspection Standards and Reference Documents', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const maxWidth = 170;
    const introText = 'This report reflects observations and testing conducted against the applicable project specification and nominated inspection standards, including recognised NACE (AMPP) standards for protective coatings inspection where relevant. Industry guidance documents, including those published by the Fire Protection Association of New Zealand (FPANZ), may be referenced for general best practice; however, compliance assessment is based strictly on the contract documentation and nominated testing standards.';
    const lines = doc.splitTextToSize(introText, maxWidth);
    lines.forEach((line: string) => {
      yPos = checkPageBreak(yPos, 5);
      doc.text(line, 20, yPos);
      yPos += 5;
    });
    yPos += 5;

    yPos = checkPageBreak(yPos, 30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Standards Referenced:', 20, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    const standards = [
      'ISO 19840 - Paints and varnishes - Corrosion protection of steel structures by protective paint systems',
      'ISO 8501-1 - Preparation of steel substrates before application of paints',
      'FPA NZ COP-3 - Code of Practice for Passive Fire Protection',
      'NACE (AMPP) standards for protective coatings inspection',
    ];

    standards.forEach((std) => {
      yPos = checkPageBreak(yPos, 6);
      doc.text(`• ${std}`, 20, yPos);
      yPos += 6;
    });

    // Smart page break for DFT section
    yPos = checkPageBreak(yPos, 40);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('4. DFT Summary by Member', 20, yPos);
    yPos += 10;

    // Build DFT data including ALL sources: quantity readings, batches, and simulated sets
    const dftData: any[] = [];

    // First, add quantity-based readings for members
    members.forEach((member) => {
      const memberReadings = readingsByMember[member.id];
      if (memberReadings && memberReadings.length > 0) {
        const avgDft = memberReadings.reduce((sum: number, r: any) => sum + r.dft_average, 0) / memberReadings.length;
        const minDft = Math.min(...memberReadings.map((r: any) => r.dft_average));
        const maxDft = Math.max(...memberReadings.map((r: any) => r.dft_average));
        const allPass = memberReadings.every((r: any) => r.status === 'pass');

        dftData.push([
          `${member.member_mark}${member.is_spot_check ? ' (Spot)' : ''}`,
          member.required_dft_microns || 'N/A',
          avgDft.toFixed(1),
          minDft,
          maxDft,
          memberReadings.length,
          allPass ? 'PASS' : 'FAIL',
        ]);
      }
    });

    // Note: DFT batches feature removed as dft_batches table doesn't exist

    autoTable(doc, {
      head: [['Member', 'Required (µm)', 'Avg (µm)', 'Min (µm)', 'Max (µm)', 'Readings', 'Result']],
      body: dftData,
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [0, 40, 80], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { bottom: 30 },
      columnStyles: {
        6: {
          cellWidth: 20,
          fontStyle: 'bold',
          halign: 'center',
        },
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 6) {
          if (data.cell.text[0] === 'PASS') {
            data.cell.styles.textColor = [0, 128, 0];
          } else if (data.cell.text[0] === 'FAIL') {
            data.cell.styles.textColor = [255, 0, 0];
          }
        }
      },
    });

    if (simulatedMemberSets.length > 0) {
      doc.addPage();
      yPos = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Testing Data - Datasets', 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Summary by Member', 20, yPos);
      yPos += 7;

      const simulatedData = simulatedMemberSets.map((set: any) => {
        const summary = set.summary_json;
        return [
          set.member_name,
          `${set.required_thickness_microns}`,
          summary.avgDft ? summary.avgDft.toFixed(1) : 'N/A',
          summary.minDft || 'N/A',
          summary.maxDft || 'N/A',
          summary.readingsCount || set.readings_per_member,
          summary.compliance || 'N/A',
        ];
      });

      autoTable(doc, {
        head: [['Member', 'Required (µm)', 'Avg (µm)', 'Min (µm)', 'Max (µm)', 'Readings', 'Compliance']],
        body: simulatedData,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { bottom: 30 },
        columnStyles: {
          6: {
            cellWidth: 25,
            fontStyle: 'bold',
            halign: 'center',
          },
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 6) {
            if (data.cell.text[0] === 'PASS') {
              data.cell.styles.textColor = [0, 128, 0];
            } else if (data.cell.text[0] === 'FAIL') {
              data.cell.styles.textColor = [255, 0, 0];
            }
          }
        },
      });

      for (const set of simulatedMemberSets) {
        yPos = (doc as any).lastAutoTable.finalY + 15;
        yPos = checkPageBreak(yPos, 30);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Member: ${set.member_name}`, 20, yPos);
        yPos += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const summary = set.summary_json;
        doc.text(`Required: ${set.required_thickness_microns}µm | Avg: ${summary.avgDft}µm | Min: ${summary.minDft}µm | Max: ${summary.maxDft}µm | Std Dev: ${summary.stdDev}`, 20, yPos);
        yPos += 7;

        const readingsData: any[] = [];
        const readings = set.inspection_member_readings || [];
        for (let i = 0; i < Math.min(100, readings.length); i++) {
          if (readingsData.length === 0 || readingsData[readingsData.length - 1].length === 5) {
            readingsData.push([]);
          }
          const reading = readings[i];
          readingsData[readingsData.length - 1].push(`${reading.reading_no}: ${reading.dft_microns}µm`);
        }

        autoTable(doc, {
          head: [['Reading 1-20', 'Reading 21-40', 'Reading 41-60', 'Reading 61-80', 'Reading 81-100']],
          body: readingsData,
          startY: yPos,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
          styles: { fontSize: 7, cellPadding: 2, halign: 'center' },
          margin: { left: 20, right: 20, bottom: 30 },
          didDrawPage: (data: any) => {
            if (data.cursor.y > MAX_Y) {
              data.cursor.y = MARGIN.top;
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    // Add detailed quantity readings section
    if (Object.keys(readingsByMember).length > 0) {
      doc.addPage();
      yPos = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Quantity-Based Inspection Readings', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('This section contains detailed readings for members with quantity-based inspections.', 20, yPos);
      yPos += 10;

      for (const [memberId, readings] of Object.entries(readingsByMember)) {
        const member = members.find((m: any) => m.id === memberId);
        if (!member) continue;

        yPos = checkPageBreak(yPos, 40);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Member: ${member.member_mark}`, 20, yPos);
        yPos += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const avgDft = readings.reduce((sum: number, r: any) => sum + r.dft_average, 0) / readings.length;
        const minDft = Math.min(...readings.map((r: any) => r.dft_average));
        const maxDft = Math.max(...readings.map((r: any) => r.dft_average));
        const stdDev = Math.sqrt(
          readings.reduce((sum: number, r: any) => sum + Math.pow(r.dft_average - avgDft, 2), 0) / readings.length
        );

        doc.text(
          `Total Readings: ${readings.length} | Required: ${member.required_dft_microns}µm | Avg: ${avgDft.toFixed(1)}µm | Min: ${minDft}µm | Max: ${maxDft}µm | Std Dev: ${stdDev.toFixed(1)}`,
          20,
          yPos
        );
        yPos += 7;

        const readingData = readings.map((r: any) => [
          r.generated_id,
          `${r.dft_reading_1}µm`,
          `${r.dft_reading_2}µm`,
          `${r.dft_reading_3}µm`,
          `${r.dft_average}µm`,
          r.status.toUpperCase(),
        ]);

        autoTable(doc, {
          head: [['ID', 'Reading', 'Reading', 'Reading', 'Average', 'Status']],
          body: readingData,
          startY: yPos,
          theme: 'grid',
          headStyles: { fillColor: [0, 40, 80], textColor: 255 },
          styles: { fontSize: 8 },
          margin: { bottom: 30 },
          didParseCell: function (data) {
            if (data.section === 'body' && data.column.index === 5) {
              if (data.cell.text[0] === 'PASS') {
                data.cell.styles.textColor = [0, 128, 0];
              } else if (data.cell.text[0] === 'FAIL') {
                data.cell.styles.textColor = [255, 0, 0];
              }
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    if (ncrs.length > 0) {
      doc.addPage();
      yPos = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('5. Non-Conformance Reports', 20, yPos);
      yPos += 10;

      const ncrData = ncrs.map((ncr) => {
        const member = members.find(m => m.id === ncr.member_id);
        return [
          `NCR-${ncr.ncr_number}`,
          member?.member_mark || 'N/A',
          ncr.severity?.toUpperCase() || 'N/A',
          ncr.issue_type?.replace('_', ' ') || 'N/A',
          ncr.status?.replace('_', ' ').toUpperCase() || 'N/A',
        ];
      });

      autoTable(doc, {
        head: [['NCR #', 'Member', 'Severity', 'Issue Type', 'Status']],
        body: ncrData,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { bottom: 30 },
      });
    }

    // Add Drawings and Pin Locations section if available
    if (executiveSummaryData?.data?.drawings_pins &&
        executiveSummaryData.data.drawings_pins.total_pins > 0) {

      const sectionNumber = ncrs.length > 0 ? '6' : '5';
      const drawingsPinsData = executiveSummaryData.data.drawings_pins;

      // SECTION A: Add visual markup drawings with pin annotations
      console.log('📍 Adding markup drawings section...');
      try {
        await addMarkupDrawingsSection(doc, project.id, `${sectionNumber}.1`);
        console.log('✅ Markup drawings added successfully');
      } catch (error) {
        console.error('❌ Error adding markup drawings:', error);
        // Continue with the report even if markup drawings fail
      }

      // SECTION B: Add detailed pin locations table
      doc.addPage();
      yPos = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${sectionNumber}.2. Pin Locations Reference Table`, 20, yPos);
      yPos += 10;

      doc.setDrawColor(0, 40, 80);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, 190, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Drawings: ${drawingsPinsData.total_drawings}`, 20, yPos);
      yPos += 6;
      doc.text(`Total Pin Locations: ${drawingsPinsData.total_pins}`, 20, yPos);
      yPos += 12;

      // Create table of pin locations
      if (drawingsPinsData.pins_summary && drawingsPinsData.pins_summary.length > 0) {
        const pinsData = drawingsPinsData.pins_summary.map((pin: any) => [
          pin.pin_number || 'N/A',
          pin.steel_type || 'N/A',
          pin.member_mark || 'N/A',
          `${pin.block_name || 'N/A'} / ${pin.level_name || 'N/A'}`,
          pin.drawing_page || 'N/A',
          pin.status ? pin.status.replace('_', ' ').toUpperCase() : 'N/A',
          pin.has_photos ? 'Yes' : 'No',
        ]);

        autoTable(doc, {
          head: [['Pin #', 'Type', 'Member', 'Location', 'Dwg Page', 'Status', 'Photos']],
          body: pinsData,
          startY: yPos,
          theme: 'grid',
          headStyles: { fillColor: [0, 102, 204], textColor: 255 },
          styles: { fontSize: 8, cellPadding: 2 },
          margin: { bottom: 30 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 22 },
            2: { cellWidth: 22 },
            3: { cellWidth: 40 },
            4: { cellWidth: 20 },
            5: { cellWidth: 25, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' },
          },
          didParseCell: function (data) {
            if (data.section === 'body' && data.column.index === 5) {
              const status = data.cell.text[0];
              if (status === 'PASS') {
                data.cell.styles.textColor = [0, 128, 0];
                data.cell.styles.fontStyle = 'bold';
              } else if (status === 'REPAIR REQUIRED' || status.includes('FAIL')) {
                data.cell.styles.textColor = [255, 0, 0];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;

        // Add summary note
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(80, 80, 80);
        const noteText = 'Note: Pin locations are marked on project drawings and correspond to inspected structural members. Drawing references and coordinates are maintained in the project site manager system.';
        const noteLines = doc.splitTextToSize(noteText, 170);
        noteLines.forEach((line: string) => {
          yPos = checkPageBreak(yPos, 5);
          doc.text(line, 20, yPos);
          yPos += 5;
        });
      }
    }

    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    // Dynamic section numbering based on which sections are included
    let inspectionSectionNumber = '5';
    if (ncrs.length > 0) inspectionSectionNumber = '6';
    if (executiveSummaryData?.data?.drawings_pins?.total_pins && executiveSummaryData.data.drawings_pins.total_pins > 0) {
      inspectionSectionNumber = ncrs.length > 0 ? '7' : '6';
    }
    doc.text(`${inspectionSectionNumber}. Inspection Details`, 20, yPos);
    yPos += 10;

    inspections.forEach((inspection, idx) => {
      yPos = checkPageBreak(yPos, 30);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${inspection.members?.member_mark || 'Unknown Member'}`, 20, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${format(new Date(inspection.inspection_date_time), 'MMM d, yyyy HH:mm')}`, 25, yPos);
      yPos += 6;

      if (inspection.location_label) {
        doc.text(`Location: ${inspection.location_label}`, 25, yPos);
        yPos += 6;
      }

      const resultText = `Result: ${inspection.result?.toUpperCase() || 'N/A'}`;
      doc.text(resultText, 25, yPos);

      if (inspection.result === 'pass') {
        doc.setFillColor(0, 128, 0);
        doc.circle(70, yPos - 2, 2, 'F');
      } else if (inspection.result === 'fail') {
        doc.setFillColor(255, 0, 0);
        doc.setDrawColor(255, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(68, yPos - 4, 72, yPos);
        doc.line(68, yPos, 72, yPos - 4);
      } else if (inspection.result === 'repair') {
        doc.setFillColor(255, 165, 0);
        doc.triangle(68, yPos, 70, yPos - 4, 72, yPos, 'F');
      }

      yPos += 6;

      // Environmental readings feature removed - table doesn't exist in database
      // TODO: If environmental readings are needed, create env_readings table with proper relationship

      // DFT batches section removed - table doesn't exist in database

      yPos += 5;
    });

    console.log('📄 Adding footers to all pages...');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const pageCount = doc.getNumberOfPages();
    const footerOrgName = orgSettings?.name || orgSettings?.company_name || 'P&R Consulting Limited';
    console.log(`📄 Total pages: ${pageCount}, Footer: ${footerOrgName}`);

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Prepared by ${footerOrgName}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 15, {
        align: 'center',
      });
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, {
        align: 'center',
      });
    }

    console.log('✅ PDF document generation complete, returning document object');
    return doc;
  };

  const handleDownloadBaseReport = async () => {
    setGenerating(true);
    console.log('🔄 Starting base report generation for project:', project.id);
    try {
      console.log('📊 Calling generateAuditReport...');
      const doc = await generateAuditReport();
      console.log('✅ Report generated successfully, saving file...');
      const filename = `PRC_InspectionReport_${project.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(filename);
      console.log('✅ File saved:', filename);
    } catch (error: any) {
      console.error('❌ Error generating report:', error);
      console.error('Error stack:', error.stack);
      alert('Error generating report: ' + (error.message || 'Unknown error'));
    } finally {
      console.log('🏁 Report generation complete, resetting state');
      setGenerating(false);
    }
  };

  const handleGeneratePhotoReport = async (selectedPinIds: string[]) => {
    if (selectedPinIds.length === 0) {
      alert('Please select at least one inspected member');
      return;
    }

    setGeneratingPhotoReport(true);
    try {
      const doc = await generateInspectionReportWithPhotos(
        project.id,
        project.name,
        selectedPinIds
      );
      doc.save(
        `Inspection_Report_Photos_${project.name.replace(/\s+/g, '_')}_${format(
          new Date(),
          'yyyyMMdd'
        )}.pdf`
      );
    } catch (error: any) {
      console.error('Error generating photo report:', error);
      alert('Error generating photo report: ' + error.message);
    } finally {
      setGeneratingPhotoReport(false);
    }
  };

  const handleGenerateEnhancedPhotoReport = async (selectedPinIds: string[]) => {
    if (selectedPinIds.length === 0) {
      alert('Please select at least one inspected member');
      return;
    }

    setGeneratingEnhancedPhotoReport(true);
    try {
      const doc = await generateEnhancedInspectionReportWithPhotos(
        project.id,
        project.name,
        selectedPinIds
      );
      doc.save(
        `Enhanced_Photo_Report_${project.name.replace(/\s+/g, '_')}_${format(
          new Date(),
          'yyyyMMdd'
        )}.pdf`
      );
    } catch (error: any) {
      console.error('Error generating enhanced photo report:', error);
      alert('Error generating enhanced photo report: ' + error.message);
    } finally {
      setGeneratingEnhancedPhotoReport(false);
    }
  };

  const handleGenerateQuantityPhotoReport = async () => {
    if (selectedPinIds.length === 0) {
      alert('Please select at least one pin to include in the report');
      return;
    }

    setGeneratingQuantityPhotoReport(true);
    try {
      const doc = await generateQuantityReadingsPhotoReport(
        project.id,
        project.name,
        selectedPinIds
      );
      doc.save(
        `Quantity_Readings_Photo_Report_${project.name.replace(/\s+/g, '_')}_${format(
          new Date(),
          'yyyyMMdd'
        )}.pdf`
      );
    } catch (error: any) {
      console.error('Error generating quantity photo report:', error);
      alert('Error generating quantity photo report: ' + error.message);
    } finally {
      setGeneratingQuantityPhotoReport(false);
    }
  };

  const handleGenerateMergedPack = async () => {
    setGeneratingMerged(true);
    try {
      // Get selected attachment IDs from localStorage
      const storageKey = `export-attachments-selection-${project.id}`;
      const savedSelection = localStorage.getItem(storageKey);
      let selectedIds: Set<string> = new Set();

      if (savedSelection) {
        try {
          const ids = JSON.parse(savedSelection);
          selectedIds = new Set(ids);
        } catch (e) {
          console.error('Failed to parse selection, using all attachments', e);
          selectedIds = new Set(attachments.map(a => a.id));
        }
      } else {
        // Default to all attachments if no selection saved
        selectedIds = new Set(attachments.map(a => a.id));
      }

      // Filter attachments to only include selected ones
      const selectedAttachments = attachments.filter(a => selectedIds.has(a.id));

      if (selectedAttachments.length === 0) {
        const proceed = confirm(
          'No attachments are currently selected for export.\n\n' +
          'The merged pack will only contain the base inspection report.\n\n' +
          'Do you want to continue?'
        );
        if (!proceed) {
          setGeneratingMerged(false);
          return;
        }
      }

      // Get organization settings
      const { data: projectDetails } = await supabase.from('projects').select(`
        *,
        organizations(id, name, logo_url)
      `).eq('id', project.id).single();

      const { data: companySettingsFallback } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
      const orgSettings = projectDetails?.organizations || companySettingsFallback;
      const organizationName = orgSettings?.name || orgSettings?.company_name || 'P&R Consulting Limited';

      const baseDoc = await generateAuditReport();
      const basePdfBytes = baseDoc.output('arraybuffer');
      const mergedPdf = await PDFDocument.load(basePdfBytes);

      for (let i = 0; i < selectedAttachments.length; i++) {
        const attachment = selectedAttachments[i];
        try {
          const appendixLetter = String.fromCharCode(65 + i);
          const displayTitle = attachment.display_title || attachment.documents.filename.replace(/\.[^/.]+$/, '');

          const dividerBlob = await createDividerPage(appendixLetter, displayTitle, {
            category: attachment.appendix_category || undefined,
            filename: attachment.documents.filename,
            uploadedBy: attachment.user_profiles?.name || 'Unknown',
            uploadedAt: format(new Date(attachment.uploaded_at), 'MMM d, yyyy HH:mm'),
            projectName: project.name,
            clientName: project.client_name,
            siteAddress: project.site_address || undefined,
            organizationName: organizationName,
          });

          const dividerBytes = await dividerBlob.arrayBuffer();
          const dividerPdf = await PDFDocument.load(dividerBytes);
          const dividerPages = await mergedPdf.copyPages(dividerPdf, dividerPdf.getPageIndices());
          dividerPages.forEach((page) => mergedPdf.addPage(page));

          let filePath: string;

          if (attachment.source_type === 'image' && attachment.converted_pdf_document_id) {
            const { data: convertedDoc } = await supabase
              .from('documents')
              .select('storage_path')
              .eq('id', attachment.converted_pdf_document_id)
              .single();

            if (!convertedDoc) {
              console.error(`Converted PDF not found for attachment ${attachment.id}`);
              continue;
            }
            filePath = convertedDoc.storage_path;
          } else {
            filePath = attachment.documents.storage_path;
          }

          const { data: fileBlob, error: downloadError } = await supabase.storage
            .from('project-documents')
            .download(filePath);

          if (downloadError) {
            console.error(`Error downloading ${filePath}:`, downloadError);
            throw new Error(`Failed to download ${attachment.documents.filename}: ${downloadError.message}`);
          }

          const attachmentBytes = await fileBlob.arrayBuffer();
          const attachmentPdf = await PDFDocument.load(attachmentBytes);
          const copiedPages = await mergedPdf.copyPages(attachmentPdf, attachmentPdf.getPageIndices());

          copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
          });
        } catch (err: any) {
          console.error(`Error merging attachment ${attachment.documents.filename}:`, err);
          throw new Error(`Failed to merge ${attachment.documents.filename}: ${err.message}`);
        }
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PRC_AuditPack_${project.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error generating merged pack:', error);
      alert('Error generating merged audit pack: ' + error.message);
    } finally {
      setGeneratingMerged(false);
    }
  };

  const handleOpenInInspectPDF = async (reportBlob: Blob, name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${project.id}/${Date.now()}-${name}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('pdf-workspaces')
        .upload(fileName, reportBlob);

      if (uploadError) throw uploadError;

      const { data: workspace, error: workspaceError } = await supabase
        .from('pdf_workspaces')
        .insert({
          project_id: project.id,
          user_id: user.id,
          name: name,
          source_type: 'export',
          current_pdf_path: fileName,
          original_pdf_path: fileName,
          metadata: {
            original_filename: `${name}.pdf`,
            file_type: 'application/pdf',
          },
          page_count: 0,
          file_size_bytes: reportBlob.size,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      navigate(`/projects/${project.id}/inspect-pdf/${workspace.id}`);
    } catch (error) {
      console.error('Failed to open in InspectPDF:', error);
      alert('Failed to open PDF in InspectPDF. Please try again.');
    }
  };

  const handleDownloadOrEdit = async (generateReport: () => Promise<jsPDF>, reportName: string, action: 'download' | 'edit') => {
    setGenerating(true);
    try {
      const doc = await generateReport();
      const pdfBlob = doc.output('blob');

      if (action === 'edit') {
        await handleOpenInInspectPDF(pdfBlob, reportName);
      } else {
        doc.save(`${reportName}.pdf`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <FileText className="w-12 h-12 text-primary-600 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Audit Inspection Report
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Comprehensive PDF report including member DFT summary, inspection details, NCRs, and
                appendices.
              </p>
              <ul className="text-sm text-slate-600 space-y-1 mb-4">
                <li>• Cover page with project details and P&R Consulting branding</li>
                <li>• Section 1: Introduction (scope, materials, inspection methodology)</li>
                <li>• Section 2: Executive summary with compliance assessment</li>
                <li>• Section 3: Standards and references section</li>
                <li>• Section 4: DFT summary table by member (all batches included)</li>
                <li>• Section 5: Non-conformance reports (if any)</li>
                <li>• Section 6: Detailed inspection records (all readings and batches)</li>
              </ul>
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadBaseReport}
                  disabled={generating}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <Download className="w-5 h-5 mr-2" />
                  {generating ? 'Generating...' : 'Download Base Report'}
                </button>
                <button
                  onClick={() => handleDownloadOrEdit(generateAuditReport, `PRC_InspectionReport_${project.name}_${format(new Date(), 'yyyyMMdd')}`, 'edit')}
                  disabled={generating}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Edit3 className="w-5 h-5 mr-2" />
                  Edit in InspectPDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-start w-full">
            <Layers className="w-12 h-12 text-accent-600 mr-4 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Full Audit Pack (Merged PDF)
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Complete audit package combining the generated inspection report with all uploaded
                export attachments in sequence order.
              </p>

              {loadingAttachments ? (
                <div className="text-sm text-slate-500">Loading attachments...</div>
              ) : (
                <>
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">
                      Merge Order (Selected Files Only):
                    </h4>
                    <ol className="text-sm text-slate-700 space-y-1">
                      <li className="flex items-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-600 text-white rounded-full text-xs font-medium mr-2">
                          1
                        </span>
                        <span className="font-medium">Generated Inspection Report (P&R Consulting)</span>
                      </li>
                      {(() => {
                        const storageKey = `export-attachments-selection-${project.id}`;
                        const savedSelection = localStorage.getItem(storageKey);
                        let selectedIds: Set<string> = new Set(attachments.map(a => a.id));

                        if (savedSelection) {
                          try {
                            selectedIds = new Set(JSON.parse(savedSelection));
                          } catch (e) {
                            // Use all if parsing fails
                          }
                        }

                        const selectedAttachments = attachments.filter(a => selectedIds.has(a.id));

                        if (attachments.length === 0) {
                          return <li className="text-slate-500 ml-8 italic">No attachments configured</li>;
                        }

                        if (selectedAttachments.length === 0) {
                          return (
                            <li className="text-amber-600 ml-8 italic font-medium">
                              No attachments selected - only base report will be included
                            </li>
                          );
                        }

                        return selectedAttachments.map((att, idx) => (
                          <li key={att.id} className="flex items-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-accent-600 text-white rounded-full text-xs font-medium mr-2">
                              {idx + 2}
                            </span>
                            <span>{att.display_title || att.documents.filename.replace(/\.[^/.]+$/, '')}</span>
                            {att.source_type === 'image' && (
                              <span className="ml-2 text-xs text-green-600">(auto-converted to PDF)</span>
                            )}
                          </li>
                        ));
                      })()}
                    </ol>
                    {attachments.length > 0 && (() => {
                      const storageKey = `export-attachments-selection-${project.id}`;
                      const savedSelection = localStorage.getItem(storageKey);
                      let selectedIds: Set<string> = new Set(attachments.map(a => a.id));

                      if (savedSelection) {
                        try {
                          selectedIds = new Set(JSON.parse(savedSelection));
                        } catch (e) {}
                      }

                      const selectedCount = attachments.filter(a => selectedIds.has(a.id)).length;

                      if (selectedCount < attachments.length) {
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-300">
                            <p className="text-xs text-slate-600">
                              <CheckSquare className="w-3 h-3 inline mr-1" />
                              {selectedCount} of {attachments.length} attachments selected.
                              <a
                                href="#export-attachments"
                                onClick={(e) => {
                                  e.preventDefault();
                                  const tab = document.querySelector('[data-tab="export-attachments"]');
                                  if (tab) (tab as HTMLElement).click();
                                }}
                                className="ml-1 text-primary-600 hover:underline"
                              >
                                Manage selection →
                              </a>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {attachments.length > 0 ? (
                    <button
                      onClick={handleGenerateMergedPack}
                      disabled={generatingMerged}
                      className="flex items-center px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 transition-colors"
                    >
                      <Layers className="w-5 h-5 mr-2" />
                      {generatingMerged ? 'Generating Merged Pack...' : 'Generate Full Audit Pack (Merged)'}
                    </button>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-xs text-amber-800">
                          No attachments configured. Add attachments in the "Export Attachments" tab to enable merged pack generation.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 hidden">
        <div className="flex items-start">
          <Camera className="w-12 h-12 text-green-600 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Inspection Report with Photos
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Generate a detailed inspection report including all photos attached to selected pins.
              Select which inspected members to include in the report.
            </p>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <InspectedMemberSelector
                projectId={project.id}
                onGenerateReport={handleGeneratePhotoReport}
              />
            </div>

            {generatingPhotoReport && (
              <div className="mt-4 flex items-center gap-2 text-green-600">
                <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Generating report with photos...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-blue-200 p-6 border-2 hidden">
        <div className="flex items-start">
          <Camera className="w-12 h-12 text-blue-600 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Enhanced Photo Report with Pin Details
              </h3>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">NEW</span>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Generate a comprehensive report with <strong>larger photo thumbnails</strong>, complete pin location details (coordinates, page numbers),
              timestamps, reference IDs, and organized metadata sections. Perfect for detailed documentation and analysis.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Enhanced Features:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Larger photo thumbnails (120mm × 90mm) for better visibility</li>
                <li>• Complete location details: X/Y coordinates, normalized positions, canvas size</li>
                <li>• Comprehensive pin metadata: timestamps, reference IDs, drawing page numbers</li>
                <li>• Photo metadata: captions, file names, upload dates, sort order</li>
                <li>• Organized sections: Basic Info, Member Specs, Location, Timestamps, References</li>
                <li>• Professional formatting with section headers and visual organization</li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <InspectedMemberSelector
                projectId={project.id}
                onGenerateReport={handleGenerateEnhancedPhotoReport}
              />
            </div>

            {generatingEnhancedPhotoReport && (
              <div className="mt-4 flex items-center gap-2 text-blue-600">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Generating enhanced photo report with detailed pin information...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-lg p-6 shadow-md">
        <div className="flex items-start">
          <Camera className="w-12 h-12 text-emerald-600 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Inspection Report with Photos
              </h3>
              <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs font-semibold rounded">RECOMMENDED</span>
            </div>
            <p className="text-sm text-slate-700 mb-4">
              Generate a detailed inspection report including all photos attached to selected pins. Select which inspected members to include in the report.
            </p>

            <div className="bg-emerald-100/50 border border-emerald-300 rounded-lg p-3 mb-4">
              <h4 className="text-sm font-semibold text-emerald-900 mb-2">Features:</h4>
              <ul className="text-sm text-emerald-800 space-y-1">
                <li>• Select individual pins for export</li>
                <li>• Upload multiple photos per pin location</li>
                <li>• Photos organized by pin number in dedicated section</li>
                <li>• Summary table of all inspected pins</li>
                <li>• Professional formatting with organization branding</li>
                <li>• Photo management: view, upload, and delete</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-emerald-200">
              <PhotoExportPinSelector
                projectId={project.id}
                projectName={project.name}
                onSelectionChange={setSelectedPinIds}
              />

              <div className="mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={handleGenerateQuantityPhotoReport}
                  disabled={generatingQuantityPhotoReport || selectedPinIds.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  {generatingQuantityPhotoReport
                    ? 'Generating Report...'
                    : `Generate Report (${selectedPinIds.length} pins selected)`}
                </button>
              </div>
            </div>

            {generatingQuantityPhotoReport && (
              <div className="mt-4 flex items-center gap-2 text-emerald-600">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Generating report with photos...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-6 shadow-md">
        <div className="flex items-start">
          <FileText className="w-12 h-12 text-purple-600 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Professional DFT Inspection Report
              </h3>
              <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded">NEW</span>
            </div>
            <p className="text-sm text-slate-700 mb-4">
              Generate a professional Elcometer-style inspection report with charts, metadata panels, and detailed readings tables. Each member gets a 2-page layout with visual charts and comprehensive statistics.
            </p>

            <div className="bg-purple-100/50 border border-purple-300 rounded-lg p-3 mb-4">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">Features:</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Page 1: Histogram chart with metadata panels (Project, Statistics, Member info)</li>
                <li>• Page 2: Clean readings table with Date/Time, Reading #, Thickness, Type</li>
                <li>• Professional A4 portrait layout with company branding</li>
                <li>• Each member gets a dedicated 2-page layout</li>
                <li>• Automatic PDF download with organized structure</li>
                <li>• Includes company logo and professional formatting</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
              <InspectedMemberSelector
                projectId={project.id}
                onGenerateReport={async (selectedPinIds) => {
                  setGeneratingProfessionalReport(true);
                  console.log('🚀 Professional DFT Report - Starting generation');
                  console.log('📌 Selected pin IDs:', selectedPinIds.length);

                  try {
                    // Convert pin IDs to member IDs
                    console.log('🔍 Fetching member IDs from pins...');
                    const { data: pins, error: pinsError } = await supabase
                      .from('drawing_pins')
                      .select('member_id')
                      .in('id', selectedPinIds);

                    if (pinsError) {
                      throw new Error(`Failed to fetch pins: ${pinsError.message}`);
                    }

                    if (!pins || pins.length === 0) {
                      alert('No members found for selected pins. Please select pins that have associated members.');
                      return;
                    }

                    // Extract unique member IDs
                    const memberIds = [...new Set(pins.map(p => p.member_id).filter(id => id !== null))];
                    console.log('👥 Unique member IDs:', memberIds.length);

                    if (memberIds.length === 0) {
                      alert('Selected pins have no associated members. Please link pins to members first.');
                      return;
                    }

                    // Fetch member data and readings
                    console.log('📥 Fetching member data...');
                    const { data: members, error: membersError } = await supabase
                      .from('members')
                      .select('*')
                      .in('id', memberIds)
                      .order('member_mark');

                    if (membersError) {
                      throw new Error(`Failed to fetch members: ${membersError.message}`);
                    }

                    if (!members || members.length === 0) {
                      alert('No member data found for the selected pins.');
                      return;
                    }

                    console.log('📥 Fetching project data...');
                    const { data: projectData, error: projectError } = await supabase
                      .from('projects')
                      .select('*, organizations(name, logo_url)')
                      .eq('id', project.id)
                      .single();

                    if (projectError) {
                      throw new Error(`Failed to fetch project: ${projectError.message}`);
                    }

                    // Fetch readings for each member
                    console.log('📊 Fetching inspection readings...');
                    const readingsMap = new Map();
                    let totalReadings = 0;

                    for (const member of members) {
                      const { data: readings, error: readingsError } = await supabase
                        .from('inspection_readings')
                        .select('*')
                        .eq('member_id', member.id)
                        .order('sequence_number');

                      if (readingsError) {
                        console.warn(`⚠️ Error fetching readings for ${member.member_mark}:`, readingsError);
                        continue;
                      }

                      if (readings && readings.length > 0) {
                        readingsMap.set(member.id, readings);
                        totalReadings += readings.length;
                        console.log(`   ${member.member_mark}: ${readings.length} readings`);
                      }
                    }

                    console.log(`📊 Total readings fetched: ${totalReadings}`);

                    if (readingsMap.size === 0) {
                      alert('No inspection readings found for the selected members. Please add DFT readings first.');
                      return;
                    }

                    // Generate PDF using jsPDF
                    console.log('🎨 Generating PDF...');
                    await generateProfessionalDFTReport(projectData, members, readingsMap);
                    console.log('✅ Professional DFT Report completed!');
                  } catch (error: any) {
                    console.error('❌ Error generating professional report:', error);
                    console.error('Error stack:', error.stack);
                    const errorMessage = error.message || 'Unknown error occurred';
                    alert(`Failed to generate report: ${errorMessage}\n\nPlease check the browser console for details.`);
                  } finally {
                    setGeneratingProfessionalReport(false);
                    console.log('🏁 Professional DFT Report - Process complete');
                  }
                }}
              />
            </div>

            {generatingProfessionalReport && (
              <div className="mt-4 flex items-center gap-2 text-purple-600">
                <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Generating professional DFT inspection report...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <h4 className="font-medium text-primary-900 mb-2">Export File Naming</h4>
        <p className="text-sm text-primary-800">
          <strong>Base Report:</strong> PRC_InspectionReport_&#60;ProjectName&#62;_&#60;YYYYMMDD&#62;.pdf<br />
          <strong>Merged Pack:</strong> PRC_AuditPack_&#60;ProjectName&#62;_&#60;YYYYMMDD&#62;.pdf<br />
          <strong>Photo Report:</strong> Inspection_Report_Photos_&#60;ProjectName&#62;_&#60;YYYYMMDD&#62;.pdf<br />
          <strong>Enhanced Photo Report:</strong> Enhanced_Photo_Report_&#60;ProjectName&#62;_&#60;YYYYMMDD&#62;.pdf<br />
          <strong>Quantity Readings Photo Report:</strong> Quantity_Readings_Photo_Report_&#60;ProjectName&#62;_&#60;YYYYMMDD&#62;.pdf<br />
          <strong>Professional DFT Report:</strong> Professional_DFT_Report_&#60;ProjectName&#62;_&#60;YYYYMMDD&#62;.pdf
        </p>
      </div>
    </div>
  );
}
