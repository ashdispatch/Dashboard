import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import * as dat from '../services/datService';
import * as dialer from '../services/dialerService';

export const useStore = create((set, get) => ({

  // ── Theme ────────────────────────────────────────────────
  theme: 'dark',
  setInitialTheme: () => { document.documentElement.classList.add('dark'); },
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList[newTheme === 'dark' ? 'add' : 'remove']('dark');
    return { theme: newTheme };
  }),

  // ── Auth ─────────────────────────────────────────────────
  isAuthenticated: false,
  authLoading: true,

  initAuth: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      set({ isAuthenticated: true, authLoading: false });
      await get().loadAllData();
    } else {
      set({ isAuthenticated: false, authLoading: false });
    }
    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        set({ isAuthenticated: true });
        await get().loadAllData();
      } else {
        set({ isAuthenticated: false, datUsers: get()._emptyDatStructure(), dialers: [], bin: [] });
      }
    });
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, message: error.message };
    return { success: true };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ isAuthenticated: false });
  },

  // ── Data Loading ─────────────────────────────────────────
  dataLoading: false,

  _emptyDatStructure: () => [
    { dat_type: 'Single Search', mails: [] },
    { dat_type: 'Double Search', mails: [] },
    { dat_type: 'Unlimited Search', mails: [] },
  ],

  loadAllData: async () => {
    set({ dataLoading: true });
    try {
      const [datUsers, dialers, bin] = await Promise.all([
        dat.fetchDatData(),
        dialer.fetchDialers(),
        dat.fetchBin()
      ]);
      set({ datUsers, dialers, bin, dataLoading: false });
    } catch (err) {
      console.error('Failed to load data:', err);
      set({ dataLoading: false });
    }
  },

  // ── DAT Users ─────────────────────────────────────────────
  datUsers: [
    { dat_type: 'Single Search', mails: [] },
    { dat_type: 'Double Search', mails: [] },
    { dat_type: 'Unlimited Search', mails: [] },
  ],

  addDatMail: async (datType, mailName, screenName) => {
    const newMail = await dat.createMail(datType, mailName, screenName);
    set(state => ({
      datUsers: state.datUsers.map(tg =>
        tg.dat_type === datType
          ? { ...tg, mails: [...tg.mails, { ...newMail, users: [] }] }
          : tg
      )
    }));
    return newMail;
  },

  deleteDatMail: async (datType, mailId) => {
    await dat.deleteMail(mailId);
    set(state => ({
      datUsers: state.datUsers.map(tg =>
        tg.dat_type === datType
          ? { ...tg, mails: tg.mails.filter(m => m.id !== mailId) }
          : tg
      )
    }));
  },

  addDatUser: async (datType, mailId, fields) => {
    const newUser = await dat.createUser(mailId, fields);
    set(state => ({
      datUsers: state.datUsers.map(tg =>
        tg.dat_type === datType
          ? { ...tg, mails: tg.mails.map(m => m.id === mailId ? { ...m, users: [...m.users, newUser] } : m) }
          : tg
      )
    }));
  },

  editDatUser: async (userId, updatedFields) => {
    // Find previous snapshot
    let prevSnapshot = null;
    get().datUsers.forEach(tg => tg.mails.forEach(m => {
      const u = m.users.find(u => u.id === userId);
      if (u) prevSnapshot = u;
    }));
    if (!prevSnapshot) return;
    await dat.updateUser(userId, prevSnapshot, updatedFields);
    const historyEntry = {
      price: prevSnapshot.price, status: prevSnapshot.status,
      start_date: prevSnapshot.start_date, end_date: prevSnapshot.end_date,
      modified_at: new Date().toISOString(), action: 'Updated'
    };
    set(state => ({
      datUsers: state.datUsers.map(tg => ({
        ...tg, mails: tg.mails.map(m => ({
          ...m, users: m.users.map(u => u.id === userId
            ? { ...u, ...updatedFields, history: [...(u.history || []), historyEntry] }
            : u
          )
        }))
      }))
    }));
  },

  updateDatStatus: async (userId, status) => {
    await dat.updateUserStatus(userId, status);
    set(state => ({
      datUsers: state.datUsers.map(tg => ({
        ...tg, mails: tg.mails.map(m => ({
          ...m, users: m.users.map(u => u.id === userId ? { ...u, status } : u)
        }))
      }))
    }));
  },

  deleteDatUser: async (userId) => {
    let mailCtx = null;
    let targetUser = null;
    get().datUsers.forEach(tg => tg.mails.forEach(m => {
      const u = m.users.find(u => u.id === userId);
      if (u) { targetUser = u; mailCtx = { dat_type: tg.dat_type, mail_id: m.id, screen_name: m.screen_name }; }
    }));
    if (!mailCtx) return;
    const binRecord = await dat.softDeleteUser(userId, mailCtx);
    set(state => ({
      datUsers: state.datUsers.map(tg => ({
        ...tg, mails: tg.mails.map(m => ({ ...m, users: m.users.filter(u => u.id !== userId) }))
      })),
      bin: [{ ...binRecord, history: targetUser?.history || [] }, ...state.bin]
    }));
  },

  importDatUsers: async (datType, mailId, parsedUsers) => {
    const newUsers = await dat.bulkInsertUsers(mailId, parsedUsers);
    set(state => ({
      datUsers: state.datUsers.map(tg =>
        tg.dat_type === datType
          ? { ...tg, mails: tg.mails.map(m => m.id === mailId ? { ...m, users: [...m.users, ...newUsers] } : m) }
          : tg
      )
    }));
  },

  fetchUserHistory: async (userId) => {
    const history = await dat.fetchUserHistory(userId);
    set(state => ({
      datUsers: state.datUsers.map(tg => ({
        ...tg, mails: tg.mails.map(m => ({
          ...m, users: m.users.map(u => u.id === userId ? { ...u, history } : u)
        }))
      }))
    }));
    return history;
  },

  // ── Bin ───────────────────────────────────────────────────
  bin: [],

  restoreDatUser: async (binRecord) => {
    const restoredUser = await dat.restoreUser(binRecord);
    set(state => ({
      bin: state.bin.filter(b => b.id !== binRecord.id),
      datUsers: state.datUsers.map(tg =>
        tg.dat_type === binRecord.original_dat_type
          ? { ...tg, mails: tg.mails.map(m =>
              m.id === binRecord.original_mail_id ? { ...m, users: [...m.users, restoredUser] } : m
            )}
          : tg
      )
    }));
  },

  permanentlyDeleteFromBin: async (binId) => {
    await dat.permanentlyDelete(binId);
    set(state => ({ bin: state.bin.filter(b => b.id !== binId) }));
  },

  emptyBin: async () => {
    await dat.emptyBin();
    set({ bin: [] });
  },

  // ── Dialers ───────────────────────────────────────────────
  dialers: [],

  addDialer: async (fields) => {
    const newDialer = await dialer.createDialer(fields);
    set(state => ({ dialers: [...state.dialers, newDialer] }));
  },

  deleteDialer: async (id) => {
    await dialer.deleteDialer(id);
    set(state => ({ dialers: state.dialers.filter(d => d.id !== id) }));
  },

  updateDialerStatus: async (id, status) => {
    await dialer.updateDialerStatus(id, status);
    set(state => ({ dialers: state.dialers.map(d => d.id === id ? { ...d, status } : d) }));
  },

  importDialers: async (parsedArray) => {
    const newDialers = await dialer.bulkInsertDialers(parsedArray);
    set(state => ({ dialers: [...state.dialers, ...newDialers] }));
  },

  // ── Metrics (computed from local state) ───────────────────
  getDatMetrics: () => {
    const users = [];
    const breakdown = { 'Single Search': 0, 'Double Search': 0, 'Unlimited Search': 0 };
    get().datUsers.forEach(tg => tg.mails.forEach(m => {
      users.push(...m.users);
      if (breakdown[tg.dat_type] !== undefined) breakdown[tg.dat_type] += m.users.length;
    }));
    const totalRevenue = users.reduce((a, u) => a + (Number(u.price) || 0), 0);
    const paidRevenue = users.filter(u => u.status === 'Paid').reduce((a, u) => a + (Number(u.price) || 0), 0);
    return {
      total: users.length,
      paid: users.filter(u => u.status === 'Paid').length,
      unpaid: users.filter(u => u.status === 'Unpaid').length,
      totalRevenue, paidRevenue, unpaidRevenue: totalRevenue - paidRevenue,
      breakdown
    };
  },

  getDialerMetrics: () => {
    const users = get().dialers;
    const breakdown = { 'Zoom': 0, 'Google Voice': 0, 'Teams': 0, 'Other': 0 };
    users.forEach(u => {
      if (breakdown[u.dialer_type] !== undefined) breakdown[u.dialer_type]++;
      else breakdown['Other']++;
    });
    const totalRevenue = users.reduce((a, u) => a + (Number(u.price) || 0), 0);
    const paidRevenue = users.filter(u => u.status === 'Paid').reduce((a, u) => a + (Number(u.price) || 0), 0);
    return {
      total: users.length,
      paid: users.filter(u => u.status === 'Paid').length,
      unpaid: users.filter(u => u.status === 'Unpaid').length,
      totalRevenue, paidRevenue, unpaidRevenue: totalRevenue - paidRevenue,
      breakdown
    };
  }
}));
