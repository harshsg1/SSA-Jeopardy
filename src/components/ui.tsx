import { create } from 'zustand';
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

// ---------- Button ----------

type Variant = 'primary' | 'gold' | 'ghost' | 'danger' | 'success' | 'subtle';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-royal-600 hover:bg-royal-500 text-white shadow-lg shadow-royal-600/30',
  gold: 'bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold shadow-lg shadow-gold-500/30',
  ghost: 'bg-white/5 hover:bg-white/12 text-white border border-white/10',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  subtle: 'hover:bg-white/10 text-blue-100',
};

export function Button({
  variant = 'ghost',
  size = 'md',
  className = '',
  icon,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode }) {
  const sz = size === 'sm' ? 'px-2.5 py-1.5 text-sm gap-1.5' : size === 'lg' ? 'px-6 py-3 text-lg gap-2.5' : 'px-4 py-2 gap-2';
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none ${sz} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg p-1.5 text-blue-100 hover:bg-white/10 hover:text-white transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------- Form bits ----------

export function Field({ label, hint, children, className = '' }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-blue-200/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-blue-200/50">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-white/5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-gold-500' : 'bg-white/15'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-5.5' : 'left-0.5'}`} />
      </button>
      <span>
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-sm text-blue-200/60">{description}</span>}
      </span>
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className = '',
  ...rest
}: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; className?: string } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
>) {
  return (
    <input
      type="number"
      className={`input ${className}`}
      value={Number.isFinite(value) ? value : ''}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const n = e.target.value === '' ? NaN : Number(e.target.value);
        if (!Number.isFinite(n)) return;
        let v = n;
        if (min != null) v = Math.max(min, v);
        if (max != null) v = Math.min(max, v);
        onChange(v);
      }}
      {...rest}
    />
  );
}

export function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-2" title={label}>
      <input
        type="color"
        aria-label={label}
        value={value || '#0a1a8f'}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5"
      />
    </label>
  );
}

// ---------- Modal ----------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    // Focus the first field once, when the dialog opens.
    if (!ref.current?.contains(document.activeElement)) ref.current?.querySelector<HTMLElement>('input,textarea,select')?.focus();
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={`panel anim-fade-up flex max-h-[94vh] w-full flex-col !bg-navy-900 ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'} rounded-b-none sm:rounded-2xl`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h2 className="text-lg font-bold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Confirm dialog (promise-based) ----------

interface ConfirmState {
  req: { title: string; message: ReactNode; confirmLabel: string; danger: boolean; resolve: (v: boolean) => void } | null;
}
const useConfirmStore = create<ConfirmState>(() => ({ req: null }));

export function confirmDialog(opts: { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.setState({
      req: { title: opts.title, message: opts.message, confirmLabel: opts.confirmLabel ?? 'Confirm', danger: !!opts.danger, resolve },
    });
  });
}

export function ConfirmHost() {
  const req = useConfirmStore((s) => s.req);
  const close = (v: boolean) => {
    req?.resolve(v);
    useConfirmStore.setState({ req: null });
  };
  return (
    <Modal
      open={!!req}
      onClose={() => close(false)}
      title={req?.title}
      footer={
        <>
          <Button onClick={() => close(false)}>Cancel</Button>
          <Button variant={req?.danger ? 'danger' : 'gold'} onClick={() => close(true)} autoFocus>
            {req?.confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-blue-100">{req?.message}</div>
    </Modal>
  );
}

// ---------- Toasts ----------

interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}
const useToastStore = create<{ toasts: Toast[] }>(() => ({ toasts: [] }));
let toastId = 0;

export function toast(message: string, kind: Toast['kind'] = 'info') {
  const id = ++toastId;
  useToastStore.setState((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
  setTimeout(() => useToastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`anim-fade-up rounded-xl px-4 py-2.5 font-medium shadow-xl ${
            t.kind === 'success' ? 'bg-emerald-600' : t.kind === 'error' ? 'bg-red-600' : 'bg-navy-700 border border-white/15'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ---------- Misc ----------

export function Avatar({ avatar, color, size = 36 }: { avatar: string; color: string; size?: number }) {
  const isImg = avatar.startsWith('data:') || avatar.startsWith('http');
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2"
      style={{ width: size, height: size, borderColor: color, background: color + '33', fontSize: size * 0.55 }}
    >
      {isImg ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : avatar || '🙂'}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-white/25 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-blue-100">{children}</kbd>;
}

export function formatPoints(n: number) {
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString();
}

export function relTime(ts: number) {
  const d = Date.now() - ts;
  const m = Math.round(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
