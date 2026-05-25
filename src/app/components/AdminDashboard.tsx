import { useState, useMemo } from 'react';
import { useOrders, Transaction } from './OrderContext';
import {
  TrendingUp, DollarSign, ShoppingCart, Receipt, CreditCard,
  Menu, ArrowLeft, Trash2, Package, BarChart2, Filter, Wifi, WifiOff
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import logo from '../../imports/image-1.png';

const CHART_COLORS = ['#F2B705', '#1A1A1A', '#4ade80', '#60a5fa', '#f97316', '#a78bfa'];

type TxFilter = 'all' | 'sale' | 'expense' | 'other-income' | 'card-close';

const TYPE_LABELS: Record<string, string> = {
  sale: 'Venta',
  expense: 'Gasto',
  'other-income': 'Otra Ganancia',
  'card-close': 'Cierre de Tarjeta',
};

const TYPE_COLORS: Record<string, string> = {
  sale: 'bg-primary/15 text-yellow-800',
  expense: 'bg-red-100 text-red-700',
  'other-income': 'bg-green-100 text-green-700',
  'card-close': 'bg-blue-100 text-blue-700',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const {
    getTotalSales, getTotalExpenses, getOtherIncome, getNetProfit,
    addTransaction, transactions, deleteTransaction, orders, deleteOrder, connected
  } = useOrders();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [otherIncome, setOtherIncome] = useState('');
  const [otherIncomeDesc, setOtherIncomeDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [cardTotal, setCardTotal] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders'>('dashboard');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');

  const handleAddOtherIncome = () => {
    const amount = parseFloat(otherIncome);
    if (amount > 0) {
      addTransaction({ amount, type: 'other-income', description: otherIncomeDesc.trim() || 'Otras Ganancias' });
      setOtherIncome('');
      setOtherIncomeDesc('');
    }
  };

  const handleAddExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (amount > 0 && expenseDescription.trim()) {
      addTransaction({ amount, type: 'expense', description: expenseDescription });
      setExpenseAmount('');
      setExpenseDescription('');
    }
  };

  const handleSaveCardTotal = () => {
    const amount = parseFloat(cardTotal);
    if (amount > 0) {
      addTransaction({ amount, type: 'card-close', description: 'Cierre de Tarjeta' });
      setCardTotal('');
    }
  };

  const handlePinSubmit = () => {
    if (pin === '20052013') {
      setIsAuthenticated(true);
    } else {
      alert('PIN incorrecto');
      setPin('');
    }
  };

  // Chart data
  const salesByHour = useMemo(() => {
    const map: Record<number, number> = {};
    transactions.filter(t => t.type === 'sale').forEach(t => {
      const h = new Date(t.timestamp).getHours();
      map[h] = (map[h] || 0) + t.amount;
    });
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      ventas: map[i] || 0,
    })).filter(d => d.ventas > 0 || (Object.keys(map).length === 0));
  }, [transactions]);

  const pieData = useMemo(() => {
    const sales = getTotalSales();
    const income = getOtherIncome();
    const expenses = getTotalExpenses();
    return [
      { name: 'Ventas', value: sales },
      { name: 'Otras Ganancias', value: income },
      { name: 'Gastos', value: expenses },
    ].filter(d => d.value > 0);
  }, [transactions]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => o.items.forEach(item => {
      map[item.category] = (map[item.category] || 0) + item.price * item.quantity;
    }));
    return Object.entries(map).map(([name, ventas]) => ({ name, ventas }));
  }, [orders]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => txFilter === 'all' || t.type === txFilter)
      .slice()
      .reverse();
  }, [transactions, txFilter]);

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
        <div className="bg-card border border-border rounded-xl p-8 shadow-2xl w-full max-w-md">
          <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Regresar
          </button>
          <div className="text-center mb-6">
            <div className="bg-white rounded-xl p-4 inline-block mb-4 shadow-sm">
              <img src={logo} alt="Don de Chuy" className="w-28 h-auto" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Acceso de Administración</h1>
            <p className="text-muted-foreground">Ingrese el PIN para continuar</p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handlePinSubmit()}
              placeholder="PIN de Administración"
              maxLength={8}
              className="w-full px-4 py-3 rounded-lg bg-input-background border border-border focus:ring-2 focus:ring-primary outline-none text-center text-2xl tracking-widest"
            />
            <button onClick={handlePinSubmit} className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity">
              Acceder
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-sidebar border-r border-sidebar-border overflow-hidden shrink-0`}>
        <div className="p-5">
          <div className="bg-white rounded-xl p-3 mb-5 shadow-sm">
            <img src={logo} alt="Don de Chuy" className="w-full h-auto" />
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
            >
              <BarChart2 className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
            >
              <Package className="w-5 h-5" />
              <span>Gestión de Pedidos</span>
            </button>
            <a href="/#/pos" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
              <ShoppingCart className="w-5 h-5" />
              <span>Ventana</span>
            </a>
            <a href="/#/kitchen" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
              <Receipt className="w-5 h-5" />
              <span>Cocina (KDS)</span>
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Header — light with logo contrast */}
        <header className="bg-white border-b-4 border-primary px-5 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <img src={logo} alt="Don de Chuy" className="h-10 w-auto" />
          <h2 className="text-lg font-bold text-foreground">Panel de Administración</h2>
          <div className="ml-auto flex items-center gap-1.5">
            {connected
              ? <><Wifi className="w-4 h-4 text-green-500" /><span className="text-xs text-green-700 font-medium">En línea</span></>
              : <><WifiOff className="w-4 h-4 text-yellow-500" /><span className="text-xs text-muted-foreground">Conectando...</span></>
            }
          </div>
        </header>

        <div className="p-6 space-y-6">
          {activeTab === 'dashboard' ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-primary text-primary-foreground rounded-xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">Ventas Totales</h3>
                    <DollarSign className="w-7 h-7 opacity-80" />
                  </div>
                  <p className="text-3xl font-bold">L.{getTotalSales().toFixed(2)}</p>
                  <p className="text-xs opacity-70 mt-1">En Tiempo Real</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">Otras Ganancias</h3>
                    <TrendingUp className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold">L.{getOtherIncome().toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Tarjetas + Extras</p>
                </div>
                <div className="bg-destructive text-destructive-foreground rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">Gastos Totales</h3>
                    <Receipt className="w-7 h-7 opacity-80" />
                  </div>
                  <p className="text-3xl font-bold">L.{getTotalExpenses().toFixed(2)}</p>
                </div>
                <div className="bg-secondary text-secondary-foreground rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">Ganancia Neta</h3>
                    <TrendingUp className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">L.{getNetProfit().toFixed(2)}</p>
                  <p className="text-xs opacity-60 mt-1">Diaria</p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ventas por hora */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-primary" />
                    Ventas por Hora
                  </h3>
                  {salesByHour.length === 0 || getTotalSales() === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      Sin ventas registradas aún
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={salesByHour} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`L.${v.toFixed(2)}`, 'Ventas']} />
                        <Bar dataKey="ventas" fill="#F2B705" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Distribución de ingresos */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold mb-4">Distribución</h3>
                  {pieData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      Sin datos
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%" cy="50%"
                            innerRadius={45} outerRadius={72}
                            paddingAngle={3}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {pieData.map((entry, i) => (
                              <Cell key={`pie-cell-${entry.name}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => `L.${v.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Custom legend — avoids recharts duplicate-key bug */}
                      <div className="flex flex-col gap-1 mt-2">
                        {pieData.map((entry, i) => (
                          <div key={entry.name} className="flex items-center gap-2 text-xs">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-muted-foreground">{entry.name}</span>
                            <span className="ml-auto font-bold">L.{entry.value.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Ventas por categoría */}
              {categoryData.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold mb-4">Ventas por Categoría</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip formatter={(v: number) => [`L.${v.toFixed(2)}`, 'Ventas']} />
                      <Bar dataKey="ventas" fill="#1A1A1A" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Input Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Other Income */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Otras Ganancias
                  </h3>
                  <div className="space-y-2">
                    <input type="text" value={otherIncomeDesc} onChange={e => setOtherIncomeDesc(e.target.value)}
                      placeholder="Descripción"
                      className="w-full px-3 py-2 rounded-lg bg-input-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm" />
                    <div className="flex gap-2">
                      <input type="number" value={otherIncome} onChange={e => setOtherIncome(e.target.value)}
                        placeholder="Monto (L.)"
                        className="flex-1 px-3 py-2 rounded-lg bg-input-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm" />
                      <button onClick={handleAddOtherIncome} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity text-sm">
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Close */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    Cierre de Tarjeta
                  </h3>
                  <div className="flex gap-2 mt-5">
                    <input type="number" value={cardTotal} onChange={e => setCardTotal(e.target.value)}
                      placeholder="Monto (L.)"
                      className="flex-1 px-3 py-2 rounded-lg bg-input-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm" />
                    <button onClick={handleSaveCardTotal} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity text-sm">
                      Guardar
                    </button>
                  </div>
                </div>

                {/* Expense */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-red-500" />
                    Gastos / Proveedores
                  </h3>
                  <div className="space-y-2">
                    <input type="text" value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)}
                      placeholder="Descripción del gasto"
                      className="w-full px-3 py-2 rounded-lg bg-input-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm" />
                    <div className="flex gap-2">
                      <input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                        placeholder="Monto (L.)"
                        className="flex-1 px-3 py-2 rounded-lg bg-input-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm" />
                      <button onClick={handleAddExpense} className="px-4 py-2 bg-destructive text-destructive-foreground font-bold rounded-lg hover:opacity-90 transition-opacity text-sm">
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ─── GESTIÓN DE PEDIDOS TAB ─── */
            <div className="space-y-6">
              {/* Active Orders */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Pedidos Activos
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-bold">Pedido</th>
                        <th className="text-left p-3 font-bold">Hora</th>
                        <th className="text-left p-3 font-bold">Estado</th>
                        <th className="text-left p-3 font-bold">Items</th>
                        <th className="text-right p-3 font-bold">Total</th>
                        <th className="text-center p-3 font-bold">Eliminar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No hay pedidos registrados</td></tr>
                      ) : (
                        orders.map(order => (
                          <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3 font-bold">{order.id}</td>
                            <td className="p-3">{new Date(order.timestamp).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'ready' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {order.status === 'pending' ? 'Pendiente' : order.status === 'preparing' ? 'Preparando' : order.status === 'ready' ? 'Listo' : 'Entregado'}
                              </span>
                            </td>
                            <td className="p-3">
                              {order.items.map(item => (
                                <div key={item.id} className="text-xs">{item.quantity}x {item.name}</div>
                              ))}
                            </td>
                            <td className="p-3 text-right font-bold text-primary">L.{order.total.toFixed(2)}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => { if (confirm(`¿Eliminar pedido ${order.id}?`)) deleteOrder(order.id); }}
                                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Unified Transactions Table */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <Filter className="w-5 h-5 text-primary" />
                    Transacciones (Cierres, Ganancias, Gastos, Ventas)
                  </h3>
                  {/* Filter */}
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'sale', 'expense', 'other-income', 'card-close'] as TxFilter[]).map(f => (
                      <button key={f} onClick={() => setTxFilter(f)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${txFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                        {f === 'all' ? 'Todos' : TYPE_LABELS[f]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-bold">Fecha/Hora</th>
                        <th className="text-left p-3 font-bold">Tipo</th>
                        <th className="text-left p-3 font-bold">Descripción</th>
                        <th className="text-right p-3 font-bold">Monto</th>
                        <th className="text-center p-3 font-bold">Eliminar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? (
                        <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No hay transacciones</td></tr>
                      ) : (
                        filteredTransactions.map(tx => (
                          <tr key={tx.id} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3 text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleString('es-HN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${TYPE_COLORS[tx.type] || 'bg-muted text-muted-foreground'}`}>
                                {TYPE_LABELS[tx.type] || tx.type}
                              </span>
                            </td>
                            <td className="p-3">{tx.description}</td>
                            <td className={`p-3 text-right font-bold ${tx.type === 'expense' ? 'text-destructive' : 'text-green-700'}`}>
                              {tx.type === 'expense' ? '-' : '+'}L.{tx.amount.toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={() => { if (confirm('¿Eliminar esta transacción?')) deleteTransaction(tx.id); }}
                                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
