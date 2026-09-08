import { useState, useEffect, useMemo } from 'react';
import { getAllRiders, approveRiderApplication, declineRiderApplication, type Rider } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Circle,
  Bike,
  HandCoins,
  IdCard,
  MapPin,
  Phone,
  UserCheck,
  X,
  Loader2,
  Calendar,
  Banknote,
} from 'lucide-react';

export default function RidersTab() {
  const { toastSuccess, toastError } = useToast();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailRider, setDetailRider] = useState<Rider | null>(null);

  const load = async () => {
    try {
      const data = await getAllRiders();
      setRiders(data);
    } catch (err: any) {
      toastError(err.message || 'Could not load riders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pending = useMemo(() => riders.filter((r) => !r.is_approved), [riders]);
  const active = useMemo(() => riders.filter((r) => r.is_approved), [riders]);

  async function handleApprove(rider: Rider) {
    setBusyId(rider.id);
    try {
      await approveRiderApplication(rider.id);
      setRiders((prev) => prev.map((r) => (r.id === rider.id ? { ...r, is_approved: true } : r)));
      toastSuccess(`${rider.profiles?.full_name ?? 'Rider'} approved — they can now log in.`);
    } catch (err: any) {
      toastError(err.message || 'Could not approve this application.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(rider: Rider) {
    if (!window.confirm(`Decline ${rider.profiles?.full_name ?? 'this'}'s application? This can't be undone.`)) return;
    setBusyId(rider.id);
    try {
      await declineRiderApplication(rider.id);
      setRiders((prev) => prev.filter((r) => r.id !== rider.id));
      toastSuccess('Application declined.');
    } catch (err: any) {
      toastError(err.message || 'Could not decline this application.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Riders</h1>
        <p className="text-sm text-gray-400 mt-0.5">Every rider on the platform — riders aren't tied to any one vendor.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading riders...</p>
      ) : (
        <>
          {/* ── Pending applications ── */}
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-bold text-gray-900">Pending Applications</h2>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {pending.map((rider) => (
                  <div key={rider.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {rider.photo_url ? (
                          <img src={rider.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users size={18} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800">{rider.profiles?.full_name ?? 'Rider'}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Phone size={11} /> {rider.profiles?.phone}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-500 mb-4 bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5">
                        <Bike size={12} className="text-gray-400 shrink-0" />
                        <span className="capitalize">{rider.transport_type ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">{rider.home_area ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <IdCard size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">{rider.ghana_card_number ?? '—'}</span>
                      </div>
                      {rider.emergency_contact_name && (
                        <div className="flex items-center gap-1.5 col-span-2">
                          <Phone size={12} className="text-gray-400 shrink-0" />
                          <span className="truncate">
                            {rider.emergency_contact_name} · {rider.emergency_contact_phone}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecline(rider)}
                        disabled={busyId === rider.id}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 py-2.5 rounded-lg transition"
                      >
                        <X size={14} /> Decline
                      </button>
                      <button
                        onClick={() => handleApprove(rider)}
                        disabled={busyId === rider.id}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 py-2.5 rounded-lg transition"
                      >
                        {busyId === rider.id ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Active riders — now tappable to see their full profile ── */}
          <div>
            <h2 className="font-bold text-gray-900 mb-3">Active Riders</h2>
            {active.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                <Users size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No approved riders yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {active.map((rider) => (
                    <button
                      key={rider.id}
                      onClick={() => setDetailRider(rider)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center overflow-hidden">
                          {rider.photo_url ? (
                            <img src={rider.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Bike size={16} className="text-orange-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{rider.profiles?.full_name ?? 'Rider'}</p>
                          <p className="text-xs text-gray-400">{rider.profiles?.phone}{rider.transport_type ? ` · ${rider.transport_type}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {Number(rider.commission_owed) > 0 && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-orange-600">
                            <HandCoins size={12} /> GHS {Number(rider.commission_owed).toFixed(2)} owed
                          </span>
                        )}
                        <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${rider.is_online ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          <Circle size={7} className="fill-current" /> {rider.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Rider detail modal ── */}
      {detailRider && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailRider(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {detailRider.photo_url ? (
                    <img src={detailRider.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={22} className="text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{detailRider.profiles?.full_name ?? 'Rider'}</p>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 ${detailRider.is_online ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <Circle size={6} className="fill-current" /> {detailRider.is_online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <button onClick={() => setDetailRider(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1 mb-5">
              {[
                { icon: Phone, label: 'Phone', value: detailRider.profiles?.phone },
                { icon: Bike, label: 'Transport', value: detailRider.transport_type, capitalize: true },
                { icon: MapPin, label: 'Home Area', value: detailRider.home_area },
                { icon: IdCard, label: 'Ghana Card', value: detailRider.ghana_card_number },
                { icon: Phone, label: 'Emergency Contact', value: detailRider.emergency_contact_name ? `${detailRider.emergency_contact_name} · ${detailRider.emergency_contact_phone}` : null },
                { icon: Banknote, label: 'Deposit', value: detailRider.deposit_amount ? `GHS ${Number(detailRider.deposit_amount).toFixed(2)}` : 'None on file' },
                { icon: Calendar, label: 'Joined', value: detailRider.created_at ? new Date(detailRider.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <row.icon size={15} className="text-gray-400 shrink-0" />
                  <span className={`text-sm text-gray-700 ${row.capitalize ? 'capitalize' : ''}`}>{row.value ?? '—'}</span>
                </div>
              ))}
            </div>

            {Number(detailRider.commission_owed) > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 text-orange-700 text-sm font-semibold px-4 py-3 rounded-xl">
                <HandCoins size={16} />
                GHS {Number(detailRider.commission_owed).toFixed(2)} commission currently owed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}