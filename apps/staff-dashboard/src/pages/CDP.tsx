import { useEffect, useState } from 'react';
import { useCdpStore } from '../store/cdpStore';
import { SegmentTabs } from '../components/cdp/SegmentTabs';
import { CustomerTable } from '../components/cdp/CustomerTable';

export default function CDP() {
  const { customers, loading, fetchCustomers } = useCdpStore();
  const [activeSegment, setActiveSegment] = useState('ALL');

  useEffect(() => {
    fetchCustomers(activeSegment);
  }, [activeSegment, fetchCustomers]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">CDP & Khách hàng</h2>
        <p className="text-gray-500 mt-2">Nền tảng Dữ liệu Khách hàng (Customer Data Platform)</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
        <SegmentTabs 
          activeSegment={activeSegment} 
          onSegmentChange={setActiveSegment} 
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
        </div>
      ) : (
        <CustomerTable customers={customers} />
      )}
    </div>
  );
}
