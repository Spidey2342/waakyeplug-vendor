import { useState } from 'react';
import { Store } from 'lucide-react';
import { createVendor, type Vendor } from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function OnboardingPage({ onCreated, onCancel }: { onCreated: (vendor: Vendor) => void; onCancel: () => void }) {
  const { toastError } = useToast();
  const [form, setForm] = useState({ businessName: '', description: '', location: '', phone: '', supportsBuild: false });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.location.trim()) {
      toastError('Shop name and location are required.');
      return;
    }
    setSubmitting(true);
    try {
      const vendor = await createVendor({
        businessName: form.businessName,
        description: form.description,
        location: form.location,
        phone: form.phone,
        supportsBuild: form.supportsBuild,
      });
      onCreated(vendor);
    } catch (err: any) {
      toastError(err.message || 'Could not add this vendor. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center mx-auto mb-3">
            <Store className="text-white" size={26} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Add a Vendor</h1>
          <p className="text-sm text-gray-500 mt-1">Add a new shop to the platform.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
            <input name="businessName" value={form.businessName} onChange={handleChange} placeholder="e.g. Auntie Ama's Waakye"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="What do they serve?"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Osu, near the Circle"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. 024 XXX XXXX"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100" />
          </div>

          <label className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.supportsBuild}
              onChange={(e) => setForm({ ...form, supportsBuild: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-orange-600"
            />
            <span className="text-sm text-gray-700">
              <span className="font-semibold block">Supports "Build Your Own"</span>
              Turn this on if customers can customize a bowl from this vendor's Size/Protein/Extra items.
              Leave off if this vendor only sells fixed, set items.
            </span>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-3 rounded-full transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition"
            >
              {submitting ? 'Adding...' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}