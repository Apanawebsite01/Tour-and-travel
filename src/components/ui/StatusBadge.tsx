const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Contacted: 'bg-sky-50 text-sky-800 border-sky-200',
  Confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Vehicle Assigned': 'bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]',
  'In Progress': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  Completed: 'bg-slate-100 text-slate-800 border-slate-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  Available: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Unavailable: 'bg-slate-100 text-slate-700 border-slate-200',
  'Under Maintenance': 'bg-amber-50 text-amber-800 border-amber-200',
  Unpaid: 'bg-red-50 text-red-700 border-red-200',
  'Partially Paid': 'bg-amber-50 text-amber-800 border-amber-200',
  Paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Refunded: 'bg-slate-100 text-slate-700 border-slate-200',
  Published: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  Archived: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}
