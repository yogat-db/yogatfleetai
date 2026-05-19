'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import theme from '@/app/theme';

type DeleteVehicleFormProps = {
  vehicleName?: string;
  registration?: string;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
  buttonLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireTyping?: boolean;
};

export default function DeleteVehicleForm({
  vehicleName,
  registration,
  onConfirm,
  onCancel,
  buttonLabel = 'Delete vehicle',
  confirmLabel = 'Delete vehicle',
  cancelLabel = 'Cancel',
  requireTyping = false,
}: DeleteVehicleFormProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmInputText = registration || 'DELETE';
  const canConfirm = !requireTyping || confirmText.trim() === confirmInputText;

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 10);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirming) {
        handleClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, confirming]);

  const handleOpen = () => {
    setError(null);
    setConfirmText('');
    setOpen(true);
  };

  const handleClose = () => {
    if (confirming) return;
    setOpen(false);
    setError(null);
    setConfirmText('');
    onCancel?.();
  };

  const handleConfirm = async () => {
    if (!canConfirm || confirming) return;

    try {
      setConfirming(true);
      setError(null);
            await onConfirm();
      setError(null);
      setConfirmText('');
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete vehicle'
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        style={styles.triggerButton}
        aria-label={
          registration
            ? `Delete vehicle ${registration}`
            : 'Delete vehicle'
        }
      >
        <Trash2 size={16} />
        <span>{buttonLabel}</span>
      </button>

      {open && (
        <div
          style={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-vehicle-title"
          aria-describedby="delete-vehicle-description"
        >
          <div style={styles.dialog}>
            <div style={styles.dialogHeader}>
              <div style={styles.iconWrap}>
                <AlertTriangle size={18} />
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleClose}
                style={styles.closeButton}
                aria-label="Close delete dialog"
              >
                <X size={16} />
              </button>
            </div>

            <h2 id="delete-vehicle-title" style={styles.title}>
              Delete vehicle?
            </h2>

            <p
              id="delete-vehicle-description"
              style={styles.description}
            >
              This will permanently remove
              {vehicleName || registration ? ' ' : ''}

              <strong>
                {vehicleName
                  ? `${vehicleName}${registration ? ` (${registration})` : ''}`
                  : registration || 'this vehicle'}
              </strong>

              {' '}from your fleet.
            </p>

            <p style={styles.subtleText}>
              This action cannot be undone.
            </p>

            {requireTyping && (
              <div style={styles.field}>
                <label htmlFor="delete-confirm-input" style={styles.label}>
                  Type <strong>{confirmInputText}</strong> to confirm
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmInputText}
                  style={styles.input}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            )}

            {error && (
              <div role="alert" style={styles.errorBox}>
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div style={styles.actions}>
              <button
                type="button"
                onClick={handleClose}
                style={styles.cancelButton}
                disabled={confirming}
              >
                {cancelLabel}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  ...styles.confirmButton,
                  ...(canConfirm ? null : styles.confirmButtonDisabled),
                }}
                disabled={confirming || !canConfirm}
              >
                {confirming ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>{confirmLabel}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  triggerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.status.critical}`,
    background: 'transparent',
    color: theme.colors.status.critical,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    background: theme.colors.background.card,
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    color: theme.colors.text.primary,
  },
  dialogHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${theme.colors.status.critical}12`,
    color: theme.colors.status.critical,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    background: 'transparent',
    color: theme.colors.text.secondary,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    margin: '0 0 8px',
  },
  description: {
    fontSize: 14,
    lineHeight: 1.6,
    color: theme.colors.text.primary,
    margin: 0,
  },
  subtleText: {
    marginTop: 8,
    marginBottom: 0,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  field: {
    marginTop: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  input: {
    borderRadius: 10,
    border: `1px solid ${theme.colors.border.light}`,
    background: theme.colors.background.main,
    color: theme.colors.text.primary,
    padding: '10px 12px',
    fontSize: 13,
    outline: 'none',
  },
  errorBox: {
    marginTop: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: '10px 12px',
    border: `1px solid ${theme.colors.status.critical}`,
    background: `${theme.colors.status.critical}10`,
    color: theme.colors.status.critical,
    fontSize: 13,
  },
  actions: {
    marginTop: 18,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  cancelButton: {
    padding: '8px 12px',
    borderRadius: 999,
    border: `1px solid ${theme.colors.border.light}`,
    background: 'transparent',
    color: theme.colors.text.secondary,
    fontSize: 13,
    cursor: 'pointer',
  },
  confirmButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    border: 'none',
    background: theme.colors.status.critical,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};