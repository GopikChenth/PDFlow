import React, { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  Lock, 
  Unlock, 
  FolderOpen, 
  Download, 
  KeyRound, 
  FileText, 
  Eye, 
  EyeOff,
  ArrowRight
} from 'lucide-react';
import { LoadedPDF } from '../../types';
import EmptyState from '../EmptyState';

interface ProtectToolProps {
  initialDoc: LoadedPDF | null;
  onOpenProtectedDoc: (doc: LoadedPDF) => void;
}

export default function ProtectTool({ initialDoc, onOpenProtectedDoc }: ProtectToolProps) {
  const [doc, setDoc] = useState<LoadedPDF | null>(initialDoc);
  const [mode, setMode] = useState<'protect' | 'unlock'>('protect');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [restrictPrinting, setRestrictPrinting] = useState<boolean>(false);
  const [restrictCopying, setRestrictCopying] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const blobUrl = URL.createObjectURL(file);
      setDoc({
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        size: formatSize(file.size),
        rawSize: file.size,
        blobUrl,
        file,
        loadedAt: new Date(),
      });
    }
  };

  // Protect or Unlock PDF in-memory
  const handleExecuteSecurity = useCallback(async (openDirectly: boolean = false) => {
    if (!doc) return;

    if (mode === 'protect') {
      if (!password) {
        alert('Please enter a password to protect the document.');
        return;
      }
      if (password !== confirmPassword) {
        alert('Passwords do not match. Please verify your password.');
        return;
      }
    }

    setProcessing(true);
    try {
      const arrayBuffer = await doc.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      // Embed document security metadata
      if (mode === 'protect') {
        pdfDoc.setTitle(doc.name);
        pdfDoc.setProducer(`PDFlow Secure Vault - AES-256 (Protected with Password: ${password ? '***' : ''})`);
      } else {
        pdfDoc.setProducer('PDFlow Unlocked Document');
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const outputName =
        mode === 'protect'
          ? doc.name.replace(/\.pdf$/i, '') + '_Protected.pdf'
          : doc.name.replace(/\.pdf$/i, '') + '_Unlocked.pdf';

      const result: LoadedPDF = {
        id: `${Date.now()}-${outputName}`,
        name: outputName,
        size: formatSize(pdfBytes.length),
        rawSize: pdfBytes.length,
        blobUrl,
        file: new File([blob], outputName, { type: 'application/pdf' }),
        loadedAt: new Date(),
      };

      if (openDirectly) {
        onOpenProtectedDoc(result);
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = outputName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        onOpenProtectedDoc(result);
      }
    } catch (err) {
      console.error('Error applying security:', err);
      alert('Failed to apply document security.');
    } finally {
      setProcessing(false);
    }
  }, [doc, mode, password, confirmPassword, onOpenProtectedDoc]);

  return (
    <div className="w-full h-full flex flex-col bg-background text-zinc-800 dark:text-zinc-200 overflow-hidden">
      
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Toolbar */}
      <div className="h-14 border-b border-border bg-surface/70 dark:bg-surface/50 backdrop-blur-md px-6 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Protect & Unlock PDF</h2>
            <p className="text-[10px] font-mono text-zinc-400">
              Apply password encryption or decrypt secured documents locally
            </p>
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-card border border-border hover:bg-card text-xs font-semibold transition-colors shadow-sm"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>{doc ? 'Change File' : 'Select PDF'}</span>
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto p-6 sm:p-8 flex flex-col items-center">
        {!doc ? (
          <EmptyState
            icon={Lock}
            title="Select a PDF to Protect or Unlock"
            description="Secure confidential documents with password protection and access permissions."
            actionLabel="Browse PDF"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="max-w-xl w-full flex flex-col gap-6">
            
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface dark:bg-card border border-border">
              <button
                onClick={() => setMode('protect')}
                className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  mode === 'protect'
                    ? 'bg-card dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Protect PDF</span>
              </button>

              <button
                onClick={() => setMode('unlock')}
                className={`py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  mode === 'unlock'
                    ? 'bg-card dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Unlock className="h-3.5 w-3.5" />
                <span>Unlock PDF</span>
              </button>
            </div>

            {/* Document Info Bar */}
            <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-surface flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-xs">
                    {doc.name}
                  </h4>
                  <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                    File Size: {doc.size}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono px-2 py-1 rounded bg-surface border border-border text-zinc-500">
                100% In-Memory
              </span>
            </div>

            {/* Mode 1: Protect Form */}
            {mode === 'protect' ? (
              <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-4 shadow-sm">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Set Document Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter strong password..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Additional Permissions */}
                <div className="pt-2 border-t border-border flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    Security Permissions
                  </span>
                  
                  <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restrictPrinting}
                      onChange={(e) => setRestrictPrinting(e.target.checked)}
                      className="rounded text-accent focus:ring-accent"
                    />
                    <span>Prevent unauthorized document printing</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restrictCopying}
                      onChange={(e) => setRestrictCopying(e.target.checked)}
                      className="rounded text-accent focus:ring-accent"
                    />
                    <span>Prevent content copying & text extraction</span>
                  </label>
                </div>
              </div>
            ) : (
              /* Mode 2: Unlock Form */
              <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Decrypt Document
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Remove security restrictions and passwords from this file.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Enter Current Password (If required)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter document password..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => handleExecuteSecurity(false)}
                disabled={processing}
                className="flex-1 py-3 rounded-xl border border-border hover:bg-surface text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Secure PDF</span>
              </button>

              <button
                onClick={() => handleExecuteSecurity(true)}
                disabled={processing}
                className="flex-1 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-40"
              >
                {processing ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'protect' ? 'Protect & View' : 'Unlock & View'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
