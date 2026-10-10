import React, { useState, useEffect } from 'react';
import { Phone, Plus, Shield, User, Trash2, Edit3, PhoneCall, Mail, ArrowUpRight } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { emergencyService } from '../lib/services/emergencyService';
import type { EmergencyContact, EmergencyContactCreate } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const EmergencyContactsPage: React.FC = () => {
  const { activeFamily, activeMember, setActiveMember } = useFamily();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  const [formData, setFormData] = useState<EmergencyContactCreate>({
    family_member_id: '',
    name: '',
    phone: '',
    relationship: 'Spouse',
    email: '',
    priority: 1,
    is_active: true,
  });

  const memberId = activeMember?.id || '';

  const fetchContacts = async () => {
    if (!memberId) {
      setContacts([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await emergencyService.getContacts(memberId);
      const sorted = (data || []).sort((a, b) => a.priority - b.priority);
      setContacts(sorted);
    } catch (err: any) {
      console.warn('Failed to load emergency contacts:', err);
      toast.error('Failed to load emergency contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [memberId]);

  const handleOpenCreate = () => {
    setEditingContact(null);
    setFormData({
      family_member_id: memberId,
      name: '',
      phone: '',
      relationship: 'Spouse',
      email: '',
      priority: contacts.length + 1,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: EmergencyContact) => {
    setEditingContact(c);
    setFormData({
      family_member_id: c.family_member_id,
      name: c.name,
      phone: c.phone,
      relationship: c.relationship || 'Spouse',
      email: c.email || '',
      priority: c.priority,
      is_active: c.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.family_member_id) {
      toast.error('Please select an active family member');
      return;
    }
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone number are required');
      return;
    }

    try {
      if (editingContact) {
        await emergencyService.updateContact(editingContact.id, formData);
        toast.success('Emergency contact updated');
      } else {
        await emergencyService.createContact(formData);
        toast.success('Emergency contact added to roster');
      }
      setIsModalOpen(false);
      fetchContacts();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this emergency contact?')) return;
    try {
      await emergencyService.deleteContact(id);
      toast.success('Contact removed');
      fetchContacts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete contact');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
            <Shield className="w-4 h-4" />
            <span>Crisis & Guardian Network</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Emergency Contacts Roster
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Designated responders immediately notified during an SOS incident or acute health alert.
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

          <Link to="/emergency/sos">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm">
              Emergency SOS
            </Button>
          </Link>

          <Button onClick={handleOpenCreate} variant="outline" className="border-slate-200">
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : contacts.length === 0 ? (
        <Card className="p-6 bg-white">
          <EmptyState
            icon={Phone}
            title="No emergency responders registered"
            description="Add priority contacts, caregivers, or emergency services to ensure rapid assistance."
            actionLabel="Add Primary Responder"
            onAction={handleOpenCreate}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((c) => (
            <Card
              key={c.id}
              className="p-6 bg-white border border-slate-200/80 hover:border-rose-200 transition-all shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-bold">
                      #{c.priority}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{c.name}</h3>
                      <span className="text-xs text-slate-500 font-medium">
                        {c.relationship || 'Emergency Responder'}
                      </span>
                    </div>
                  </div>

                  <Badge variant={c.priority === 1 ? 'red' : 'gray'} className="text-2xs uppercase">
                    {c.priority === 1 ? 'Primary' : `Priority ${c.priority}`}
                  </Badge>
                </div>

                <div className="space-y-2 pt-2 text-xs border-t border-slate-100">
                  <a
                    href={`tel:${c.phone}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-teal-600 font-semibold p-2 rounded-lg bg-slate-50 border border-slate-100 transition-colors"
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-600" />
                    <span>{c.phone}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
                  </a>

                  {c.email && (
                    <div className="flex items-center gap-2 text-slate-500 px-2 py-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  title="Edit contact"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Contact Full Name *
            </label>
            <Input
              placeholder="e.g. Sarah Miller"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Phone Number *
              </label>
              <Input
                placeholder="+1 (555) 019-2834"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Relationship
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500"
                value={formData.relationship || 'Spouse'}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              >
                {['Spouse', 'Parent', 'Child', 'Sibling', 'Guardian', 'Doctor', 'Neighbor', 'Other'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="sarah@example.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Priority Rank (1 = First)
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
              >
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>#{p} {p === 1 ? '(Primary Responder)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
              {editingContact ? 'Save Changes' : 'Add to Roster'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmergencyContactsPage;
