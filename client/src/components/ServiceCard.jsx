import { ChevronRight } from 'lucide-react';

export default function ServiceCard({ service, onSelect }) {
  return (
    <button
      onClick={() => onSelect(service)}
      className="flex items-center justify-between rounded-lg border-2 border-ink/10 bg-white p-5 text-left transition hover:border-signal focus-visible:outline-2 focus-visible:outline-signal"
    >
      <div>
        <h3 className="text-lg font-semibold">{service.name}</h3>
        {service.location && <p className="text-sm text-ink/60">{service.location}</p>}
      </div>
      <ChevronRight className="text-ink/40" />
    </button>
  );
}
