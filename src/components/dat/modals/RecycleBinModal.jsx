import React, { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Button } from '../../ui/Modal';
import { formatCurrency } from '../../../lib/utils';
import { Badge } from '../../ui/Badge';
import { Trash2, RefreshCw, AlertOctagon } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { HistoryModal } from './HistoryModal';

export function RecycleBinModal({ isOpen, onClose }) {
  const { bin, restoreDatUser, permanentlyDeleteFromBin, emptyBin } = useStore();
  const [historyUser, setHistoryUser] = useState(null);

  const handleEmptyBin = async () => {
    if (window.confirm("WARNING: Permanently delete ALL users in the bin? This cannot be undone.")) {
      await emptyBin();
    }
  };

  const handlePermanentDelete = async (e, user) => {
    e.stopPropagation();
    if (window.confirm("Permanently delete this user?")) {
      await permanentlyDeleteFromBin(user.id);
    }
  };

  const handleRestore = async (e, user) => {
    e.stopPropagation();
    if (window.confirm("Restore this user back to their active Mail group?")) {
      await restoreDatUser(user);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Global Recycle Bin" size="xl">
        <div className="flex flex-col gap-4 w-full max-w-5xl">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-mono text-[var(--text-muted)]">
              <AlertOctagon size={14} className="inline mr-2" />
              Items here are soft-deleted. You can view their history or restore them back to production.
            </p>
            <Button variant="danger" onClick={handleEmptyBin} className="flex items-center gap-2 px-4 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              <Trash2 size={16} /> Empty Bin
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border-default)] min-h-[300px]">
            <table className="w-full text-left border-collapse bg-[var(--bg-base)] cursor-default">
              <thead>
                <tr className="bg-[var(--semantic-negative)]/10 border-b border-[var(--border-default)] text-[var(--semantic-negative)] text-xs font-mono uppercase tracking-wider">
                  <th className="p-4 font-medium">Deleted At</th>
                  <th className="p-4 font-medium">Client / Mail Context</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">End Date</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {bin.length > 0 ? (
                    bin.map((user) => (
                      <motion.tr 
                        key={user.id} 
                        onClick={() => setHistoryUser(user)}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="border-b border-[var(--border-default)] hover:bg-[var(--bg-elevated)]/50 transition-colors cursor-pointer group"
                        title="Click to view full purchase history"
                      >
                        <td className="p-4 font-mono text-sm text-[var(--text-secondary)] opacity-80">
                          {format(new Date(user.deleted_at || new Date()), 'MMM dd, HH:mm')}
                        </td>
                        <td className="p-4">
                          <p className="font-mono text-sm font-bold text-[var(--text-primary)]">{user.client_name}</p>
                          <p className="font-mono text-xs text-[var(--text-muted)] mt-1">
                            [{user.original_dat_type}] {'->'} {user.original_mail_name}
                          </p>
                        </td>
                        <td className="p-4 font-mono text-sm opacity-60">{formatCurrency(user.price || 0)}</td>
                        <td className="p-4 opacity-70"><Badge status={user.status}>{user.status}</Badge></td>
                        <td className="p-4 font-mono text-sm text-[var(--text-secondary)] opacity-80">
                          {format(new Date(user.end_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2 items-center h-full pt-5">
                          <button 
                            onClick={(e) => handleRestore(e, user)}
                            className="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[#0a0a0a] transition-all p-2 rounded-md"
                            title="Restore User"
                          >
                            <RefreshCw size={16} />
                          </button>
                          <button 
                            onClick={(e) => handlePermanentDelete(e, user)}
                            className="bg-[var(--semantic-negative)]/10 text-[var(--semantic-negative)] hover:bg-[var(--semantic-negative)] hover:text-white transition-all p-2 rounded-md"
                            title="Permanently Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-[var(--text-muted)] font-mono text-sm">
                        Recycle Bin is completely empty.
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={onClose} variant="secondary">Close Windows</Button>
          </div>
        </div>
      </Modal>

      {/* Floating nested modal to support History clicks from inside the Bin */}
      <HistoryModal 
        isOpen={!!historyUser} 
        onClose={() => setHistoryUser(null)} 
        user={historyUser} 
        datType={historyUser?.original_dat_type} 
        isDeleted={true} 
      />
    </>
  );
}
