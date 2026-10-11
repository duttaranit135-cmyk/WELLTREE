import api from '../api';
import { supabase } from '../supabase';
import type { MedicalReport } from '../../types';

const isUUID = (str?: string): boolean =>
  Boolean(
    str &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
  );

export const medicalReportService = {
  getReports: async (familyMemberId?: string, reportType?: string): Promise<MedicalReport[]> => {
    // 1. Direct Supabase Query (~50ms)
    if (familyMemberId && isUUID(familyMemberId)) {
      try {
        let query = supabase.from('medical_reports').select('*').eq('family_member_id', familyMemberId);
        if (reportType) query = query.eq('report_type', reportType);
        query = query.order('created_at', { ascending: false });
        const { data, error } = await query;
        if (!error && data) {
          const withUrls = await Promise.all(
            data.map(async (r: any) => {
              try {
                if (r.storage_path) {
                  const { data: signed } = await supabase.storage
                    .from('medical-reports')
                    .createSignedUrl(r.storage_path, 300);
                  return { ...r, download_url: signed?.signedUrl || r.download_url };
                }
                return r;
              } catch {
                return r;
              }
            })
          );
          try {
            const cacheKey = familyMemberId ? `wt_reports_${familyMemberId}` : 'wt_reports_all';
            localStorage.setItem(cacheKey, JSON.stringify(withUrls));
          } catch {}
          return withUrls as MedicalReport[];
        }
      } catch {}
    }

    // 2. Try backend API
    try {
      const params: Record<string, any> = {};
      if (isUUID(familyMemberId)) {
        params.family_member_id = familyMemberId;
      }
      if (reportType) params.report_type = reportType;
      const res = await api.get<MedicalReport[]>('/medical-reports', { params });
      if (Array.isArray(res.data)) {
        try {
          const cacheKey = familyMemberId ? `wt_reports_${familyMemberId}` : 'wt_reports_all';
          localStorage.setItem(cacheKey, JSON.stringify(res.data));
        } catch {}
        return res.data;
      }
    } catch (backendError) {
      console.warn('[medicalReportService] Backend /medical-reports failed, falling back:', backendError);
    }

    // 3. Cache fallback
    try {
      const cacheKey = familyMemberId ? `wt_reports_${familyMemberId}` : 'wt_reports_all';
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    return [];
  },

  getReportById: async (id: string): Promise<MedicalReport> => {
    if (isUUID(id)) {
      try {
        const { data, error } = await supabase.from('medical_reports').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          if (data.storage_path) {
            const { data: signed } = await supabase.storage.from('medical-reports').createSignedUrl(data.storage_path, 300);
            data.download_url = signed?.signedUrl || data.download_url;
          }
          return data as MedicalReport;
        }
      } catch {}
    }
    const res = await api.get<MedicalReport>(`/medical-reports/${id}`);
    return res.data;
  },

  uploadReport: async (formData: FormData): Promise<MedicalReport> => {
    // 1. Try Backend API
    try {
      const res = await api.post<MedicalReport>('/medical-reports', formData);
      return res.data;
    } catch (apiErr: any) {
      console.warn('[medicalReportService] Backend upload failed, executing direct Supabase Storage upload fallback:', apiErr);

      const file = formData.get('file') as File | null;
      const familyMemberId = (formData.get('family_member_id') as string) || '';
      const reportType = (formData.get('report_type') as string) || 'GENERAL';
      const reportDate = (formData.get('report_date') as string) || new Date().toISOString().split('T')[0];
      const description = (formData.get('description') as string) || null;

      if (!file) {
        throw new Error('No file provided for upload');
      }

      // Upload directly to Supabase storage bucket 'medical-reports'
      const sanitizedName = (file.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniquePath = `${familyMemberId || 'general'}/${Date.now()}_${sanitizedName}`;

      const { error: uploadErr } = await supabase.storage
        .from('medical-reports')
        .upload(uniquePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        });

      if (uploadErr) {
        console.error('[medicalReportService] Direct storage upload error:', uploadErr);
        throw new Error(uploadErr.message || 'Direct storage upload failed');
      }

      // Generate signed URL
      const { data: signedData } = await supabase.storage
        .from('medical-reports')
        .createSignedUrl(uniquePath, 300);

      // Save metadata to medical_reports table
      const { data: { user } } = await supabase.auth.getUser();
      const reportId = crypto.randomUUID();

      const newReport: MedicalReport = {
        id: reportId,
        family_member_id: familyMemberId,
        uploaded_by: user?.id || '',
        file_name: file.name,
        storage_path: uniquePath,
        report_type: reportType,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        report_date: reportDate,
        description: description,
        download_url: signedData?.signedUrl || null,
        created_at: new Date().toISOString(),
      };

      try {
        const { data: dbData } = await supabase
          .from('medical_reports')
          .insert({
            id: reportId,
            family_member_id: familyMemberId,
            uploaded_by: user?.id,
            file_name: file.name,
            storage_path: uniquePath,
            report_type: reportType,
            mime_type: file.type || 'application/octet-stream',
            file_size: file.size,
            report_date: reportDate,
            description: description,
          })
          .select()
          .single();

        if (dbData) {
          newReport.id = dbData.id;
        }
      } catch (dbErr) {
        console.warn('[medicalReportService] Direct DB metadata insert warning:', dbErr);
      }

      // Cache locally
      try {
        const cacheKey = familyMemberId ? `wt_reports_${familyMemberId}` : 'wt_reports_all';
        const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        localStorage.setItem(cacheKey, JSON.stringify([newReport, ...existing]));
      } catch {}

      return newReport;
    }
  },

  deleteReport: async (id: string): Promise<void> => {
    try {
      await api.delete(`/medical-reports/${id}`);
    } catch (apiErr) {
      console.warn('[medicalReportService] Backend delete failed, falling back to Supabase:', apiErr);
      try {
        const { data } = await supabase.from('medical_reports').select('storage_path').eq('id', id).single();
        if (data?.storage_path) {
          await supabase.storage.from('medical-reports').remove([data.storage_path]);
        }
        await supabase.from('medical_reports').delete().eq('id', id);
      } catch {}
    }
  },
};
