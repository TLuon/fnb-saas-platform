import { create } from 'zustand';

export interface CoffeePass {
  id: string;
  name: string;
  totalLimit: number;
  remaining: number;
}

interface CoffeePassStore {
  activePasses: CoffeePass[];
  buyPass: (pass: CoffeePass) => void;
  useTicket: (passId: string) => boolean;
}

export const useCoffeePassStore = create<CoffeePassStore>((set, get) => ({
  activePasses: [],
  
  buyPass: (pass) => set((state) => ({
    activePasses: [...state.activePasses, { ...pass, id: crypto.randomUUID() }]
  })),

  useTicket: (passId) => {
    const state = get();
    const pass = state.activePasses.find(p => p.id === passId);
    
    if (!pass || pass.remaining <= 0) {
      return false;
    }

    set({
      activePasses: state.activePasses.map(p => 
        p.id === passId 
          ? { ...p, remaining: p.remaining - 1 }
          : p
      )
    });

    return true;
  }
}));
