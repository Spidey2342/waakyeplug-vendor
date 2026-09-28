import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import OverviewTab from './tabs/OverviewTab';
import OrdersTab from './tabs/OrdersTab';
import MenuTab from './tabs/MenuTab';
import SettingsTab from './tabs/SettingsTab';
import HistoryTab from './tabs/HistoryTab';
import type { Vendor } from '../lib/api';

export default function Dashboard({
  vendor,
  onVendorUpdated,
  onVendorRemoved,
}: {
  vendor: Vendor;
  onVendorUpdated: (v: Vendor) => void;
  onVendorRemoved: (vendorId: string) => void;
}) {
  const [active, setActive] = useState('Overview');

  const tabs: Record<string, JSX.Element> = {
    Overview: <OverviewTab vendor={vendor} />,
    Orders: <OrdersTab vendor={vendor} />,
    History: <HistoryTab vendor={vendor} />,
    Menu: <MenuTab vendor={vendor} />,
    Settings: (
      <SettingsTab
        vendor={vendor}
        onVendorUpdated={onVendorUpdated}
        onVendorRemoved={onVendorRemoved}
      />
    ),
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased flex flex-col md:flex-row">
      <Sidebar active={active} setActive={setActive} shopName={vendor.business_name} />
      <main className="flex-1 p-4 sm:p-6 md:p-8 min-h-screen overflow-x-hidden">
        {tabs[active]}
      </main>
    </div>
  );
}