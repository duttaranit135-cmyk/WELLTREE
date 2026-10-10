import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Eye, Trash2, Calendar, User, AlertCircle, Shield, ExternalLink } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { medicalReportService } from '../lib/services/medicalReportService';
import type { MedicalReport } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export const MedicalReportsPage: React.FC = () => {
  const { activeFamily, activeMember, setActiveMember } = useFamily();
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<string>('LAB_REPORT');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const memberId = activeMember?.id || '';

  const fetchReports = async () => {
    if (!memberId) {
      setReports([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await medicalReportService.getReports(memberId);
      setReports(data || []);
    } catch (err: any) {
      console.warn('Failed to load reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [memberId]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are supported');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!memberId) {
      toast.error('Please pick an active family member');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('family_member_id', memberId);
      formData.append('report_type', reportType);
      if (reportDate) formData.append('report_date', reportDate);
      if (description) formData.append('description', description);

      await medicalReportService.uploadReport(formData);
      toast.success('Document uploaded securely to cloud vault');
      setIsUploadOpen(false);
      setSelectedFile(null);
      setDescription('');
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewReport = async (rep: MedicalReport) => {
    setSelectedReport(rep);
    try {
      setIsPreviewLoading(true);
      const detailed = await medicalReportService.getReportById(rep.id);
      setPreviewUrl(detailed.download_url || rep.download_url || null);
    } catch (err: any) {
      toast.error('Failed to load secure document preview');
      setPreviewUrl(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this report?')) return;
    try {
      await medicalReportService.deleteReport(id);
      toast.success('Report removed');
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete report');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <Shield className="w-4 h-4" />
            <span>Encrypted Cloud Storage</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Medical Reports & Documents
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Store laboratory results, prescriptions, and imaging reports with secure 5-minute pre-signed access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeFamily?.members && activeFamily.members.length > 0 && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <User className="w-4 h-4 text-slate-400 mr-2" />
              <select
                className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                value={activeMember?.id || ''}
                onChange={(e) => {
                  const m = activeFamily.members?.find((mem) => mem.id === e.target.value);
                  if (m) setActiveMember(m);
                }}
              >
                {activeFamily.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.profile?.full_name || `Member (${m.role})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button onClick={() => setIsUploadOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
            <Upload className="w-4 h-4 mr-2" />
            Upload Report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-6 bg-white">
          <EmptyState
            icon={FileText}
            title="No medical documents stored yet"
            description="Upload diagnostic lab results, blood work, or doctor discharge summaries to keep them securely organized."
            actionLabel="Upload Document"
            onAction={() => setIsUploadOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((rep) => {
            const isPdf = rep.mime_type.includes('pdf');
            const sizeMb = (rep.file_size / (1024 * 1024)).toFixed(2);

            return (
              <Card
                key={rep.id}
                className="p-5 bg-white border border-slate-200/80 hover:border-teal-300 transition-all shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-slate-900 text-sm truncate" title={rep.file_name}>
                          {rep.file_name}
                        </h3>
                        <span className="text-2xs text-slate-400">
                          {isPdf ? 'Adobe PDF' : 'Image document'} • {sizeMb} MB
                        </span>
                      </div>
                    </div>

                    <Badge variant="gray" className="text-2xs uppercase">
                      {rep.report_type || 'GENERAL'}
                    </Badge>
                  </div>

                  {rep.description && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                      {rep.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-2xs text-slate-400 border-t border-slate-100 pt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {rep.report_date ? new Date(rep.report_date).toLocaleDateString() : 'Date N/A'}
                    </span>
                    <span>Uploaded: {new Date(rep.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewReport(rep)}
                    className="flex-1 text-teal-700 border-teal-200 hover:bg-teal-50 text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Preview
                  </Button>
                  <button
                    onClick={() => handleDelete(rep.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Medical Document">
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-teal-200 rounded-xl p-6 text-center hover:bg-teal-50/40 cursor-pointer transition-colors bg-teal-50/20"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 mx-auto flex items-center justify-center mb-2">
              <Upload className="w-6 h-6" />
            </div>
            {selectedFile ? (
              <div>
                <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                <p className="text-xs text-teal-600 mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Click to browse or drag file here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: PDF, PNG, JPG, JPEG (Max 10MB)
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Report Type
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="LAB_REPORT">Lab Test / Blood Work</option>
                <option value="IMAGING">Imaging (X-Ray, MRI, CT)</option>
                <option value="PRESCRIPTION">Prescription</option>
                <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                <option value="GENERAL">General Clinical Note</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Report Issue Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Diagnostic Summary / Notes
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Fasting glucose normal, cholesterol slightly elevated"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isUploading ? 'Uploading...' : 'Save & Encrypt'}
            </Button>
          </div>
        </form>
      </Modal>

      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => {
            setSelectedReport(null);
            setPreviewUrl(null);
          }}
          title={selectedReport.file_name}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <span>Classification: <strong>{selectedReport.report_type || 'GENERAL'}</strong></span>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-teal-600 hover:underline font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab
                </a>
              )}
            </div>

            {isPreviewLoading ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : previewUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 min-h-[350px] flex items-center justify-center">
                {selectedReport.mime_type.includes('pdf') ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[450px]"
                    title="PDF Viewer"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={selectedReport.file_name}
                    className="max-h-[450px] max-w-full object-contain mx-auto"
                  />
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                <p>Could not generate immediate preview URL.</p>
                <p className="text-xs text-slate-400 mt-1">Please try downloading or re-uploading the document.</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedReport(null);
                  setPreviewUrl(null);
                }}
              >
                Close Viewer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MedicalReportsPage;
