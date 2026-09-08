import { useState, useEffect } from 'react';
import { getAllVendors, type Vendor } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Store, Plus, ChevronLeft, ToggleLeft, ChevronRight, Users } from 'lucide-react';
import OnboardingPage from './OnboardingPage';
import Dashboard from './Dashboard';
import RidersTab from './tabs/RidersTab';

type TopLevelView = 'vendors' | 'riders';

export default function AdminHome() {
  const { toastError } = useToast();
  const [view, setView] = useState<TopLevelView>('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const data = await getAllVendors();
      setVendors(data);
    } catch (err: any) {
      toastError(err.message || 'Could not load vendors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVendors(); }, []);

  if (selectedVendor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
          <button
            onClick={() => setSelectedVendor(null)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition"
          >
            <ChevronLeft size={16} /> All Vendors
          </button>
        </div>
        <Dashboard
          vendor={selectedVendor}
          onVendorUpdated={(v) => {
            setSelectedVendor(v);
            setVendors((prev) => prev.map((existing) => (existing.id === v.id ? v : existing)));
          }}
        />
      </div>
    );
  }

  if (showAddVendor) {
    return (
      <OnboardingPage
        onCreated={(v) => {
          setVendors((prev) => [...prev, v]);
          setShowAddVendor(false);
          setSelectedVendor(v);
        }}
        onCancel={() => setShowAddVendor(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-2 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setView('vendors')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition ${
              view === 'vendors' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            <Store size={15} /> Vendors
          </button>
          <button
            onClick={() => setView('riders')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition ${
              view === 'riders' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            <Users size={15} /> Riders
          </button>
        </div>

        {view === 'riders' ? (
          <RidersTab />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
                <p className="text-sm text-gray-400 mt-0.5">Select a vendor to manage their menu, or add a new one.</p>
              </div>
              <button
                onClick={() => setShowAddVendor(true)}
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
              >
                <Plus size={16} /> Add Vendor
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400 text-center py-12">Loading vendors...</p>
            ) : vendors.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center">
                <Store size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No vendors yet — add your first one.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {vendors.map((vendor) => (
                    <button
                      key={vendor.id}
                      onClick={() => setSelectedVendor(vendor)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden">
                          {vendor.logo_url ? (
                            <img src={vendor.logo_url} alt={vendor.business_name} className="w-full h-full object-cover" />
                          ) : (
                            <Store size={18} className="text-orange-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{vendor.business_name}</p>
                          <p className="text-xs text-gray-400 truncate">{vendor.location || 'No location set'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {vendor.supports_build && (
                          <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                            <ToggleLeft size={12} /> BUILD
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${vendor.is_open ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {vendor.is_open ? 'OPEN' : 'CLOSED'}
                        </span>
                        <ChevronRight size={16} className="text-gray-300" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}