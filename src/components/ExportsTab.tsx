import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileText, Layers, AlertCircle, Camera } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { PDFDocument } from 'pdf-lib';
import { createDividerPage } from '../lib/pdfUtils';
import { InspectedMemberSelector } from './InspectedMemberSelector';
import { generateInspectionReportWithPhotos } from '../lib/pdfInspectionWithPhotos';

interface Project {
  id: string;
  name: string;
  client_name: string;
  main_contractor: string;
  site_address: string;
  project_ref: string;
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function ExportsTab({ project }: { project: Project }) {
  const [generating, setGenerating] = useState(false);
  const [generatingMerged, setGeneratingMerged] = useState(false);
  const [generatingPhotoReport, setGeneratingPhotoReport] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);

  useEffect(() => {
    loadAttachments();
  }, [project.id]);

  const loadAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('project_export_attachments')
        .select(`
          *,
          documents(filename, storage_path),
          converted_documents:converted_pdf_document_id(storage_path)
        `)
        .eq('project_id', project.id)
        .eq('is_active', true)
        .order('sequence_no', { ascending: true});

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const generateAuditReport = async (): Promise<jsPDF> => {
    const [
      membersRes,
      inspectionsRes,
      ncrsRes,
      dftBatchesRes,
      simulatedMemberSetsRes,
      orgSettingsRes,
      projectDetailsRes,
    ] = await Promise.all([
      supabase.from('members').select('*').eq('project_id', project.id).order('member_mark'),
      supabase
        .from('inspections')
        .select('*, members(member_mark), env_readings(*), dft_batches(*), dft_simulation_enabled')
        .eq('project_id', project.id)
        .order('inspection_date_time'),
      supabase.from('ncrs').select('*, members(member_mark)').eq('project_id', project.id),
      supabase
        .from('dft_batches')
        .select('*, inspections(*, members(member_mark)), dft_readings(*)')
        .eq('inspections.project_id', project.id),
      supabase
        .from('inspection_member_sets')
        .select('*, inspection_member_readings(*)')
        .in(
          'inspection_id',
          (await supabase.from('inspections').select('id').eq('project_id', project.id)).data?.map(
            (i) => i.id
          ) || []
        ),
      supabase.from('organization_settings').select('*').limit(1).maybeSingle(),
      supabase.from('projects').select('*, clients(logo_path)').eq('id', project.id).maybeSingle(),
    ]);

    const members = membersRes.data || [];
    const inspections = inspectionsRes.data || [];
    const ncrs = ncrsRes.data || [];
    const dftBatches = dftBatchesRes.data || [];
    const simulatedMemberSets = simulatedMemberSetsRes.data || [];
    const orgSettings = orgSettingsRes.data;
    const projectDetails = projectDetailsRes.data;

    const doc = new jsPDF();
    let yPos = 20;

    if (orgSettings?.logo_path) {
      try {
        const { data: logoBlob } = await supabase.storage
          .from('documents')
          .download(orgSettings.logo_path);
        if (logoBlob) {
          const logoDataUrl = await blobToDataURL(logoBlob);
          doc.addImage(logoDataUrl, 'PNG', 15, yPos - 5, 40, 20);
        }
      } catch (error) {
        console.warn('Could not load organization logo:', error);
      }
    }

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 40, 80);
    const orgName = orgSettings?.organization_name || 'P&R Consulting Limited';
    doc.text(orgName, 105, yPos, { align: 'center' });
    yPos += 12;

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Third Party Coatings Inspection Report', 105, yPos, { align: 'center' });
    yPos += 20;

    if (projectDetails?.clients?.logo_path) {
      try {
        const { data: clientLogoBlob } = await supabase.storage
          .from('documents')
          .download(projectDetails.clients.logo_path);
        if (clientLogoBlob) {
          const clientLogoDataUrl = await blobToDataURL(clientLogoBlob);
          doc.addImage(clientLogoDataUrl, 'PNG', 160, yPos - 10, 35, 17);
        }
      } catch (error) {
        console.warn('Could not load client logo:', error);
      }
    }

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

    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const totalMembers = members.length;
    const inspectedMembers = members.filter((m) => m.status !== 'not_started').length;
    const passedMembers = members.filter((m) => m.status === 'pass').length;
    const repairRequired = members.filter((m) => m.status === 'repair_required').length;
    const openNCRs = ncrs.filter((n) => n.status !== 'closed').length;

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

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Inspection Standards and Reference Documents', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const maxWidth = 170;
    const introText = 'This report reflects observations and testing conducted against the applicable project specification and nominated inspection standards, including recognised NACE (AMPP) standards for protective coatings inspection where relevant. Industry guidance documents, including those published by the Fire Protection Association of New Zealand (FPANZ), may be referenced for general best practice; however, compliance assessment is based strictly on the contract documentation and nominated testing standards.';
    const lines = doc.splitTextToSize(introText, maxWidth);
    lines.forEach((line: string) => {
      doc.text(line, 20, yPos);
      yPos += 5;
    });
    yPos += 5;

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
      doc.text(`• ${std}`, 20, yPos);
      yPos += 6;
    });

    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DFT Summary by Member', 20, yPos);
    yPos += 10;

    const dftData = inspections
      .filter((i) => i.dft_batches && i.dft_batches.length > 0)
      .map((i) => {
        const batch = i.dft_batches[0];
        const member = members.find((m) => m.id === i.member_id);
        return [
          i.members?.member_mark || 'N/A',
          member?.required_dft_microns ? `${member.required_dft_microns}` : 'N/A',
          batch.dft_avg_microns ? batch.dft_avg_microns.toFixed(1) : 'N/A',
          batch.dft_min_microns || 'N/A',
          batch.dft_max_microns || 'N/A',
          batch.readings_count || 'N/A',
          member?.required_dft_microns && batch.dft_avg_microns
            ? batch.dft_avg_microns >= member.required_dft_microns
              ? 'PASS'
              : 'FAIL'
            : 'N/A',
        ];
      });

    autoTable(doc, {
      head: [['Member', 'Required (µm)', 'Avg (µm)', 'Min (µm)', 'Max (µm)', 'Readings', 'Result']],
      body: dftData,
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [0, 40, 80], textColor: 255 },
      styles: { fontSize: 9 },
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
      doc.text('Testing Data - Simulated Datasets', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text('⚠ SIMULATED DATA - FOR DEMONSTRATION PURPOSES ONLY', 20, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Generated using range parameters (min/max). Not actual field measurements.', 20, yPos);
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

      doc.setTextColor(150, 150, 150);
      doc.setFontSize(40);
      doc.setFont('helvetica', 'bold');
      const watermarkText = 'SIMULATED DATA';
      const textWidth = doc.getTextWidth(watermarkText);
      doc.text(watermarkText, (doc.internal.pageSize.width - textWidth) / 2, doc.internal.pageSize.height / 2, {
        angle: 45,
      });
      doc.setTextColor(0, 0, 0);

      for (const set of simulatedMemberSets) {
        if ((doc as any).lastAutoTable.finalY > 220) {
          doc.addPage();
          yPos = 20;
        } else {
          yPos = (doc as any).lastAutoTable.finalY + 15;
        }

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
          body: readingsData,
          startY: yPos,
          theme: 'plain',
          styles: { fontSize: 7, cellPadding: 1 },
        });

        doc.setTextColor(150, 150, 150);
        doc.setFontSize(30);
        doc.setFont('helvetica', 'bold');
        const pageWatermarkText = 'SIMULATED';
        const pageTextWidth = doc.getTextWidth(pageWatermarkText);
        doc.text(pageWatermarkText, (doc.internal.pageSize.width - pageTextWidth) / 2, doc.internal.pageSize.height / 2, {
          angle: 45,
        });
        doc.setTextColor(0, 0, 0);

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    if (ncrs.length > 0) {
      doc.addPage();
      yPos = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Non-Conformance Reports', 20, yPos);
      yPos += 10;

      const ncrData = ncrs.map((ncr) => [
        `NCR-${ncr.ncr_number}`,
        ncr.members?.member_mark || 'N/A',
        ncr.severity?.toUpperCase() || 'N/A',
        ncr.issue_type?.replace('_', ' ') || 'N/A',
        ncr.status?.replace('_', ' ').toUpperCase() || 'N/A',
      ]);

      autoTable(doc, {
        head: [['NCR #', 'Member', 'Severity', 'Issue Type', 'Status']],
        body: ncrData,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], textColor: 255 },
        styles: { fontSize: 9 },
      });
    }

    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Inspection Details', 20, yPos);
    yPos += 10;

    inspections.forEach((inspection, idx) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

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

      if (inspection.env_readings && inspection.env_readings.length > 0) {
        const env = inspection.env_readings[0];
        doc.text(
          `Environmental: Ambient ${env.ambient_temp_c}°C, Steel ${env.steel_temp_c}°C, RH ${env.relative_humidity_pct}%, Dew Pt Spread ${env.dew_point_spread_c?.toFixed(1)}°C`,
          25,
          yPos
        );
        yPos += 6;
      }

      if (inspection.dft_batches && inspection.dft_batches.length > 0) {
        const batch = inspection.dft_batches[0];
        doc.text(
          `DFT: Min ${batch.dft_min_microns}µm, Max ${batch.dft_max_microns}µm, Avg ${batch.dft_avg_microns?.toFixed(1)}µm, Readings ${batch.readings_count}`,
          25,
          yPos
        );
        yPos += 6;
      }

      yPos += 5;
    });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const pageCount = doc.getNumberOfPages();
    const footerOrgName = orgSettings?.organization_name || 'P&R Consulting Limited';
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Prepared by ${footerOrgName}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 15, {
        align: 'center',
      });
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, {
        align: 'center',
      });
    }

    return doc;
  };

  const handleDownloadBaseReport = async () => {
    setGenerating(true);
    try {
      const doc = await generateAuditReport();
      doc.save(`PRC_InspectionReport_${project.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error: any) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + error.message);
    } finally {
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

  const handleGenerateMergedPack = async () => {
    setGeneratingMerged(true);
    try {
      const baseDoc = await generateAuditReport();
      const basePdfBytes = baseDoc.output('arraybuffer');
      const mergedPdf = await PDFDocument.load(basePdfBytes);

      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
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
                <li>• Executive summary with statistics</li>
                <li>• Standards and references section</li>
                <li>• DFT summary table by member</li>
                <li>• Non-conformance reports</li>
                <li>• Detailed inspection records</li>
              </ul>
              <button
                onClick={handleDownloadBaseReport}
                disabled={generating}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                {generating ? 'Generating...' : 'Download Base Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
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
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Merge Order:</h4>
                    <ol className="text-sm text-slate-700 space-y-1">
                      <li className="flex items-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-600 text-white rounded-full text-xs font-medium mr-2">
                          1
                        </span>
                        <span className="font-medium">Generated Inspection Report (P&R Consulting)</span>
                      </li>
                      {attachments.length === 0 ? (
                        <li className="text-slate-500 ml-8 italic">No attachments configured</li>
                      ) : (
                        attachments.map((att, idx) => (
                          <li key={att.id} className="flex items-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-accent-600 text-white rounded-full text-xs font-medium mr-2">
                              {idx + 2}
                            </span>
                            <span>{att.documents.filename}</span>
                            {att.source_type === 'image' && (
                              <span className="ml-2 text-xs text-green-600">(auto-converted to PDF)</span>
                            )}
                          </li>
                        ))
                      )}
                    </ol>
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

      <div className="bg-white rounded-lg border border-slate-200 p-6">
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

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <h4 className="font-medium text-primary-900 mb-2">Export File Naming</h4>
        <p className="text-sm text-primary-800">
          <strong>Base Report:</strong> PRC_InspectionReport_&#60;ProjectName&#62;_&#60;YYYYMMDD&#62;.pdf<br />
          <strong>Merged Pack:</strong> PRC_AuditPack_&#60;ProjectName&#62;_&#60;YYYYMMDD&#62;.pdf<br />
          <strong>Photo Report:</strong> Inspection_Report_Photos_&#60;ProjectName&#62;_&#60;YYYYMMDD&#62;.pdf
        </p>
      </div>
    </div>
  );
}
