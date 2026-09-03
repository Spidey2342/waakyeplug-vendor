import { useState, useRef } from 'react';
import { updateVendor, uploadVendorLogo, type Vendor } from '../../lib/api';
import { updatePassword } from '../../lib/auth';
import { useToast } from '../../context/ToastContext';
import { Store, KeyRound, MapPin, Loader2, CheckCircle2, Camera } from 'lucide-react';

export default function SettingsTab({ vendor, onVendorUpdated }: { vendor: Vendor; onVendorUpdated: (v: Vendor) => void }) {
  const { toastSuccess, toastError } = useToast();

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const toggleSupportsBuild = async () => {
  try {
    const updated = await updateVendor(vendor.id, { supports_build: !vendor.supports_build });
    onVendorUpdated(updated);
    toastSuccess(
      updated.supports_build
        ? 'Customers can now build their own bowl from this vendor.'
        : 'Build Your Own is now off for this vendor — only fixed items will show.'
    );
  } catch (err: any) {
    toastError(err.message || 'Could not update this setting.');
  }
};

  const handleLogoPick = async (file: File | undefined) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const logoUrl = await uploadVendorLogo(vendor.id, file);
      const updated = await updateVendor(vendor.id, { logo_url: logoUrl });
      onVendorUpdated(updated);
      toastSuccess('Shop photo updated.');
    } catch (err: any) {
      toastError(err.message || 'Could not upload photo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const [shopForm, setShopForm] = useState({
    businessName: vendor.business_name,
    description: vendor.description ?? '',
    location: vendor.location ?? '',
    phone: vendor.phone ?? '',
  });
  const [savingShop, setSavingShop] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShop(true);
    try {
      const updated = await updateVendor(vendor.id, {
        business_name: shopForm.businessName,
        description: shopForm.description,
        location: shopForm.location,
        phone: shopForm.phone,
      });
      onVendorUpdated(updated);
      toastSuccess('Shop details updated.');
    } catch (err: any) {
      toastError(err.message || 'Could not update shop.');
    } finally {
      setSavingShop(false);
    }
  };

  const handleSetGpsLocation = () => {
    if (!navigator.geolocation) {
      toastError('Your browser does not support location access.');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const updated = await updateVendor(vendor.id, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          onVendorUpdated(updated);
          toastSuccess('Shop location saved. Customers can now see how far they are from you.');
        } catch (err: any) {
          toastError(err.message || 'Could not save location.');
        } finally {
          setLocatingGps(false);
        }
      },
      (err) => {
        toastError(err.message || 'Could not get your location. Make sure location access is allowed.');
        setLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleOpen = async () => {
    try {
      const updated = await updateVendor(vendor.id, { is_open: !vendor.is_open });
      onVendorUpdated(updated);
      toastSuccess(`Shop is now ${updated.is_open ? 'open' : 'closed'} for orders.`);
    } catch (err: any) {
      toastError(err.message || 'Could not update shop status.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toastError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { toastError("Passwords don't match."); return; }
    setSavingPassword(true);
    try {
      await updatePassword(password);
      toastSuccess('Password updated.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toastError(err.message || 'Could not update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your shop and account.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera size={18} className="text-orange-600" />
          <h2 className="font-bold text-gray-900">Shop Photo</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          This is what customers see when picking a vendor — make it count.
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => logoFileInputRef.current?.click()}
            disabled={uploadingLogo}
            className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 hover:border-orange-400 flex items-center justify-center overflow-hidden bg-gray-50 transition disabled:opacity-50 shrink-0"
          >
            {uploadingLogo ? (
              <Loader2 size={20} className="animate-spin text-gray-400" />
            ) : vendor.logo_url ? (
              <img src={vendor.logo_url} alt={vendor.business_name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <Camera size={20} />
                <span className="text-[10px] mt-1">Add Photo</span>
              </div>
            )}
          </button>
          <input
            ref={logoFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleLogoPick(e.target.files?.[0])}
          />
          <p className="text-xs text-gray-400 flex-1">
            {vendor.logo_url ? 'Tap the photo to replace it.' : 'Tap to upload a photo of your shop or your food.'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Store size={18} className="text-orange-600" />
            <h2 className="font-bold text-gray-900">Shop Status</h2>
          </div>
          <button
            onClick={toggleOpen}
            className={`text-sm font-semibold px-4 py-2 rounded-full transition
              ${vendor.is_open ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {vendor.is_open ? 'Open — tap to close' : 'Closed — tap to open'}
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="font-bold text-gray-900">Build Your Own</h2>
      <p className="text-sm text-gray-500 mt-0.5 max-w-xs">
        When on, customers can customize a bowl from this vendor's Size/Protein/Extra items.
        When off, only fixed items (Combos) show — no build option appears for this vendor.
      </p>
    </div>
    <button
      onClick={toggleSupportsBuild}
      className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-full transition
        ${vendor.supports_build ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
    >
      {vendor.supports_build ? 'On' : 'Off'}
    </button>
  </div>
</div>

        <form onSubmit={handleShopSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
            <input value={shopForm.businessName} onChange={(e) => setShopForm({ ...shopForm, businessName: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={2} value={shopForm.description} onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location (address text)</label>
            <input value={shopForm.location} onChange={(e) => setShopForm({ ...shopForm, location: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Phone</label>
            <input value={shopForm.phone} onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100" />
          </div>
          <button type="submit" disabled={savingShop} className="self-start bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
            {savingShop ? 'Saving...' : 'Save Shop Details'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={18} className="text-orange-600" />
          <h2 className="font-bold text-gray-900">Shop GPS Location</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          This is what customers use to see how far they are from you — it's separate from the address text above.
          Stand at your shop and tap the button below.
        </p>

        {vendor.latitude && vendor.longitude ? (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <p className="text-sm text-green-800">Location saved ({vendor.latitude.toFixed(4)}, {vendor.longitude.toFixed(4)})</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
            <MapPin size={16} className="text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800">No GPS location set yet — customers won't see a distance for your shop.</p>
          </div>
        )}

        <button
          onClick={handleSetGpsLocation}
          disabled={locatingGps}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          {locatingGps ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
          {locatingGps ? 'Getting Location...' : vendor.latitude ? 'Update My Location' : 'Use My Current Location'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={18} className="text-orange-600" />
          <h2 className="font-bold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100" />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100" />
          <button type="submit" disabled={savingPassword} className="self-start bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}