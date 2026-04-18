import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { Plus, Search, Trash2, Mail, FileUp, FileDown, Hash, ChevronLeft, ChevronRight, ArchiveRestore } from 'lucide-react';
import { format } from 'date-fns';
import { Modal, Input, Select, Button } from '../components/ui/Modal';
import { formatCurrency } from '../lib/utils';
import { DatUserTable } from '../components/dat/DatUserTable';
import { HistoryModal } from '../components/dat/modals/HistoryModal';
import { RecycleBinModal } from '../components/dat/modals/RecycleBinModal';

export default function DatUsers() {
  const { datUsers, deleteDatUser, updateDatStatus, addDatMail, addDatUser, deleteDatMail, importDatUsers, editDatUser } = useStore();
  
  // View States
  const [activeType, setActiveType] = useState('Single Search');
  const [activeMailId, setActiveMailId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal Triggers
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBinOpen, setIsBinOpen] = useState(false);
  
  // Transitory Datasets
  const [historyUser, setHistoryUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [newMail, setNewMail] = useState({ mail_name: '', screen_name: '' });
  const [newUser, setNewUser] = useState({
    client_name: '', username: '', price: 0, status: 'Paid',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd')
  });

  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Deep Data Lookups
  const activeTypeData = useMemo(() => datUsers.find(d => d.dat_type === activeType) || { mails: [] }, [datUsers, activeType]);
  
  useEffect(() => {
    if (activeTypeData.mails.length > 0) {
      if (!activeTypeData.mails.find(m => m.id === activeMailId)) setActiveMailId(activeTypeData.mails[0].id);
    } else {
      setActiveMailId(null);
    }
  }, [activeTypeData, activeMailId]);

  const activeMailData = useMemo(() => activeTypeData.mails.find(m => m.id === activeMailId) || { users: [] }, [activeTypeData, activeMailId]);

  const filteredUsers = useMemo(() => {
    return activeMailData.users.filter(u => {
      const matchSearch = u.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = filterStatus === 'All' || u.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [activeMailData, searchQuery, filterStatus]);

  // Horizontal Scroll Wheel Capture
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleWheelNative = (e) => {
      if (e.deltaY !== 0) { e.preventDefault(); el.scrollLeft += e.deltaY; }
    };
    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
  }, [activeType]);

  const scrollLeft = () => scrollContainerRef.current?.scrollBy({ left: -250, behavior: 'smooth' });
  const scrollRight = () => scrollContainerRef.current?.scrollBy({ left: 250, behavior: 'smooth' });

  // Creation/Edit Handlers
  const handleCreateMail = async (e) => {
    e.preventDefault();
    if (!newMail.mail_name || !newMail.screen_name) return;
    const created = await addDatMail(activeType, newMail.mail_name, newMail.screen_name);
    setNewMail({ mail_name: '', screen_name: '' });
    setIsMailModalOpen(false);
    if (created) setActiveMailId(created.id);
  };

  const handleRemoveMail = () => {
    if (!activeMailId) return;
    if (window.confirm(`Are you sure you want to delete ${activeMailData.screen_name}? This will cascade all nesting users to the Bin.`)) {
      deleteDatMail(activeType, activeMailId);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.client_name || !activeMailId) return;
    await addDatUser(activeType, activeMailId, {
      ...newUser,
      price: Number(newUser.price) || 0,
      start_date: new Date(newUser.start_date).toISOString(),
      end_date: new Date(newUser.end_date).toISOString(),
    });
    setIsUserModalOpen(false);
    setNewUser({ ...newUser, client_name: '', username: '', price: 0 });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    await editDatUser(editingUser.id, {
      client_name: editingUser.client_name,
      username: editingUser.username,
      price: Number(editingUser.price) || 0,
      status: editingUser.status,
      start_date: new Date(editingUser.start_date).toISOString(),
      end_date: new Date(editingUser.end_date).toISOString()
    });
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  const triggerEdit = (user) => {
    setEditingUser({
      ...user,
      start_date: format(new Date(user.start_date), 'yyyy-MM-dd'),
      end_date: format(new Date(user.end_date), 'yyyy-MM-dd')
    });
    setIsEditModalOpen(true);
  };

  // CSV Integration
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !activeMailId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const rows = event.target.result.split('\n').map(row => row.trim()).filter(row => row.length > 0);
      if (rows.length > 0) {
        const parsedUsers = [];
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 6) {
            let parsedStatus = cols[3].toLowerCase() === 'paid' ? 'Paid' : 'Unpaid';
            parsedUsers.push({
              id: Date.now().toString() + '-' + i,
              client_name: cols[0] || 'Unknown', username: cols[1] || '',
              price: Number(cols[2]) || 0, status: parsedStatus,
              start_date: new Date(cols[4]).toISOString() || new Date().toISOString(),
              end_date: new Date(cols[5]).toISOString() || new Date().toISOString(),
            });
          }
        }
        if (parsedUsers.length > 0) {
          importDatUsers(activeType, activeMailId, parsedUsers);
          alert(`Successfully imported ${parsedUsers.length} users!`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleCSVExport = () => {
    if (filteredUsers.length === 0) return alert('No data to export.');
    const headers = ["Client Name", "Username", "Price", "Status", "Start Date", "End Date"];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + 
      filteredUsers.map(e => `"${e.client_name}","${e.username}",${e.price},${e.status},${format(new Date(e.start_date), 'yyyy-MM-dd')},${format(new Date(e.end_date), 'yyyy-MM-dd')}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dat_users_export.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
      {/* Tier 0: Header & Bin */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-[var(--accent-primary)] tracking-wide">DAT USERS</h1>
          <p className="text-[var(--text-secondary)] mt-1 font-mono text-sm">Manage hierarchical DAT accounts and histories.</p>
        </div>
        <Button variant="secondary" onClick={() => setIsBinOpen(true)} className="flex items-center gap-2 border-[var(--border-default)]">
          <ArchiveRestore size={16} className="text-[var(--text-muted)]" /> Recycle Bin
        </Button>
      </motion.div>

      {/* Tier 1: DAT Types */}
      <motion.div variants={fadeUp} className="mb-6 flex gap-4">
        {['Single Search', 'Double Search', 'Unlimited Search'].map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-6 py-3 rounded-xl border font-display font-medium tracking-widest transition-colors shadow-sm ${
              activeType === type 
                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[#0A0A0A]' 
                : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
            }`}
          >
            {type}
          </button>
        ))}
      </motion.div>

      {/* Tier 2: Mails */}
      <motion.div variants={fadeUp} className="mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-4 w-full">
        <div className="relative flex items-center flex-1 min-w-0 group border-b border-[var(--border-default)]">
          <button onClick={scrollLeft} className="absolute left-0 z-10 h-full px-2 bg-gradient-to-r from-[var(--bg-base)] via-[var(--bg-base)] to-transparent text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none hidden sm:block">
            <ChevronLeft size={24} />
          </button>
          
          <div ref={scrollContainerRef} className="flex space-x-1 overflow-x-auto scrollbar-hide flex-1 scroll-smooth sm:px-6">
            {activeTypeData.mails.map(mail => (
               <button
                 key={mail.id}
                 onClick={() => setActiveMailId(mail.id)}
                 className={`px-5 py-2.5 rounded-t-lg font-mono text-sm whitespace-nowrap transition-colors border-b-2 flex flex-col items-start ${
                   activeMailId === mail.id 
                     ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/5' 
                     : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                 }`}
               >
                 <span className="font-bold opacity-80 mb-0.5">{mail.screen_name || 'Screen Name'}</span>
                 <span className="text-xs opacity-60 font-mono">{mail.mail_name}</span>
               </button>
            ))}
            {activeTypeData.mails.length === 0 && (
               <span className="px-5 py-2.5 font-mono text-sm text-[var(--text-muted)] italic">No mails. Navigate or add one.</span>
            )}
          </div>

          <button onClick={scrollRight} className="absolute right-0 z-10 h-full px-2 bg-gradient-to-l from-[var(--bg-base)] via-[var(--bg-base)] to-transparent text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none hidden sm:block">
            <ChevronRight size={24} />
          </button>
        </div>
        
        {/* Tier 2 Controls */}
        <div className="flex flex-wrap gap-2 mb-2 items-center flex-shrink-0">
          <Button variant="secondary" onClick={() => setIsMailModalOpen(true)} className="flex items-center gap-2">
            <Mail size={16} /> Add Mail
          </Button>

          {activeMailId && (
            <>
              <div className="w-px h-6 bg-[var(--border-default)] mx-1" />
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 border-[var(--accent-primary)] text-[var(--accent-primary)]">
                <FileUp size={16} />
              </Button>
              <Button variant="secondary" onClick={handleCSVExport} title="Export CSV" className="px-2.5 text-[var(--text-primary)]">
                <FileDown size={16} />
              </Button>
              <Button onClick={() => setIsUserModalOpen(true)} className="flex items-center gap-2">
                <Plus size={16} /> Add User
              </Button>
              <Button variant="danger" onClick={handleRemoveMail} title="Delete active mail" className="px-2.5">
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Tier 3: Users Table Layout */}
      <motion.div variants={fadeUp}>
        <Card>
          <div className="p-4 border-b border-[var(--border-default)] flex flex-col md:flex-row justify-between gap-4 items-center">
            <div className="flex-1 flex items-center gap-2 text-[var(--text-primary)]">
               {activeMailData.screen_name && (
                 <div className="flex items-center gap-2 bg-[var(--bg-elevated)] px-3 py-1.5 rounded-md border border-[var(--border-default)]">
                   <Hash size={16} className="text-[var(--accent-primary)]" />
                   <span className="font-display tracking-widest font-bold text-sm uppercase">{activeMailData.screen_name}</span>
                 </div>
               )}
               <div className="relative flex-1 max-w-sm ml-2">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                 <input 
                   type="text" placeholder="Search name or username..." 
                   value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                   className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-md pl-10 pr-4 py-2 focus:outline-none focus:border-[var(--accent-primary)] font-mono text-sm"
                 />
               </div>
            </div>

            <select 
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-md px-4 py-2 focus:outline-none focus:border-[var(--accent-primary)] font-mono text-sm"
            >
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeType + activeMailId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DatUserTable 
                filteredUsers={filteredUsers}
                activeMailId={activeMailId}
                onStatusToggle={updateDatStatus}
                onEditClick={triggerEdit}
                onDeleteClick={deleteDatUser}
                onRowClick={setHistoryUser}
              />
            </motion.div>
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Forms & Modals */}
      <Modal isOpen={isMailModalOpen} onClose={() => setIsMailModalOpen(false)} title={`Create Mail for ${activeType}`}>
        <form onSubmit={handleCreateMail} className="flex flex-col gap-4">
          <Input label="Mail Address" value={newMail.mail_name} onChange={e => setNewMail({...newMail, mail_name: e.target.value})} required autoFocus />
          <Input label="Screen Name" value={newMail.screen_name} onChange={e => setNewMail({...newMail, screen_name: e.target.value})} required />
          <div className="flex justify-end pt-4"><Button type="button" variant="secondary" className="mr-3" onClick={() => setIsMailModalOpen(false)}>Cancel</Button><Button type="submit">Create</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={`Add User to ${activeType}`}>
        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
          <Input label="Client Name" value={newUser.client_name} onChange={e => setNewUser({...newUser, client_name: e.target.value})} required autoFocus />
          <Input label="Username (Optional)" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" label="Price" value={newUser.price} onChange={e => setNewUser({...newUser, price: e.target.value})} required min="0" step="0.01" />
            <Select label="Status" value={newUser.status} onChange={e => setNewUser({...newUser, status: e.target.value})}>
              <option value="Paid">Paid</option><option value="Unpaid">Unpaid</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" label="Start Date" value={newUser.start_date} onChange={e => setNewUser({...newUser, start_date: e.target.value})} required />
            <Input type="date" label="End Date" value={newUser.end_date} onChange={e => setNewUser({...newUser, end_date: e.target.value})} required />
          </div>
          <div className="flex justify-end pt-4"><Button type="button" variant="secondary" className="mr-3" onClick={() => setIsUserModalOpen(false)}>Cancel</Button><Button type="submit">Create User</Button></div>
        </form>
      </Modal>

      {editingUser && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            <Input label="Client Name" value={editingUser.client_name} onChange={e => setEditingUser({...editingUser, client_name: e.target.value})} required />
            <Input label="Username (Optional)" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <Input type="number" label="Price" value={editingUser.price} onChange={e => setEditingUser({...editingUser, price: e.target.value})} required min="0" step="0.01" />
              <Select label="Status" value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value})}>
                <option value="Paid">Paid</option><option value="Unpaid">Unpaid</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input type="date" label="Start Date" value={editingUser.start_date} onChange={e => setEditingUser({...editingUser, start_date: e.target.value})} required />
              <Input type="date" label="End Date" value={editingUser.end_date} onChange={e => setEditingUser({...editingUser, end_date: e.target.value})} required />
            </div>
            <div className="flex justify-end pt-4"><Button type="button" variant="secondary" className="mr-3" onClick={() => setIsEditModalOpen(false)}>Cancel</Button><Button type="submit">Save Changes</Button></div>
          </form>
        </Modal>
      )}

      {/* Extracted Global Modals */}
      <HistoryModal isOpen={!!historyUser} onClose={() => setHistoryUser(null)} user={historyUser} datType={activeType} />
      <RecycleBinModal isOpen={isBinOpen} onClose={() => setIsBinOpen(false)} />

    </motion.div>
  );
}
