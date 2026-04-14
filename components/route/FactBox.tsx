// components/route/FactBox.tsx

interface FactBoxProps {
  children: React.ReactNode;
}

export default function FactBox({ children }: FactBoxProps) {
  return (
    <div
      className="rounded-2xl px-6 py-5 mb-10"
      style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
    >
      <p className="text-sm font-bold mb-1" style={{ color: '#15803d' }}>Did you know?</p>
      <div className="text-sm leading-relaxed" style={{ color: '#166534' }}>{children}</div>
    </div>
  );
}
