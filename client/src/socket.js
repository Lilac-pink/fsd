import { io } from 'socket.io-client';
import { BASE_URL } from './config';

// connect only after login (see AuthContext / pages)
export const socket = io(BASE_URL, { autoConnect: false });
