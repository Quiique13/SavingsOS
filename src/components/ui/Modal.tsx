type ModalProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({
  title,
  description,
  isOpen,
  onClose,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-zinc-400">{description}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm text-zinc-300 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
