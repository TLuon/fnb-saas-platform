import { useEffect, useState, useMemo } from 'react';
import { useStaffStore } from '../store/staffStore';
import type { StaffMember, Role } from '../store/staffStore';
import { StaffToolbar } from '../components/staff/StaffToolbar';
import { StaffTable } from '../components/staff/StaffTable';
import { StaffFormModal } from '../components/staff/StaffFormModal';
import { TemporaryCredentialModal } from '../components/staff/TemporaryCredentialModal';
import { DeactivateConfirmModal } from '../components/staff/DeactivateConfirmModal';
import { ResetStaffPasswordModal } from '../components/staff/ResetStaffPasswordModal';

export default function StaffManagement() {
  const { staff, fetchStaff, createStaff, updateStaff, deactivateStaff, toggleStaff, resetPassword } = useStaffStore();
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal state
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [tempCredentialState, setTempCredentialState] = useState<{
    isOpen: boolean;
    name: string;
    password?: string;
  }>({ isOpen: false, name: '' });

  const [deactivateState, setDeactivateState] = useState<{
    isOpen: boolean;
    staff: StaffMember | null;
  }>({ isOpen: false, staff: null });

  const [resetPasswordState, setResetPasswordState] = useState<{
    isOpen: boolean;
    staff: StaffMember | null;
  }>({ isOpen: false, staff: null });

  useEffect(() => {
    const init = async () => {
      await fetchStaff();
      setLoading(false);
    };
    init();
  }, [fetchStaff]);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
      
      const isActive = s.active;
      if (statusFilter === 'ACTIVE' && !isActive) return false;
      if (statusFilter === 'INACTIVE' && isActive) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = s.name.toLowerCase().includes(query);
        const matchPhone = s.phone?.includes(query);
        if (!matchName && !matchPhone) return false;
      }
      return true;
    });
  }, [staff, roleFilter, statusFilter, searchTerm]);

  const totalActiveOwners = useMemo(() => {
    return staff.filter(s => s.role === 'OWNER' && s.active).length;
  }, [staff]);

  const handleFormSubmit = async (data: Partial<StaffMember>) => {
    if (editingStaff) {
      await updateStaff(editingStaff.id, data);
      setFormOpen(false);
    } else {
      const result = await createStaff(data);
      setFormOpen(false);
      setTempCredentialState({
        isOpen: true,
        name: result.full_name || result.name || data.name || 'Nhân viên',
        password: result.temp_password || result.temporary_password
      });
    }
  };

  const handleDeactivate = async () => {
    if (deactivateState.staff) {
      await deactivateStaff(deactivateState.staff.id);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-fade-in">
      <div>
        <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">
          Quản lý Nhân sự
        </h2>
        <p className="text-gray-500 mt-2">
          Phân quyền, cấp tài khoản và quản lý trạng thái nhân viên
        </p>
      </div>

      <StaffToolbar 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onAddStaff={() => { setEditingStaff(null); setFormOpen(true); }}
      />

      <StaffTable 
        staff={filteredStaff}
        onEditStaff={(s) => { setEditingStaff(s); setFormOpen(true); }}
        onDeactivateStaff={(s) => setDeactivateState({ isOpen: true, staff: s })}
        onToggleStaff={(s) => toggleStaff(s.id)}
        onResetPassword={(s) => setResetPasswordState({ isOpen: true, staff: s })}
      />

      <StaffFormModal 
        isOpen={isFormOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingStaff}
      />

      <TemporaryCredentialModal 
        isOpen={tempCredentialState.isOpen}
        onClose={() => setTempCredentialState({ isOpen: false, name: '' })}
        staffName={tempCredentialState.name}
        temporaryPassword={tempCredentialState.password}
      />

      <DeactivateConfirmModal 
        isOpen={deactivateState.isOpen}
        onClose={() => setDeactivateState({ isOpen: false, staff: null })}
        onConfirm={handleDeactivate}
        staff={deactivateState.staff}
        totalActiveOwners={totalActiveOwners}
      />

      <ResetStaffPasswordModal
        isOpen={resetPasswordState.isOpen}
        onClose={() => setResetPasswordState({ isOpen: false, staff: null })}
        staff={resetPasswordState.staff}
        onConfirmReset={(id, customPassword) => resetPassword(id, customPassword)}
      />
    </div>
  );
}
