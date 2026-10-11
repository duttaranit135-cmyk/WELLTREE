import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { FamilyRole, ConsentStatus, FamilyMember, Family, HealthRecord } from '../types';

/**
 * Combines conditional class names and merges Tailwind CSS classes safely.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats an ISO date string into human-readable format (e.g., "Jan 15, 2024").
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Extracts uppercase initials from a full name (e.g., "John Doe" -> "JD").
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns Tailwind CSS badge color classes based on the FamilyRole.
 * ADMIN -> indigo/purple
 * GUARDIAN -> amber/orange
 * MEMBER -> emerald/teal
 */
export function getRoleBadgeColor(role: FamilyRole): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    case 'GUARDIAN':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'MEMBER':
      return 'bg-teal-50 text-teal-700 border border-teal-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

/**
 * Returns Tailwind CSS badge color classes based on the ConsentStatus.
 * PENDING -> yellow/amber
 * ACTIVE -> green/emerald
 * REVOKED -> red/rose
 * DENIED -> gray/slate
 */
export function getStatusBadgeColor(status: ConsentStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'REVOKED':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'DENIED':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

/**
 * Returns default family members roster when a family group currently only has the creator.
 * Uses valid RFC 4122 v4 UUIDs to comply with FastAPI Pydantic schema validation.
 */
export function getDefaultMembersForFamily(famId: string): FamilyMember[] {
  const baseFam = famId || 'default-family';
  return [
    {
      id: 'e1000000-0000-4000-8000-000000000001',
      family_id: baseFam,
      user_id: 'e1000000-0000-4000-8000-000000000011',
      role: 'GUARDIAN',
      joined_at: '2026-10-10T12:00:00.000Z',
      name: 'Sarah Jenkins',
      member_name: 'Sarah Jenkins',
      user_name: 'Sarah Jenkins',
    },
    {
      id: 'e2000000-0000-4000-8000-000000000002',
      family_id: baseFam,
      user_id: 'e2000000-0000-4000-8000-000000000022',
      role: 'MEMBER',
      joined_at: '2026-10-10T14:30:00.000Z',
      name: 'Aarav Dutta',
      member_name: 'Aarav Dutta',
      user_name: 'Aarav Dutta',
    },
    {
      id: 'e3000000-0000-4000-8000-000000000003',
      family_id: baseFam,
      user_id: 'e3000000-0000-4000-8000-000000000033',
      role: 'MEMBER',
      joined_at: '2026-10-10T16:00:00.000Z',
      name: 'Kavita Dutta',
      member_name: 'Kavita Dutta',
      user_name: 'Kavita Dutta',
    },
  ];
}

/**
 * Formats a clean, user-friendly display name with their role tag for dropdowns and lists.
 */
export function getMemberDisplayName(
  m?: FamilyMember | null,
  currentUserId?: string,
  userDisplayName?: string
): string {
  if (!m) return 'Family Member';

  let name = m.name || m.member_name || m.user_name || m.profile?.full_name;

  if (!name && currentUserId && m.user_id === currentUserId) {
    name = userDisplayName || 'You';
  }

  if (!name) {
    name = m.role ? `Family Member` : 'Family Member';
  }

  if (m.role) {
    const roleUpper = m.role.toUpperCase();
    const formattedRole =
      roleUpper === 'ADMIN'
        ? 'Admin'
        : roleUpper === 'GUARDIAN'
        ? 'Guardian'
        : 'Member';
    const nameLower = name.toLowerCase();
    if (
      !nameLower.includes('admin') &&
      !nameLower.includes('guardian') &&
      !nameLower.includes('member')
    ) {
      return `${name} (${formattedRole})`;
    }
  }

  return name;
}

/**
 * Returns pre-seeded clinical records for standard default family members.
 */
export function getDefaultHealthRecordsForMember(memberId: string): HealthRecord[] {
  if (memberId === 'e1000000-0000-4000-8000-000000000001') {
    return [
      {
        id: 'rec-default-sarah-1',
        family_member_id: memberId,
        blood_group: 'A+',
        allergies: 'Penicillin, Dust mites',
        chronic_conditions: 'Mild Asthma',
        medical_history: 'Childhood onset asthma diagnosed at age 8. Well-managed with bronchodilators.',
        current_conditions: 'Routine preventative inhaler use during seasonal weather shifts.',
        doctor_name: 'Dr. Robert Vance',
        doctor_contact: '+1 (555) 432-8765 / Vance Pulmonary Clinic',
        notes: 'Annual spirometry completed; lung volume stable.',
        created_at: '2026-09-15T10:00:00.000Z',
        updated_at: '2026-10-05T14:30:00.000Z',
      },
    ];
  }
  if (memberId === 'e2000000-0000-4000-8000-000000000002') {
    return [
      {
        id: 'rec-default-aarav-1',
        family_member_id: memberId,
        blood_group: 'B+',
        allergies: 'None reported',
        chronic_conditions: 'None',
        medical_history: 'Full pediatric immunization series completed on schedule.',
        current_conditions: 'Active in sports; regular pediatric wellness visits.',
        doctor_name: 'Dr. Anita Roy',
        doctor_contact: '+1 (555) 321-7654 / City Pediatrics Center',
        notes: 'Growth percentiles and vision screening normal.',
        created_at: '2026-09-20T09:15:00.000Z',
        updated_at: '2026-10-02T11:20:00.000Z',
      },
    ];
  }
  if (memberId === 'e3000000-0000-4000-8000-000000000003') {
    return [
      {
        id: 'rec-default-kavita-1',
        family_member_id: memberId,
        blood_group: 'O+',
        allergies: 'Sulfa antibiotics, Tree nuts',
        chronic_conditions: 'Essential Hypertension (Stage 1)',
        medical_history: 'Mild hypertension diagnosed in 2021. Lifestyle management and low sodium diet.',
        current_conditions: 'Amlodipine 5mg once daily; BP averages 124/82 mmHg.',
        doctor_name: 'Dr. S. Banerjee',
        doctor_contact: '+1 (555) 987-6543 / Metro Heart & Vascular',
        notes: 'Echocardiogram clear. Next quarterly BP checkup in November.',
        created_at: '2026-08-10T14:00:00.000Z',
        updated_at: '2026-10-08T16:45:00.000Z',
      },
    ];
  }
  return [];
}

/**
 * Computes the complete roster of all family members:
 * Includes Creator/Admin, Server members, LocalStorage added members, and Default family members.
 */
export function getAllFamilyMembers(
  activeFamily: Family | null,
  user: any,
  userDisplayName?: string
): FamilyMember[] {
  const result: FamilyMember[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  const addMember = (m: FamilyMember) => {
    if (!m) return;
    const nameKey = (m.name || m.member_name || m.user_name || '').trim().toLowerCase();
    const idKey = m.id || m.user_id;
    if (idKey && seenIds.has(idKey)) return;
    if (nameKey && seenNames.has(nameKey)) return;

    if (idKey) seenIds.add(idKey);
    if (nameKey) seenNames.add(nameKey);
    result.push(m);
  };

  const adminDisplayName =
    userDisplayName ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Ranit Dutta';
  const adminUserId = user?.id || '508645ce-8c5e-4c7c-9b88-51829e598b96';
  const adminMemberId =
    activeFamily?.members?.find((m) => m.user_id === user?.id || m.role === 'ADMIN')?.id ||
    adminUserId;

  // 1. Add server members from activeFamily
  if (activeFamily?.members && activeFamily.members.length > 0) {
    activeFamily.members.forEach((m) => {
      if (m.user_id === user?.id || m.role === 'ADMIN') {
        addMember({
          ...m,
          name: m.name || m.member_name || m.user_name || `${adminDisplayName} (Admin)`,
          member_name: m.member_name || adminDisplayName,
        });
      } else {
        addMember(m);
      }
    });
  }

  // 2. Ensure Admin is added
  if (!result.some((m) => m.role === 'ADMIN' || m.user_id === user?.id)) {
    addMember({
      id: adminMemberId,
      family_id: activeFamily?.id || 'default-family',
      user_id: adminUserId,
      role: 'ADMIN',
      joined_at: new Date().toISOString(),
      name: `${adminDisplayName} (Admin)`,
      member_name: adminDisplayName,
      user_name: adminDisplayName,
    });
  }

  // 3. Add locally stored members from localStorage (all wt_family_members_* keys)
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wt_family_members_')) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const list: FamilyMember[] = JSON.parse(item);
              if (Array.isArray(list)) {
                list.forEach((lm) => addMember(lm));
              }
            } catch {}
          }
        }
      }
    }
  } catch {}

  // 4. Add default family members roster (Sarah Jenkins, Aarav Dutta, Kavita Dutta)
  const defaultList = getDefaultMembersForFamily(activeFamily?.id || 'default-family');
  const removedSaved =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(`wt_family_removed_${activeFamily?.id}`)
      : null;
  const removedIds: string[] = removedSaved ? JSON.parse(removedSaved) : [];

  defaultList.forEach((def) => {
    if (!removedIds.includes(def.id)) {
      addMember(def);
    }
  });

  return result;
}
