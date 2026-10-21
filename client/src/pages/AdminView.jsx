import { useEffect, useState, useCallback } from 'react';
import { getServices, getQueue, callNext, skipToken, completeToken, errMsg } from '../api';
import { socket } from '../socket';
import { useAuth } from '../AuthContext';

export default function AdminView() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState(null);
  const [queue, setQueue] = useState([]); // direct array from backend
  const [error, setError] = useState('');

  useEffect(() => {
    getServices().then((r) => {
      setServices(r.data);
      if (r.data.length) setServiceId(r.data[0].id);
    }).catch((e) => setError(errMsg(e)));
  }, []);

  const fetchQueue = useCallback(async () => {
    if (!serviceId) return;
    try {
      const { data } = await getQueue(serviceId);
      setQueue(data);
    } catch (err) {
      setError(errMsg(err));
    }
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId) return;
    socket.connect();
    socket.emit('join_room', { serviceId, userId: user.id });
    socket.on('connect', () => socket.emit('join_room', { serviceId, userId: user.id }));
    socket.on('queue_updated', fetchQueue);
    fetchQueue();
    return () => { socket.off('connect'); socket.off('queue_updated', fetchQueue); };
  }, [serviceId, fetchQueue, user.id]);

  const act = async (fn, arg) => {
    setError('');
    try { await fn(arg); } catch (err) { setError(errMsg(err)); }
    fetchQueue();
  };

  // derive dashboard numbers from the array
  const serving = queue.filter((t) => t.status === 'IN_PROGRESS').sort((a, b) => b.token_number - a.token_number)[0];
  const waiting = queue.filter((t) => t.status === 'WAITING');

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <label htmlFor="svc" className="font-semibold">Counter</label>
        <select id="svc" value={serviceId || ''} onChange={(e) => setServiceId(Number(e.target.value))}
          className="rounded-md border-2 border-ink/15 bg-white px-3 py-2">
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border-2 border-ink bg-ink p-8 text-center text-white">
        <p className="text-sm opacity-70">Now serving</p>
        <p className="num text-8xl font-bold text-signal">{serving ? `#${serving.token_number}` : '-'}</p>
        {serving && <p className="mt-1 text-sm opacity-80">{serving.name}</p>}
        <p className="mt-3 text-sm">{waiting.length} waiting</p>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button onClick={() => act(callNext, serviceId)} className="rounded-md bg-signal px-8 py-3 text-lg font-bold text-ink hover:brightness-95">
            Call next
          </button>
          {serving && (
            <>
              <button onClick={() => act(completeToken, serving.id)} className="rounded-md bg-green-600 px-5 py-3 font-semibold hover:bg-green-700">Mark done</button>
              <button onClick={() => act(skipToken, serving.id)} className="rounded-md bg-white/15 px-5 py-3 font-semibold hover:bg-white/25">No show</button>
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-bold">Waiting</h3>
        {waiting.length === 0 ? (
          <p className="text-ink/60">Nobody is waiting.</p>
        ) : (
          <ul className="space-y-2">
            {waiting.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border-2 border-ink/10 bg-white p-3">
                <span><span className="num font-bold">#{t.token_number}</span> <span className="ml-2">{t.name}</span> <span className="ml-1 text-sm text-ink/50">{t.email}</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
