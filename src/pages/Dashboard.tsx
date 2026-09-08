import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import OverviewTab from './tabs/OverviewTab';
import OrdersTab from './tabs/OrdersTab';
import MenuTab from './tabs/MenuTab';
import SettingsTab from './tabs/SettingsTab';
import type { Vendor } from '../lib/api';

export default function Dashboard({ vendor, onVendorUpdated }: { vendor: Vendor; onVendorUpdated: (v: Vendor) => void }) {
  const [active, setActive] = useState('Overview');

  const tabs: Record<string, JSX.Element> = {
    Overview: <OverviewTab vendor={vendor} />,
    Orders: <OrdersTab vendor={vendor} />,
    Menu: <MenuTab vendor={vendor} />,
    Settings: <SettingsTab vendor={vendor} onVendorUpdated={onVendorUpdated} />,
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