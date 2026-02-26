import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, MapPin, Phone, Globe, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Resource {
  id: string;
  name: string;
  type: 'shelter' | 'treatment' | 'crisis' | 'food' | 'medical' | 'legal' | 'other';
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  website: string;
  hours: string;
  eligibility: string;
  services: string[];
  availability_status: 'available' | 'full' | 'closed' | 'unknown';
  is_active: boolean;
}

const RESOURCE_TYPES = [
  { value: 'shelter', label: 'Shelter', color: 'bg-blue-100 text-blue-800' },
  { value: 'treatment', label: 'Treatment', color: 'bg-green-100 text-green-800' },
  { value: 'crisis', label: 'Crisis', color: 'bg-red-100 text-red-800' },
  { value: 'food', label: 'Food', color: 'bg-orange-100 text-orange-800' },
  { value: 'medical', label: 'Medical', color: 'bg-purple-100 text-purple-800' },
  { value: 'legal', label: 'Legal', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'other', label: 'Other', color: 'bg-slate-100 text-slate-800' },
];

const AVAILABILITY_STATUS = [
  { value: 'available', label: 'Available', icon: CheckCircle, color: 'text-green-600' },
  { value: 'full', label: 'Full', icon: XCircle, color: 'text-red-600' },
  { value: 'closed', label: 'Closed', icon: XCircle, color: 'text-slate-600' },
  { value: 'unknown', label: 'Unknown', icon: AlertCircle, color: 'text-slate-400' },
];

export default function ResourceManager() {
  const { profile } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingResource, setEditingResource] = useState<Partial<Resource> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('name');

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editingResource) return;

    try {
      if (editingResource.id) {
        const { error } = await supabase
          .from('resources')
          .update({
            ...editingResource,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingResource.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('resources')
          .insert({
            ...editingResource,
            created_by: profile?.id,
          });

        if (error) throw error;
      }

      await loadResources();
      setIsEditing(false);
      setEditingResource(null);
    } catch (error) {
      console.error('Error saving resource:', error);
      alert('Failed to save resource');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Failed to delete resource');
    }
  }

  function startEdit(resource?: Resource) {
    setEditingResource(resource || {
      name: '',
      type: 'shelter',
      description: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      phone: '',
      website: '',
      hours: '',
      eligibility: '',
      services: [],
      availability_status: 'unknown',
      is_active: true,
    });
    setIsEditing(true);
  }

  const filteredResources = filterType === 'all'
    ? resources
    : resources.filter(r => r.type === filterType);

  if (loading) {
    return <div className="text-center py-8">Loading resources...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Resource Management</h2>
        <button
          onClick={() => startEdit()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Resource
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All ({resources.length})
        </button>
        {RESOURCE_TYPES.map(type => {
          const count = resources.filter(r => r.type === type.value).length;
          return (
            <button
              key={type.value}
              onClick={() => setFilterType(type.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === type.value
                  ? type.color
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        {filteredResources.map(resource => {
          const typeInfo = RESOURCE_TYPES.find(t => t.value === resource.type);
          const statusInfo = AVAILABILITY_STATUS.find(s => s.value === resource.availability_status);
          const StatusIcon = statusInfo?.icon || AlertCircle;

          return (
            <div key={resource.id} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-900">{resource.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeInfo?.color}`}>
                      {typeInfo?.label}
                    </span>
                    <div className={`flex items-center gap-1 ${statusInfo?.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{statusInfo?.label}</span>
                    </div>
                  </div>
                  <p className="text-slate-600 mb-4">{resource.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(resource)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(resource.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {resource.address && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{resource.address}, {resource.city}, {resource.state} {resource.zip_code}</span>
                  </div>
                )}
                {resource.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{resource.phone}</span>
                  </div>
                )}
                {resource.website && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <a href={resource.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Visit Website
                    </a>
                  </div>
                )}
                {resource.hours && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{resource.hours}</span>
                  </div>
                )}
              </div>

              {resource.services && resource.services.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {resource.services.map((service, idx) => (
                    <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                      {service}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isEditing && editingResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">
                {editingResource.id ? 'Edit Resource' : 'New Resource'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={editingResource.name || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                  <select
                    value={editingResource.type || 'shelter'}
                    onChange={(e) => setEditingResource({ ...editingResource, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {RESOURCE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={editingResource.description || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={editingResource.address || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, address: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                  <input
                    type="text"
                    value={editingResource.city || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, city: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                  <input
                    type="text"
                    value={editingResource.state || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, state: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={editingResource.zip_code || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, zip_code: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <input
                    type="text"
                    value={editingResource.phone || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                  <input
                    type="url"
                    value={editingResource.website || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, website: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hours</label>
                  <input
                    type="text"
                    value={editingResource.hours || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, hours: e.target.value })}
                    placeholder="24/7, Mon-Fri 9am-5pm, etc."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Availability</label>
                  <select
                    value={editingResource.availability_status || 'unknown'}
                    onChange={(e) => setEditingResource({ ...editingResource, availability_status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {AVAILABILITY_STATUS.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Services (comma-separated)</label>
                  <input
                    type="text"
                    value={editingResource.services?.join(', ') || ''}
                    onChange={(e) => setEditingResource({
                      ...editingResource,
                      services: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Emergency shelter, Meals, Case management"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Eligibility</label>
                  <textarea
                    value={editingResource.eligibility || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, eligibility: e.target.value })}
                    rows={2}
                    placeholder="Age requirements, income limits, etc."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingResource.is_active ?? true}
                      onChange={(e) => setEditingResource({ ...editingResource, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Save Resource
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
