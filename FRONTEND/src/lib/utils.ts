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
export function getDefaultMembersForFamily(_famId?: string): FamilyMember[] {
  return [];
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
export function getDefaultHealthRecordsForMember(_memberId: string): HealthRecord[] {
  return [];
}

/**
 * Computes the complete roster of all family members:
 * Includes Creator/Admin, Server members, and user-added members.
 * Never includes unrequested mock or fake members.
 */
export function getAllFamilyMembers(
  activeFamily: Family | null,
  user: any,
  userDisplayName?: string
): FamilyMember[] {
  const result: FamilyMember[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  // Filter out any remnant mock members
  const mockNames = new Set(['sarah jenkins', 'aarav dutta', 'kavita dutta']);
  const mockIds = new Set([
    'e1000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000002',
    'e3000000-0000-4000-8000-000000000003',
  ]);

  const addMember = (m: FamilyMember) => {
    if (!m) return;
    const nameKey = (m.name || m.member_name || m.user_name || '').trim().toLowerCase();
    const idKey = m.id || m.user_id;
    if (mockNames.has(nameKey) || (idKey && mockIds.has(idKey))) return;
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

  // 3. Add locally stored members added by the user for this specific family
  try {
    if (typeof localStorage !== 'undefined' && activeFamily?.id) {
      const item = localStorage.getItem(`wt_family_members_${activeFamily.id}`);
      if (item) {
        const list: FamilyMember[] = JSON.parse(item);
        if (Array.isArray(list)) {
          list.forEach((lm) => addMember(lm));
        }
      }
    }
  } catch {}

  // 4. Filter out any members marked as removed
  const removedSaved =
    typeof localStorage !== 'undefined' && activeFamily?.id
      ? localStorage.getItem(`wt_family_removed_${activeFamily.id}`)
      : null;
  const removedIds: string[] = removedSaved ? JSON.parse(removedSaved) : [];

  return result.filter((m) => !removedIds.includes(m.id) && !removedIds.includes(m.user_id));
}
