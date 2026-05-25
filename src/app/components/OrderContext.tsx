import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

let supabase: ReturnType<typeof createClient>;
try {
  supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
} catch (e) {
  console.warn('Supabase init failed, offline mode', e);
  supabase = null as any;
}
const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-96525332`;
const LS_KEY = 'don-de-chuy-v2';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  timestamp: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  deliveredItems: string[]; // item IDs that have been marked as ready in kitchen
  sentBy: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'sale' | 'expense' | 'other-income' | 'card-close';
  description: string;
  timestamp: string;
}

interface POSState {
  orders: Order[];
  transactions: Transaction[];
}

interface OrderContextType {
  orders: Order[];
  transactions: Transaction[];
  connected: boolean;
  addOrder: (order: Omit<Order, 'deliveredItems'>) => void;
  addItemsToOrder: (orderId: string, items: OrderItem[]) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  markItemReady: (orderId: string, itemId: string) => void;
  deleteOrder: (orderId: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  deleteTransaction: (transactionId: string) => void;
  getTotalSales: () => number;
  getTotalExpenses: () => number;
  getOtherIncome: () => number;
  getNetProfit: () => number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

function useDebounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), ms);
  }, [fn]) as T;
}

function loadFromStorage(): POSState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { orders: [], transactions: [] };
}

function saveToStorage(state: POSState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const initial = loadFromStorage();
  const [orders, setOrders] = useState<Order[]>(initial.orders);
  const [transactions, setTransactions] = useState<Transaction[]>(initial.transactions);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Try to hydrate from server on first load (merge with localStorage)
  useEffect(() => {
    fetch(`${SERVER_URL}/state`)
      .then(r => r.json())
      .then((data: POSState) => {
        if (data?.orders?.length || data?.transactions?.length) {
          setOrders(data.orders || []);
          setTransactions(data.transactions || []);
          saveToStorage({ orders: data.orders || [], transactions: data.transactions || [] });
        }
      })
      .catch(() => {});
  }, []);

  const syncState = useCallback((nextOrders: Order[], nextTransactions: Transaction[]) => {
    const payload: POSState = { orders: nextOrders, transactions: nextTransactions };
    saveToStorage(payload);
    fetch(`${SERVER_URL}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
    if (channelRef.current && supabase) {
      try { channelRef.current.send({ type: 'broadcast', event: 'state', payload }); } catch {}
    }
  }, []);

  const debouncedSync = useDebounce(syncState, 400);

  useEffect(() => {
    if (!supabase) return;
    try {
      const channel = supabase.channel('don-de-chuy-pos', {
        config: { broadcast: { self: false } },
      });
      channel
        .on('broadcast', { event: 'state' }, ({ payload }: { payload: POSState }) => {
          setOrders(payload.orders || []);
          setTransactions(payload.transactions || []);
          saveToStorage(payload);
        })
        .subscribe(status => setConnected(status === 'SUBSCRIBED'));
      channelRef.current = channel;
      return () => { supabase.removeChannel(channel); };
    } catch (e) {
      console.warn('Supabase channel failed', e);
    }
  }, []);

  const update = useCallback((nextOrders: Order[], nextTransactions: Transaction[]) => {
    setOrders(nextOrders);
    setTransactions(nextTransactions);
    debouncedSync(nextOrders, nextTransactions);
  }, [debouncedSync]);

  const addOrder = (order: Omit<Order, 'deliveredItems'>) => {
    const fullOrder: Order = { ...order, deliveredItems: [] };
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      amount: order.total,
      type: 'sale',
      description: `Pedido ${order.id}`,
      timestamp: new Date().toISOString(),
    };
    update([...orders, fullOrder], [...transactions, newTx]);
  };

  const addItemsToOrder = (orderId: string, newItems: OrderItem[]) => {
    const nextOrders = orders.map(o => {
      if (o.id !== orderId) return o;
      const merged = [...o.items];
      newItems.forEach(ni => {
        const existing = merged.find(i => i.name === ni.name);
        if (existing) existing.quantity += ni.quantity;
        else merged.push({ ...ni, id: crypto.randomUUID() });
      });
      const newTotal = merged.reduce((s, i) => s + i.price * i.quantity, 0);
      return { ...o, items: merged, total: newTotal };
    });
    // Update the sale transaction total for this order too
    const order = orders.find(o => o.id === orderId);
    const extraTotal = newItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const nextTx = transactions.map(t =>
      t.description === `Pedido ${orderId}` ? { ...t, amount: t.amount + extraTotal } : t
    );
    update(nextOrders, nextTx);
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    update(orders.map(o => o.id === orderId ? { ...o, status } : o), transactions);
  };

  // Mark/unmark an individual item as ready in kitchen.
  // Order status becomes 'ready' when ALL items are checked — but NEVER auto-delivered.
  // Orders only leave the kitchen when explicitly marked 'delivered' from Ventana.
  const markItemReady = (orderId: string, itemId: string) => {
    const nextOrders = orders.map(order => {
      if (order.id !== orderId) return order;
      const deliveredItems = order.deliveredItems.includes(itemId)
        ? order.deliveredItems.filter(id => id !== itemId)
        : [...order.deliveredItems, itemId];
      const allReady = order.items.every(item => deliveredItems.includes(item.id));
      // Only promote to 'ready'; never auto-set to 'delivered'
      const status = allReady ? 'ready' : (order.status === 'ready' ? 'preparing' : order.status);
      return { ...order, deliveredItems, status };
    });
    update(nextOrders, transactions);
  };

  const deleteOrder = (orderId: string) => {
    update(
      orders.filter(o => o.id !== orderId),
      transactions.filter(t => t.description !== `Pedido ${orderId}`)
    );
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTx: Transaction = { ...tx, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
    update(orders, [...transactions, newTx]);
  };

  const deleteTransaction = (txId: string) => {
    update(orders, transactions.filter(t => t.id !== txId));
  };

  const getTotalSales = () => transactions.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
  const getTotalExpenses = () => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const getOtherIncome = () => transactions.filter(t => t.type === 'other-income' || t.type === 'card-close').reduce((s, t) => s + t.amount, 0);
  const getNetProfit = () => getTotalSales() + getOtherIncome() - getTotalExpenses();

  return (
    <OrderContext.Provider value={{
      orders, transactions, connected,
      addOrder, addItemsToOrder, updateOrderStatus, markItemReady, deleteOrder,
      addTransaction, deleteTransaction,
      getTotalSales, getTotalExpenses, getOtherIncome, getNetProfit,
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrders must be used within OrderProvider');
  return context;
}
