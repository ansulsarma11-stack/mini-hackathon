import React from 'react';
import { ShieldCheck, Lock, AlertTriangle, Eye, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityPolicyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Biometric Security & Retention Safeguards</h2>
              <p className="text-xs text-slate-400">FERPA / GDPR-compliant student biometric guidelines</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
          {/* Safeguard 1 */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Fallible Biometric Matching & Human-in-the-Loop</span>
            </div>
            <p>
              Facial recognition is treated strictly as an assistive tool rather than an authoritative judge. 
              The system requires teacher confirmation before committing attendance. Borderline similarity matches 
              (below threshold) are highlighted as <strong>Uncertain</strong> and unverified faces are kept as 
              <strong>Unknown</strong> to eliminate false identity attribution.
            </p>
          </div>

          {/* Safeguard 2 */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Cryptographic Storage of Facial Encodings</span>
            </div>
            <p>
              Reference photographs are converted into 128-dimensional floating-point mathematical embedding vectors.
              Raw facial pixel matrices are not used directly for identification. Embedding vectors are isolated in 
              the SQLite database with role-based read restrictions.
            </p>
          </div>

          {/* Safeguard 3 */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Data Retention & Right to Erasure</span>
            </div>
            <p>
              Student facial encodings and reference photographs are retained strictly during the active academic term.
              Upon graduation, class completion, or student opt-out request, administrators can permanently erase student 
              records and associated mathematical vectors with a single click.
            </p>
          </div>

          {/* Safeguard 4 */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Immutable Audit Trail</span>
            </div>
            <p>
              Every attendance override, status change, or manual correction records a cryptographic timestamp, 
              teacher username, and justification note to safeguard student rights and eliminate tampering.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
          >
            I Understand the Biometric Policy
          </button>
        </div>
      </div>
    </div>
  );
};
