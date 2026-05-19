import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import type { Owner } from '@/types/auth';

interface ImpersonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  owner: Owner | null;
}

export function ImpersonateModal({ isOpen, onClose, token, owner }: ImpersonateModalProps) {
  if (!isOpen || !token || !owner) return null;

  const iframeUrl = `/owner/dashboard?impersonate_token=${token}&impersonate_user=${encodeURIComponent(JSON.stringify(owner))}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full h-full max-w-[1400px] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 text-primary p-1.5 rounded-lg">
              <ExternalLink className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-none">Impersonating: {owner.name}</h2>
              <p className="text-xs text-gray-400 mt-1">"God Mode" Active - Any actions taken will be recorded in the audit log.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Close Impersonation"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 bg-gray-100 relative">
          <iframe 
            src={iframeUrl}
            className="absolute inset-0 w-full h-full border-none"
            title="Impersonation Frame"
          />
        </div>
      </div>
    </div>
  );
}
