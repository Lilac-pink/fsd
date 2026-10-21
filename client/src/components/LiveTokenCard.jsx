export default function LiveTokenCard({ status, onCancel, cancelling }) {
  const { nowServing, userToken, peopleAhead, estimatedWaitMinutes, status: s } = status;
  const isTurn = s === 'IN_PROGRESS';
  const isNext = s === 'WAITING' && peopleAhead === 0;

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-xl border-2 border-ink bg-white">
      <div className={`px-6 py-8 text-center ${isTurn ? 'bg-signal' : 'bg-ink text-white'}`}>
        <p className="text-sm opacity-80">Your token</p>
        <p className="num text-7xl font-bold">#{userToken}</p>
      </div>

      {isTurn && <p className="bg-green-100 px-4 py-3 text-center font-semibold text-green-800">It's your turn. Please go to the counter.</p>}
      {isNext && <p className="bg-amber-100 px-4 py-3 text-center font-semibold text-amber-800">You're next. Head to the counter now.</p>}

      <dl className="grid grid-cols-3 divide-x divide-ink/10 text-center">
        <div className="p-4"><dt className="text-xs text-ink/60">Now serving</dt><dd className="num text-2xl font-bold">{nowServing ? `#${nowServing}` : '-'}</dd></div>
        <div className="p-4"><dt className="text-xs text-ink/60">People ahead</dt><dd className="num text-2xl font-bold">{peopleAhead}</dd></div>
        <div className="p-4"><dt className="text-xs text-ink/60">Est. wait</dt><dd className="num text-2xl font-bold">{isTurn ? '0' : estimatedWaitMinutes} min</dd></div>
      </dl>

      {s === 'WAITING' && (
        <div className="border-t border-ink/10 p-4 text-center">
          <button onClick={onCancel} disabled={cancelling} className="text-sm font-medium text-red-600 underline disabled:opacity-50">
            Leave queue
          </button>
        </div>
      )}
    </div>
  );
}
