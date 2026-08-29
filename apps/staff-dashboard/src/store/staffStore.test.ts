import { describe, it, expect, beforeEach } from 'vitest';
import { useStaffStore } from './staffStore';

describe('useStaffStore', () => {
  beforeEach(() => {
    useStaffStore.setState({ staff: [] });
  });

  it('should add a staff member and toggle active status', () => {
    const store = useStaffStore.getState();
    store.addStaff({ id: 's1', name: 'John Doe', role: 'STAFF', active: true });
    
    expect(useStaffStore.getState().staff).toHaveLength(1);
    
    useStaffStore.getState().toggleStaff('s1');
    expect(useStaffStore.getState().staff[0].active).toBe(false);
  });
});
