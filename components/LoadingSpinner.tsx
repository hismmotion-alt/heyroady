export default function LoadingSpinner({ message = 'Roady is planning your trip...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-[#D85A30]/20 border-t-[#D85A30] animate-spin" />
      <p className="text-[#993C1D] font-semibold text-sm animate-pulse">{message}</p>
    </div>
  );
}
