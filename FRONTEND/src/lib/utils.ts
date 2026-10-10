import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { FamilyRole, ConsentStatus } from '../types';

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
