// ==========================================
// 1. Enums (TypeScript Union Types)
// ==========================================
export type FamilyRole = 'ADMIN' | 'GUARDIAN' | 'MEMBER';
export type ConsentStatus = 'PENDING' | 'ACTIVE' | 'REVOKED' | 'DENIED';
export type ConsentPermission = 'READ_ONLY' | 'FULL_ACCESS';

// ==========================================
// 2. Profile Types
// ==========================================
export interface Profile {
  id: string; // UUID
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateInput {
  full_name?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
}

// ==========================================
// 3. Family Types
// ==========================================
export interface FamilyMember {
  id: string; // UUID
  family_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
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
// 5. API Response Types
// ==========================================
export interface ApiError {
  detail: string;
}

export interface HealthCheck {
  status: string;
  service: string;
}

// ==========================================
// 6. Auth Types
// ==========================================
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
}
