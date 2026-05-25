import { useState, useEffect } from 'react';
import { useOrders, OrderItem, Order } from './OrderContext';
import { MENU_ITEMS, CATEGORIES, QUICK_DRINKS } from './menuData';
import {
  User, ShoppingCart, Trash2, Send, ArrowLeft, CheckCircle,
  Square, CheckSquare, Calculator, X, Banknote, Zap,
  PlusCircle, ChevronRight, Plus, Coffee, Clock, ChefHat
} from 'lucide-react';
import { useNavigate } from 'react-router';
import logo from '../../imports/image-1.png';

const KITCHEN_CATS = new Set(['Desayunos', 'Golosinas', 'Platos Fuertes']);

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', preparing: 'Preparando', ready: '✓ Listo', delivered: 'Entregado'
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-600',
};

// ─── Mini Calculator ──────────────────────────────────────────────────────────
function MiniCalc() {
  const [expr, setExpr] = useState('');
  const [disp, setDisp] = useState('0');
  const press = (v: string) => {
    if (v === 'C') { setExpr(''); setDisp('0'); return; }
    if (v === '=') {
      try {
        // eslint-disable-next-line no-new-func
        const r = Function('"use strict";return(' + expr + ')')();
        const s = String(parseFloat(Number(r).toFixed(4)));
        setDisp(s); setExpr(s);
      } catch { setDisp('Error'); setExpr(''); }
      return;
    }
    if (v === '⌫') { const n = expr.slice(0, -1) || ''; setExpr(n); setDisp(n || '0'); return; }
    const n = expr + v; setExpr(n); setDisp(n);
  };
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-64 p-4 select-none">
      <div className="bg-gray-50 rounded-xl px-3 py-3 text-right text-2xl font-bold mb-3 truncate font-mono">{disp}</div>
      <div className="grid grid-cols-4 gap-1.5">
        {['7','8','9','÷','4','5','6','×','1','2','3','-','0','.','=','+','C','⌫'].map(b => (
          <button key={b} onClick={() => press(b === '÷' ? '/' : b === '×' ? '*' : b)}
            className={`h-12 rounded-xl font-bold text-base transition-all active:scale-95 ${
              b === '=' ? 'bg-primary text-primary-foreground shadow-md' :
              b === 'C' ? 'bg-red-500 text-white' :
              ['÷','×','-','+'].includes(b) ? 'bg-gray-800 text-white' :
              'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
            }`}>{b}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Custom "Otro" item modal ─────────────────────────────────────────────────
function OtroModal({ onAdd, onClose }: {
  onAdd: (item: { name: string; price: number; category: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState('Golosinas');
  const submit = () => {
    const p = parseFloat(price);
    if (!name.trim() || !p || p <= 0) return;
    onAdd({ name: name.trim(), price: p, category: cat });
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xs p-6 border border-gray-100">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden"/>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">Producto personalizado</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wide">Nombre</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Elote con chile"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none text-base"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wide">Precio (L.)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none text-base font-bold"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block uppercase tracking-wide">Categoría</label>
            <select value={cat} onChange={e => setCat(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary outline-none text-base bg-white">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={submit} disabled={!name.trim() || !price}
            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 disabled:opacity-40 text-base">
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ order, extraItems, onConfirm, onCancel, onAddDrink }: {
  order: { total: number; items: OrderItem[] };
  extraItems: OrderItem[];
  onConfirm: () => void;
  onCancel: () => void;
  onAddDrink: (drink: { name: string; price: number; category: string }) => void;
}) {
  const [bill, setBill] = useState('');
  const QUICK_BILLS = [50, 100, 200, 500];
  const extrasTotal = extraItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const grandTotal = order.total + extrasTotal;
  const paid = parseFloat(bill) || 0;
  const change = paid - grandTotal;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm border border-gray-100 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Drag handle for mobile */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden"/>
        {/* Header */}
        <div className="bg-primary px-5 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-primary-foreground flex items-center gap-2">
            <Banknote className="w-5 h-5"/>Cobrar Pedido
          </h2>
          <button onClick={onCancel} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-primary-foreground min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="overflow-auto flex-1 p-5 space-y-4">
          {/* Items */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 max-h-36 overflow-auto">
            {order.items.map(i => (
              <div key={i.id} className="flex justify-between text-sm">
                <span className="text-gray-500">{i.quantity}× {i.name}</span>
                <span className="font-semibold">L.{(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            {extraItems.map(i => (
              <div key={i.id} className="flex justify-between text-sm text-blue-700">
                <span>+{i.quantity}× {i.name}</span>
                <span className="font-semibold">L.{(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Quick-add drinks */}
          <div>
            <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1 uppercase tracking-wide">
              <Coffee className="w-3 h-3"/>Agregar al pedido
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_DRINKS.map(d => (
                <button key={d.name} onClick={() => onAddDrink(d)}
                  className="flex items-center gap-1 px-3 py-2 rounded-full bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-800 text-sm font-bold transition-colors border border-blue-200 min-h-[40px]">
                  <Plus className="w-3.5 h-3.5"/>{d.name} L.{d.price}
                </button>
              ))}
            </div>
          </div>

          {/* Grand total */}
          <div className="bg-primary/10 rounded-2xl p-4 flex items-center justify-between">
            <span className="font-bold text-gray-700">Total a cobrar</span>
            <span className="text-3xl font-bold text-primary">L.{grandTotal.toFixed(2)}</span>
          </div>

          {/* Bill input */}
          <div>
            <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wide">Billete recibido</label>
            <input type="number" inputMode="numeric" value={bill} onChange={e => setBill(e.target.value)}
              placeholder="0.00" autoFocus
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary outline-none text-3xl font-bold text-center font-mono"/>
          </div>

          {/* Quick bill buttons */}
          <div className="grid grid-cols-4 gap-2">
            {QUICK_BILLS.map(v => (
              <button key={v} onClick={() => setBill(String(v))}
                className={`h-12 rounded-xl text-sm font-bold transition-all active:scale-95 ${parseFloat(bill) === v ? 'bg-primary text-primary-foreground shadow-md' : 'bg-gray-100 hover:bg-gray-200'}`}>
                L.{v}
              </button>
            ))}
          </div>

          {/* Change */}
          <div className={`rounded-2xl p-4 text-center transition-colors ${change >= 0 && paid > 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'}`}>
            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">Vuelto</p>
            <p className={`text-4xl font-bold font-mono ${change >= 0 && paid > 0 ? 'text-green-600' : 'text-gray-300'}`}>
              {paid > 0 ? (change >= 0 ? `L.${change.toFixed(2)}` : '❌') : '—'}
            </p>
            {paid > 0 && change < 0 && <p className="text-red-500 text-xs mt-1 font-semibold">Billete insuficiente</p>}
          </div>
        </div>

        {/* Actions — fixed at bottom */}
        <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onCancel} className="flex-1 h-14 rounded-2xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 text-base">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={change < 0 || paid === 0}
            className="flex-[2] h-14 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base">
            ✓ Entregar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Extras Modal ─────────────────────────────────────────────────────────────
function ExtrasModal({ items, activeOrders, onChargeNow, onAddToOrder, onKeepInCart, onCancel }: {
  items: OrderItem[]; activeOrders: Order[];
  onChargeNow: () => void; onAddToOrder: (id: string) => void;
  onKeepInCart: () => void; onCancel: () => void;
}) {
  const [step, setStep] = useState<'choose' | 'pick'>('choose');
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 border border-gray-100 max-h-[85vh] overflow-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden"/>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Extras / Directos</h2>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5"/></button>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-1.5 max-h-40 overflow-auto">
          {items.map(i => (
            <div key={i.id} className="flex justify-between text-sm">
              <span className="text-gray-500">{i.quantity}× {i.name}</span>
              <span className="font-bold text-primary">L.{(i.price * i.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
            <span>Total</span><span className="text-primary">L.{total.toFixed(2)}</span>
          </div>
        </div>
        {step === 'choose' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 text-center mb-2">¿Qué hacemos con estos productos?</p>
            <button onClick={onChargeNow} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 min-h-[60px]">
              <Zap className="w-5 h-5 shrink-0"/>
              <div className="text-left flex-1">
                <p>Cobrar de una vez</p>
                <p className="text-xs opacity-70 font-normal">Venta inmediata sin cocina</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0"/>
            </button>
            {activeOrders.length > 0 && (
              <button onClick={() => setStep('pick')} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-800 text-white font-bold hover:opacity-90 min-h-[60px]">
                <PlusCircle className="w-5 h-5 shrink-0"/>
                <div className="text-left flex-1">
                  <p>Agregar a pedido</p>
                  <p className="text-xs opacity-50 font-normal">{activeOrders.length} pedido(s) activos</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0"/>
              </button>
            )}
            <button onClick={onKeepInCart} className="w-full py-3 rounded-2xl bg-gray-100 text-gray-400 font-medium text-sm hover:bg-gray-200 min-h-[44px]">
              Dejar en el carrito
            </button>
          </div>
        ) : (
          <div>
            <button onClick={() => setStep('choose')} className="text-sm text-gray-400 hover:text-gray-700 mb-3 min-h-[44px] flex items-center gap-1">
              <ArrowLeft className="w-4 h-4"/>Volver
            </button>
            <p className="text-sm font-semibold mb-3">Selecciona el pedido:</p>
            <div className="space-y-2 max-h-64 overflow-auto">
              {activeOrders.map(o => (
                <button key={o.id} onClick={() => onAddToOrder(o.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-gray-100 hover:border-primary active:border-primary transition-colors text-left min-h-[64px]">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">Pedido {o.id}</p>
                    <p className="text-xs text-gray-400 truncate">{o.items.map(i => `${i.quantity}×${i.name}`).join(', ')}</p>
                    <p className="text-xs text-gray-400">{o.sentBy}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${STATUS_COLOR[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cart Item ────────────────────────────────────────────────────────────────
function CartItem({ item, onRemove, onQty, isExtra }: {
  item: OrderItem; onRemove: (id: string) => void; onQty: (id: string, q: number) => void; isExtra: boolean;
}) {
  return (
    <div className={`rounded-2xl p-3 border ${isExtra ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold flex-1 text-sm leading-tight pr-2">{item.name}</h4>
        <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center">
          <Trash2 className="w-4 h-4"/>
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => onQty(item.id, item.quantity - 1)} className="w-10 h-10 font-bold hover:bg-gray-50 active:bg-gray-100 text-lg flex items-center justify-center">−</button>
          <span className="font-bold w-8 text-center text-sm">{item.quantity}</span>
          <button onClick={() => onQty(item.id, item.quantity + 1)} className="w-10 h-10 font-bold hover:bg-gray-50 active:bg-gray-100 text-lg flex items-center justify-center">+</button>
        </div>
        <p className="font-bold text-sm text-primary">L.{(item.price * item.quantity).toFixed(2)}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const VALID_USERS = [
  { username: 'Quedadito1', password: 'eliaselmejor' },
  { username: 'Quedadito2', password: 'eliaselmejor' },
];

export default function POSTerminal() {
  const navigate = useNavigate();
  const { addOrder, addItemsToOrder, addTransaction, orders, updateOrderStatus, markItemReady } = useOrders();
  const [selectedCat, setSelectedCat] = useState('Desayunos');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedInUser, setLoggedInUser] = useState('');
  const [view, setView] = useState<'menu' | 'orders'>('menu');
  const [showCalc, setShowCalc] = useState(false);
  const [cartOpen, setCartOpen] = useState(false); // drawer on small screens

  // Modals
  const [showOtro, setShowOtro] = useState(false);
  const [extrasItems, setExtrasItems] = useState<OrderItem[]>([]);
  const [showExtras, setShowExtras] = useState(false);
  const [quickChargeItems, setQuickChargeItems] = useState<OrderItem[]>([]);
  const [showQuickPay, setShowQuickPay] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [paymentExtras, setPaymentExtras] = useState<OrderItem[]>([]);

  // Close calc when clicking elsewhere
  useEffect(() => {
    if (!showCalc) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-calc]')) setShowCalc(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showCalc]);

  const handleLogin = () => {
    const u = VALID_USERS.find(u => u.username === username && u.password === password);
    if (u) { setIsLoggedIn(true); setLoggedInUser(u.username); }
    else { alert('Usuario o contraseña incorrectos'); setPassword(''); }
  };

  const addToCart = (item: { name: string; price: number; category: string }) => {
    setCart(prev => {
      const ex = prev.find(c => c.name === item.name);
      if (ex) return prev.map(c => c.name === item.name ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: crypto.randomUUID(), name: item.name, price: item.price, quantity: 1, category: item.category }];
    });
  };
  const removeFromCart = (id: string) => setCart(p => p.filter(i => i.id !== id));
  const updateQty = (id: string, q: number) => { if (q <= 0) removeFromCart(id); else setCart(p => p.map(i => i.id === id ? { ...i, quantity: q } : i)); };
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const kitchenInCart = cart.filter(i => KITCHEN_CATS.has(i.category));
  const extrasInCart = cart.filter(i => !KITCHEN_CATS.has(i.category));

  const sendToKitchen = () => {
    if (cart.length === 0) return;
    if (kitchenInCart.length > 0) {
      addOrder({
        id: `#${Date.now().toString().slice(-6)}`,
        items: kitchenInCart,
        total: kitchenInCart.reduce((s, i) => s + i.price * i.quantity, 0),
        timestamp: new Date().toISOString(),
        status: 'pending',
        sentBy: loggedInUser,
      });
    }
    if (extrasInCart.length > 0) {
      setExtrasItems(extrasInCart);
      setCart(extrasInCart);
      setShowExtras(true);
    } else {
      setCart([]);
      setCartOpen(false);
    }
  };

  const addDrinkToPayment = (drink: { name: string; price: number; category: string }) => {
    setPaymentExtras(prev => {
      const ex = prev.find(i => i.name === drink.name);
      if (ex) return prev.map(i => i.name === drink.name ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: crypto.randomUUID(), name: drink.name, price: drink.price, quantity: 1, category: drink.category }];
    });
  };

  const confirmOrderPayment = () => {
    if (!payingOrderId) return;
    if (paymentExtras.length > 0) addItemsToOrder(payingOrderId, paymentExtras);
    updateOrderStatus(payingOrderId, 'delivered');
    setPayingOrderId(null);
    setPaymentExtras([]);
  };

  const confirmQuickCharge = () => {
    const t = quickChargeItems.reduce((s, i) => s + i.price * i.quantity, 0);
    addTransaction({ amount: t, type: 'sale', description: `Venta directa: ${quickChargeItems.map(i => `${i.quantity}×${i.name}`).join(', ')}` });
    setQuickChargeItems([]); setShowQuickPay(false); setCart([]); setExtrasItems([]); setCartOpen(false);
  };

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const payingOrder = payingOrderId ? orders.find(o => o.id === payingOrderId) : null;
  const filteredItems = MENU_ITEMS.filter(i => i.category === selectedCat);

  // ── Login ────────────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-white p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 w-full max-w-sm">
          <button onClick={() => navigate('/')} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm min-h-[44px]">
            <ArrowLeft className="w-4 h-4"/>Regresar
          </button>
          <div className="text-center mb-8">
            <div className="bg-gray-50 rounded-2xl p-5 inline-block mb-5 shadow-inner">
              <img src={logo} alt="Don de Chuy" className="w-32 h-auto"/>
            </div>
            <h1 className="text-2xl font-bold mb-1">Don de Chuy Business</h1>
            <p className="text-gray-400 text-sm">Terminal · Ventana</p>
          </div>
          <div className="space-y-4">
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Usuario"
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary outline-none text-base"/>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleLogin()} placeholder="Contraseña"
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-primary outline-none text-base"/>
            <button onClick={handleLogin} className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 text-base shadow-md min-h-[56px]">
              Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Cart panel content (shared between sidebar and drawer) ───────────────────
  const CartPanel = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary"/>
          <h2 className="font-bold">Pedido</h2>
          {cart.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-xl">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {loggedInUser.slice(-1)}
            </div>
            <span className="text-xs font-bold text-gray-600">{loggedInUser}</span>
          </div>
          {/* Close button — only visible in drawer mode */}
          <button onClick={() => setCartOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5 text-gray-400"/>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2.5">
        {cart.length === 0 ? (
          <div className="text-center text-gray-300 py-12">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3"/>
            <p className="text-sm">Sin artículos</p>
          </div>
        ) : (
          <>
            {kitchenInCart.length > 0 && (
              <p className="text-xs font-bold text-gray-400 px-1 flex items-center gap-1.5 uppercase tracking-wide">
                <ChefHat className="w-3.5 h-3.5"/>Cocina
              </p>
            )}
            {kitchenInCart.map(i => <CartItem key={i.id} item={i} onRemove={removeFromCart} onQty={updateQty} isExtra={false}/>)}
            {extrasInCart.length > 0 && (
              <p className="text-xs font-bold text-gray-400 px-1 flex items-center gap-1.5 mt-3 uppercase tracking-wide">
                <Zap className="w-3.5 h-3.5"/>Directo
              </p>
            )}
            {extrasInCart.map(i => <CartItem key={i.id} item={i} onRemove={removeFromCart} onQty={updateQty} isExtra={true}/>)}
          </>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 space-y-3 bg-white">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-500 text-sm">Total del pedido</span>
          <span className="text-2xl font-bold text-primary">L.{cartTotal.toFixed(2)}</span>
        </div>
        {extrasInCart.length > 0 && kitchenInCart.length === 0 ? (
          <button onClick={() => { setQuickChargeItems(extrasInCart); setShowQuickPay(true); }}
            className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl hover:opacity-90 flex items-center justify-center gap-2 shadow-md min-h-[56px] text-base">
            <Zap className="w-5 h-5"/>Cobrar de Una Vez
          </button>
        ) : (
          <button onClick={sendToKitchen} disabled={cart.length === 0}
            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md min-h-[56px] text-base transition-opacity">
            <Send className="w-5 h-5"/>
            {kitchenInCart.length > 0 && extrasInCart.length > 0 ? 'Enviar + Extras' : 'Enviar a Cocina'}
          </button>
        )}
      </div>
    </div>
  );

  // ── Main layout ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div className="bg-gray-50 rounded-xl px-2 py-1 hidden sm:block">
            <img src={logo} alt="Don de Chuy" className="h-9 w-auto"/>
          </div>
          <div className="hidden sm:block">
            <p className="font-bold text-sm leading-tight">Ventana</p>
            <p className="text-xs text-gray-400 leading-none">Don de Chuy</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Calculator */}
          <div className="relative" data-calc>
            <button onClick={() => setShowCalc(!showCalc)}
              className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition-all ${showCalc ? 'bg-primary text-primary-foreground shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
              <Calculator className="w-5 h-5"/>
            </button>
            {showCalc && (
              <div className="absolute right-0 top-13 z-50 mt-1" data-calc>
                <MiniCalc/>
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
            <button onClick={() => setView('menu')}
              className={`px-3 h-9 rounded-lg text-sm font-bold transition-all ${view === 'menu' ? 'bg-white shadow text-foreground' : 'text-gray-400 hover:text-gray-600'}`}>
              Menú
            </button>
            <button onClick={() => setView('orders')}
              className={`px-3 h-9 rounded-lg text-sm font-bold transition-all relative ${view === 'orders' ? 'bg-white shadow text-foreground' : 'text-gray-400 hover:text-gray-600'}`}>
              Pedidos
              {activeOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {activeOrders.length}
                </span>
              )}
            </button>
          </div>

          {/* Cart button — visible only below lg */}
          <button onClick={() => setCartOpen(true)}
            className="lg:hidden relative p-2.5 rounded-xl bg-primary text-primary-foreground min-w-[44px] min-h-[44px] flex items-center justify-center shadow-md">
            <ShoppingCart className="w-5 h-5"/>
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>

          {/* User avatar */}
          <div className="hidden sm:flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {loggedInUser.slice(-1)}
            </div>
            <span className="font-bold text-sm text-gray-700">{loggedInUser}</span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Content area ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {view === 'menu' ? (
            <>
              {/* Category tabs — touch-friendly horizontal scroll */}
              <div className="px-3 pt-3 pb-0 shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-2.5" style={{ scrollbarWidth: 'none' }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setSelectedCat(cat)}
                      className={`shrink-0 px-4 h-11 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                        selectedCat === cat
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-white border border-gray-200 hover:border-primary text-gray-600 active:bg-gray-50'
                      }`}>
                      {cat}{!KITCHEN_CATS.has(cat) && <span className="ml-1 opacity-50 text-xs">⚡</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu grid */}
              <div className="flex-1 overflow-auto p-3">
                {/* 2 cols on phone, 3 on sm (640px), 4 on md (768px = iPad portrait), 5 on xl */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                  {filteredItems.map((item, i) => (
                    <button key={i} onClick={() => addToCart(item)}
                      className="bg-white border-2 border-gray-100 rounded-2xl p-3 sm:p-4 hover:border-primary hover:shadow-lg active:scale-95 transition-all text-left group min-h-[80px]">
                      <p className="font-bold text-xs sm:text-sm mb-1.5 leading-tight group-hover:text-primary transition-colors line-clamp-2">{item.name}</p>
                      <p className="text-lg sm:text-xl font-bold text-primary">L.{item.price}</p>
                    </button>
                  ))}
                  {/* Otro card */}
                  <button onClick={() => setShowOtro(true)}
                    className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-3 sm:p-4 hover:border-primary hover:bg-primary/5 active:scale-95 transition-all text-left group min-h-[80px]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Plus className="w-4 h-4 text-gray-400 group-hover:text-primary"/>
                      <p className="font-bold text-sm text-gray-400 group-hover:text-primary">Otro</p>
                    </div>
                    <p className="text-xs text-gray-300">Personalizado</p>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ── Pedidos view ──────────────────────────────────────────────── */
            <div className="flex-1 overflow-auto p-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Pedidos Activos</h2>
              {activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <CheckCircle className="w-16 h-16 mb-3"/>
                  <p className="text-lg font-medium">Sin pedidos activos</p>
                </div>
              ) : (
                /* 1 col phone, 2 cols on md (iPad portrait), 3 on lg */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className={`px-4 py-3 flex items-center justify-between ${
                        order.status === 'ready' ? 'bg-green-500' :
                        order.status === 'preparing' ? 'bg-blue-500' : 'bg-amber-400'
                      }`}>
                        <div>
                          <p className="font-bold text-white text-base leading-tight">Pedido {order.id}</p>
                          <div className="flex items-center gap-2 text-white/80 text-xs mt-0.5">
                            <User className="w-3 h-3"/>{order.sentBy}
                            <Clock className="w-3 h-3 ml-1"/>
                            {new Date(order.timestamp).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {order.status === 'ready' && <CheckCircle className="w-6 h-6 text-white"/>}
                        {order.status === 'preparing' && <ChefHat className="w-5 h-5 text-white/80"/>}
                      </div>
                      <div className="p-3 space-y-1.5">
                        {order.items.map(item => {
                          const done = order.deliveredItems.includes(item.id);
                          return (
                            <button key={item.id} onClick={() => markItemReady(order.id, item.id)}
                              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all text-left min-h-[44px] ${done ? 'bg-green-50 border border-green-200 opacity-60' : 'bg-gray-50 border border-gray-100 hover:border-primary active:border-primary'}`}>
                              {done ? <CheckSquare className="w-4 h-4 text-green-600 shrink-0"/> : <Square className="w-4 h-4 text-gray-300 shrink-0"/>}
                              <span className={`flex-1 text-sm font-medium ${done ? 'line-through text-gray-400' : ''}`}>{item.quantity}× {item.name}</span>
                              <span className="text-xs font-bold text-primary">L.{(item.price * item.quantity).toFixed(2)}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="border-t border-gray-100 p-3">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-sm font-semibold text-gray-400">Total:</span>
                          <span className="font-bold text-primary text-lg">L.{order.total.toFixed(2)}</span>
                        </div>
                        <button onClick={() => { setPayingOrderId(order.id); setPaymentExtras([]); }}
                          className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 flex items-center justify-center gap-2 text-sm shadow-sm min-h-[48px]">
                          <Banknote className="w-4 h-4"/>
                          {order.status === 'ready' ? 'Cobrar y Entregar' : 'Cobrar (en cocina)'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Cart: always-visible sidebar on lg+, hidden below ─────────────── */}
        <div className="hidden lg:flex w-80 bg-white border-l border-gray-100 shadow-lg flex-col">
          {CartPanel}
        </div>
      </div>

      {/* ── Cart Drawer — slides in from right on < lg ─────────────────────── */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setCartOpen(false)}/>
          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col lg:hidden">
            {CartPanel}
          </div>
        </>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showOtro && <OtroModal onAdd={addToCart} onClose={() => setShowOtro(false)}/>}

      {showExtras && (
        <ExtrasModal
          items={extrasItems}
          activeOrders={orders.filter(o => o.status !== 'delivered')}
          onChargeNow={() => { setShowExtras(false); setQuickChargeItems(extrasItems); setShowQuickPay(true); }}
          onAddToOrder={id => { addItemsToOrder(id, extrasItems); setExtrasItems([]); setCart([]); setShowExtras(false); setCartOpen(false); }}
          onKeepInCart={() => { setShowExtras(false); setExtrasItems([]); }}
          onCancel={() => { setShowExtras(false); setExtrasItems([]); }}
        />
      )}

      {showQuickPay && (
        <PaymentModal
          order={{ total: quickChargeItems.reduce((s, i) => s + i.price * i.quantity, 0), items: quickChargeItems }}
          extraItems={[]}
          onConfirm={confirmQuickCharge}
          onCancel={() => { setShowQuickPay(false); setQuickChargeItems([]); }}
          onAddDrink={() => {}}
        />
      )}

      {payingOrder && (
        <PaymentModal
          order={payingOrder}
          extraItems={paymentExtras}
          onConfirm={confirmOrderPayment}
          onCancel={() => { setPayingOrderId(null); setPaymentExtras([]); }}
          onAddDrink={addDrinkToPayment}
        />
      )}
    </div>
  );
}
