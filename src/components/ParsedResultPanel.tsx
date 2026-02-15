import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, DollarSign, Calendar, Users, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { ParsedResult, ParsingJob } from '../lib/parsingTypes';
import { supabase } from '../lib/supabase';

interface ParsedResultPanelProps {
  job: ParsingJob;
  onJumpToPage?: (page: number) => void;
}

export function ParsedResultPanel({ job, onJumpToPage }: ParsedResultPanelProps) {
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  useEffect(() => {
    loadParsedResult();
  }, [job.id, job.result_json_path]);

  const loadParsedResult = async () => {
    if (!job.result_json_path) {
      setError('No parsed result available');
      setLoading(false);
      return;
    }

    try {
      const { data, error: downloadError } = await supabase.storage
        .from('parsing-artifacts')
        .download(job.result_json_path);

      if (downloadError) throw downloadError;

      const text = await data.text();
      const parsed = JSON.parse(text) as ParsedResult;
      setResult(parsed);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load parsed result:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleCitationClick = (page: number) => {
    if (onJumpToPage) {
      onJumpToPage(page);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto mb-2"></div>
        <p className="text-sm">Loading parsed results...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
        <p className="text-sm text-red-300">{error || 'Failed to load results'}</p>
      </div>
    );
  }

  const isExpanded = (section: string) => expandedSections.has(section);

  return (
    <div className="space-y-4">
      {result.warnings && result.warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-300 mb-2">Warnings</h4>
              <ul className="space-y-1">
                {result.warnings.map((warning, idx) => (
                  <li key={idx} className="text-xs text-yellow-200">
                    <span className="font-medium">{warning.code}:</span> {warning.message}
                    {warning.pages.length > 0 && (
                      <span className="ml-1">(Pages: {warning.pages.join(', ')})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
        <button
          onClick={() => toggleSection('overview')}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary-300" />
            <h3 className="text-lg font-semibold text-white">Document Overview</h3>
          </div>
          {isExpanded('overview') ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </button>
        {isExpanded('overview') && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Type</p>
                <p className="text-sm text-white font-medium capitalize">
                  {result.documentType || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Title</p>
                <p className="text-sm text-white font-medium">
                  {result.title || 'No title'}
                </p>
              </div>
              {result.parties.issuer && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Issuer</p>
                  <p className="text-sm text-white">{result.parties.issuer}</p>
                </div>
              )}
              {result.parties.recipient && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Recipient</p>
                  <p className="text-sm text-white">{result.parties.recipient}</p>
                </div>
              )}
              {result.dates.issueDate && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Issue Date</p>
                  <p className="text-sm text-white">{result.dates.issueDate}</p>
                </div>
              )}
              {result.dates.validUntil && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Valid Until</p>
                  <p className="text-sm text-white">{result.dates.validUntil}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {result.totals && (result.totals.total.value > 0 || result.totals.subtotal.value > 0) && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
          <button
            onClick={() => toggleSection('totals')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Totals</h3>
            </div>
            {isExpanded('totals') ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </button>
          {isExpanded('totals') && (
            <div className="px-4 pb-4 space-y-2">
              {result.totals.subtotal.value > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Subtotal</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {result.currency || '$'} {result.totals.subtotal.value.toFixed(2)}
                    </span>
                    {result.totals.subtotal.citation && (
                      <button
                        onClick={() => handleCitationClick(result.totals.subtotal.citation!.page)}
                        className="text-xs text-primary-400 hover:text-primary-300"
                        title={`Page ${result.totals.subtotal.citation.page}, Lines ${result.totals.subtotal.citation.lineStart}-${result.totals.subtotal.citation.lineEnd}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {result.totals.gst.value > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">GST</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {result.currency || '$'} {result.totals.gst.value.toFixed(2)}
                    </span>
                    {result.totals.gst.citation && (
                      <button
                        onClick={() => handleCitationClick(result.totals.gst.citation!.page)}
                        className="text-xs text-primary-400 hover:text-primary-300"
                        title={`Page ${result.totals.gst.citation.page}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-base text-white font-semibold">Total</span>
                <div className="flex items-center gap-2">
                  <span className="text-base text-white font-bold">
                    {result.currency || '$'} {result.totals.total.value.toFixed(2)}
                  </span>
                  {result.totals.total.citation && (
                    <button
                      onClick={() => handleCitationClick(result.totals.total.citation!.page)}
                      className="text-xs text-primary-400 hover:text-primary-300"
                      title={`Page ${result.totals.total.citation.page}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {result.lineItems && result.lineItems.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
          <button
            onClick={() => toggleSection('lineItems')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">
                Line Items <span className="text-sm text-slate-400">({result.lineItems.length})</span>
              </h3>
            </div>
            {isExpanded('lineItems') ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </button>
          {isExpanded('lineItems') && (
            <div className="px-4 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-2 text-xs text-slate-400 font-medium">Description</th>
                      <th className="text-right py-2 px-2 text-xs text-slate-400 font-medium">Qty</th>
                      <th className="text-right py-2 px-2 text-xs text-slate-400 font-medium">Unit</th>
                      <th className="text-right py-2 px-2 text-xs text-slate-400 font-medium">Rate</th>
                      <th className="text-right py-2 px-2 text-xs text-slate-400 font-medium">Amount</th>
                      <th className="text-center py-2 px-2 text-xs text-slate-400 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.lineItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-white/5 ${item.needsReview ? 'bg-yellow-500/5' : ''}`}
                      >
                        <td className="py-2 px-2 text-white">{item.description}</td>
                        <td className="py-2 px-2 text-right text-slate-300">{item.quantity || '-'}</td>
                        <td className="py-2 px-2 text-right text-slate-300">{item.unit || '-'}</td>
                        <td className="py-2 px-2 text-right text-slate-300">{item.rate || '-'}</td>
                        <td className="py-2 px-2 text-right text-white font-medium">{item.amount || '-'}</td>
                        <td className="py-2 px-2 text-center">
                          {item.citations.length > 0 && (
                            <button
                              onClick={() => handleCitationClick(item.citations[0].page)}
                              className="text-primary-400 hover:text-primary-300"
                              title={`Page ${item.citations[0].page}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {result.terms && result.terms.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
          <button
            onClick={() => toggleSection('terms')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-white">
                Terms & Conditions <span className="text-sm text-slate-400">({result.terms.length})</span>
              </h3>
            </div>
            {isExpanded('terms') ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </button>
          {isExpanded('terms') && (
            <div className="px-4 pb-4 space-y-2">
              {result.terms.map((term, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-0.5">{term.key}</p>
                    <p className="text-sm text-white">{term.value}</p>
                  </div>
                  {term.citations.length > 0 && (
                    <button
                      onClick={() => handleCitationClick(term.citations[0].page)}
                      className="text-primary-400 hover:text-primary-300 flex-shrink-0"
                      title={`Page ${term.citations[0].page}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result.exclusions && result.exclusions.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
          <button
            onClick={() => toggleSection('exclusions')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-white">
                Exclusions <span className="text-sm text-slate-400">({result.exclusions.length})</span>
              </h3>
            </div>
            {isExpanded('exclusions') ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </button>
          {isExpanded('exclusions') && (
            <div className="px-4 pb-4 space-y-2">
              {result.exclusions.map((exclusion, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
                  <p className="text-sm text-white flex-1">{exclusion.text}</p>
                  {exclusion.citations.length > 0 && (
                    <button
                      onClick={() => handleCitationClick(exclusion.citations[0].page)}
                      className="text-primary-400 hover:text-primary-300 flex-shrink-0"
                      title={`Page ${exclusion.citations[0].page}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-slate-400 text-center pt-2">
        Parser Version {result.meta.parserVersion} • {result.meta.pageCount} pages • Job ID: {result.meta.jobId.substring(0, 8)}
      </div>
    </div>
  );
}
