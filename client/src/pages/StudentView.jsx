import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getServices, takeToken, getStatus, cancelToken, errMsg } from '../api';
import { socket } from '../socket';
import { useAuth } from '../AuthContext';
import ServiceCard from '../components/ServiceCard';
import LiveTokenCard from '../components/LiveTokenCard';

export default function StudentView() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null); // null = no active token
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getServices().then((r) => setServices(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  // 404 from /status just means "no active token", not an error
  const fetchStatus = useCallback(async () => {
    if (!selected) return;
    try {
      const { data } = await getStatus(selected.id);
      setStatus(data);
    } catch (err) {
      if (err.response?.status === 404) setStatus(null);
      else setError(errMsg(err));
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onTurn = (d) => setToast(d.message || "It's your turn!");

    socket.connect();
    socket.emit('join_room', { serviceId: selected.id, userId: user.id });
    fetchStatus();

    socket.on('connect', () => socket.emit('join_room', { serviceId: selected.id, userId: user.id }));
    socket.on('queue_updated', fetchStatus);
    socket.on('your_turn', onTurn);

    return () => {
      socket.off('connect');
      socket.off('queue_updated', fetchStatus);
      socket.off('your_turn', onTurn);
    };
  }, [selected, fetchStatus, user.id]);

  const handleTake = async () => {
    setBusy(true); setError(''); setToast('');
    try {
      await takeToken(selected.id);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      await fetchStatus();
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true); setError('');
    try {
      await cancelToken(status.tokenId); // tokenId, NOT userToken
    } catch (err) {
      setError(errMsg(err));
    } finally {
      await fetchStatus();
      setBusy(false);
    }
  };

  const back = () => { setSelected(null); setStatus(null); setToast(''); setError(''); };

  if (!selected) {
    return (
      <section>
        <h2 className="mb-4 text-xl font-bold">Which service do you need?</h2>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((s) => <ServiceCard key={s.id} service={s} onSelect={setSelected} />)}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <button onClick={back} className="flex items-center gap-1 text-sm text-ink/70 hover:underline"><ArrowLeft size={16} /> All services</button>
      <h2 className="text-center text-2xl font-bold">{selected.name}</h2>

      {toast && <div className="mx-auto max-w-md rounded-lg bg-green-600 p-3 text-center font-semibold text-white">{toast}</div>}
      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      {status ? (
        <LiveTokenCard status={status} onCancel={handleCancel} cancelling={busy} />
      ) : (
        <div className="mx-auto max-w-md rounded-xl border-2 border-ink/10 bg-white p-8 text-center">
          <p className="mb-4 text-ink/70">You're not in this queue yet.</p>
          <button onClick={handleTake} disabled={busy} className="rounded-md bg-signal px-6 py-3 font-bold text-ink hover:brightness-95 disabled:opacity-60">
            {busy ? 'Getting token...' : 'Get a token'}
          </button>
        </div>
      )}
    </section>
  );
}
