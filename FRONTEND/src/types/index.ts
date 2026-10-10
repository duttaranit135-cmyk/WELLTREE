// ==========================================
// 1. Enums & Union Types
// ==========================================
export type FamilyRole = 'ADMIN' | 'GUARDIAN' | 'MEMBER';
export type ConsentStatus = 'PENDING' | 'ACTIVE' | 'REVOKED' | 'DENIED';
export type ConsentPermission = 'READ_ONLY' | 'FULL_ACCESS';
export type SOSEventStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';
export type MedicineLogStatus = 'TAKEN' | 'MISSED' | 'SKIPPED';
export type NotificationType = 'EMERGENCY_SOS' | 'CRITICAL_HEALTH_ALERT' | 'MEDICINE_REMINDER' | 'CONSENT_REQUEST' | 'SYSTEM';
export type NotificationStatus = 'UNREAD' | 'READ' | 'DISMISSED';

// ==========================================
// 2. Profile Types
// ==========================================
export interface UserProfile {
  id: string; // UUID
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type Profile = UserProfile;

export interface ProfileUpdateInput {
  full_name?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
}

// ==========================================
// 3. Family & Member Types
// ==========================================
export interface FamilyMember {
  id: string; // UUID
  family_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
  profile?: UserProfile;
}

export interface Family {
  id: string; // UUID
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  members?: FamilyMember[];
}

export interface FamilyCreateInput {
  name: string;
  description?: string;
}

export interface FamilyMemberAddInput {
  user_id: string;
  role: FamilyRole;
}

// ==========================================
// 4. Consent Types
// ==========================================
export interface Consent {
  id: string; // UUID
  granter_id: string;
  grantee_id: string;
  family_id: string;
  permission_level: ConsentPermission;
  status: ConsentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsentCreateInput {
  grantee_id: string;
  family_id: string;
  permission_level: ConsentPermission;
  notes?: string;
}

export interface ConsentUpdateInput {
  status: ConsentStatus;
  permission_level?: ConsentPermission;
  notes?: string;
}

// ==========================================
// 5. Health Records
// ==========================================
export interface HealthRecord {
  id: string;
  family_member_id: string;
  blood_group?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  medical_history?: string | null;
  current_conditions?: string | null;
  doctor_name?: string | null;
  doctor_contact?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthRecordCreate {
  family_member_id: string;
  blood_group?: string;
  allergies?: string;
  chronic_conditions?: string;
  medical_history?: string;
  current_conditions?: string;
  doctor_name?: string;
  doctor_contact?: string;
  notes?: string;
}

// ==========================================
// 6. Medicines, Schedules & Logs
// ==========================================
export interface Medicine {
  id: string;
  family_member_id: string;
  medicine_name: string;
  dosage?: string | null;
  dosage_unit?: string | null;
  frequency?: string | null;
  route?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  prescribed_by?: string | null;
  instructions?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicineCreate {
  family_member_id: string;
  medicine_name: string;
  dosage?: string;
  dosage_unit?: string;
  frequency?: string;
  route?: string;
  start_date?: string;
  end_date?: string;
  prescribed_by?: string;
  instructions?: string;
  is_active?: boolean;
}

export interface MedicineSchedule {
  id: string;
  medicine_id: string;
  scheduled_time: string;
  frequency_type?: string;
  days_of_week?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  reminder_enabled?: boolean;
  created_at: string;
  updated_at: string;
  medicine?: Medicine;
}

export interface MedicineScheduleCreate {
  medicine_id: string;
  scheduled_time: string;
  frequency_type?: string;
  days_of_week?: string[];
  start_date?: string;
  end_date?: string;
  reminder_enabled?: boolean;
}

export interface MedicineLog {
  id: string;
  medicine_id: string;
  schedule_id?: string | null;
  family_member_id: string;
  scheduled_at?: string | null;
  taken_at?: string | null;
  status: MedicineLogStatus;
  notes?: string | null;
  created_at: string;
  medicine?: Medicine;
}

export interface MedicineLogCreate {
  medicine_id: string;
  family_member_id: string;
  schedule_id?: string;
  scheduled_at?: string;
  taken_at?: string;
  status: MedicineLogStatus;
  notes?: string;
}

// ==========================================
// 7. Medical Reports & Document Viewer
// ==========================================
export interface MedicalReport {
  id: string;
  family_member_id: string;
  uploaded_by: string;
  file_name: string;
  report_type?: string;
  mime_type: string;
  file_size: number;
  report_date?: string | null;
  description?: string | null;
  storage_path: string;
  download_url?: string | null;
  created_at: string;
}

// ==========================================
// 8. Emergency Contacts & SOS Events
// ==========================================
export interface EmergencyContact {
  id: string;
  family_member_id: string;
  name: string;
  phone: string;
  relationship?: string | null;
  email?: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContactCreate {
  family_member_id: string;
  name: string;
  phone: string;
  relationship?: string;
  email?: string;
  priority?: number;
  is_active?: boolean;
}

export interface EmergencySOS {
  id: string;
  family_member_id: string;
  triggered_by: string;
  status: SOSEventStatus;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  location_accuracy?: number | null;
  timestamp?: string | null;
  location_timestamp?: string | null;
  triggered_at: string;
  resolved_at?: string | null;
  notes?: string | null;
  notification_dispatched: boolean;
  emergency_contacts_count: number;
}

export interface SOSEventCreate {
  family_member_id: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  notes?: string;
}

// ==========================================
// 9. Notifications & Audit Logs
// ==========================================
export interface Notification {
  id: string;
  user_id: string;
  family_member_id?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string;
  family_id?: string | null;
  family_member_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

// ==========================================
// 10. ML Predictions & Diagnostic Suite
// ==========================================
export interface FeatureImpact {
  feature_name: string;
  feature_value: string;
  impact_direction: 'HIGH_RISK_FACTOR' | 'MODERATE_RISK_FACTOR' | 'PROTECTIVE_FACTOR';
  importance_score: number;
  clinical_explanation: string;
}

export interface DiabetesPredictionRequest {
  age: number;
  gender: string;
  hypertension: boolean;
  heart_disease: boolean;
  smoking_history: string;
  bmi: number;
  hba1c_level: number;
  blood_glucose_level: number;
  family_id?: string;
  family_member_id?: string;
  save_to_records?: boolean;
}

export interface DiabetesPredictionResponse {
  prediction: number;
  risk_label: 'Low Risk' | 'High Risk';
  risk_probability: number;
  risk_percentage: number;
  confidence_level: 'High Confidence' | 'Moderate Confidence' | 'Low Confidence';
  feature_summary: Record<string, any>;
  recommendations: string[];
  feature_impacts: FeatureImpact[];
  assessed_at: string;
  record_id?: string;
}

export interface HypertensionPredictionRequest {
  age: number;
  gender: string;
  heart_disease: boolean;
  smoking_history: string;
  bmi: number;
  hba1c_level: number;
  blood_glucose_level: number;
  diabetes: boolean;
  family_id?: string;
  family_member_id?: string;
  save_to_records?: boolean;
}

export interface HypertensionPredictionResponse {
  prediction: number;
  risk_label: 'Low Risk' | 'High Risk';
  risk_probability: number;
  risk_percentage: number;
  confidence_level: 'High Confidence' | 'Moderate Confidence' | 'Low Confidence';
  feature_summary: Record<string, any>;
  recommendations: string[];
  feature_impacts: FeatureImpact[];
  assessed_at: string;
  record_id?: string;
}

export interface SymptomPredictionItem {
  disease: string;
  confidence_percent: number;
  description: string;
  precautions: string[];
}

export interface SymptomCheckerRequest {
  symptoms: string[];
  top_k?: number;
}

export interface SymptomCheckerResponse {
  top_disease: string;
  confidence_percent: number;
  matched_symptoms: string[];
  unrecognized_symptoms: string[];
  top_predictions: SymptomPredictionItem[];
  emergency_recommendation: string;
}

export interface DiseaseInfo {
  description: string;
  precautions: string[];
}

export interface PredictionTrendsResponse {
  total_assessments: number;
  prediction_type: string;
  trajectory: 'IMPROVING' | 'WORSENING' | 'STABLE' | 'INSUFFICIENT_DATA';
  latest_risk_percentage: number | null;
  baseline_risk_percentage: number | null;
  delta_percentage: number | null;
  average_risk_percentage: number | null;
  clinical_summary: string;
  data_points: {
    record_id: string;
    assessed_at: string;
    prediction_type: string;
    risk_label: string;
    risk_percentage: number;
    risk_probability: number;
    confidence_level: string;
    key_metrics?: Record<string, any>;
  }[];
}

export interface BiometricPrefill {
  age?: number;
  gender?: string;
  bmi?: number;
  hypertension?: boolean;
  heart_disease?: boolean;
  diabetes?: boolean;
  smoking_history?: string;
  hba1c_level?: number;
  blood_glucose_level?: number;
}

// ==========================================
// 11. API Common & Auth Types
// ==========================================
export interface ApiError {
  detail: string;
}

export interface HealthCheck {
  status: string;
  service: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
}
