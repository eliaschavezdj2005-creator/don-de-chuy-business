import { useOrders } from './OrderContext';
import { Clock, CheckCircle, ArrowLeft, Square, CheckSquare, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import logo from '../../imports/image-1.png';

export default function KitchenDisplay() {
  const navigate = useNavigate();
  const { orders, updateOrderStatus, markItemReady } = useOrders();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimeElapsed = (orderTime: string) =>
    Math.floor((currentTime.getTime() - new Date(orderTime).getTime()) / 1000 / 60);

  const getUrgencyBorder = (minutes: number) => {
    if (minutes < 5) return 'border-green-500 shadow-green-500/20';
    if (minutes < 10) return 'border-yellow-500 shadow-yellow-500/20';
    return 'border-red-500 shadow-red-500/20';
  };

  const getUrgencyHeader = (minutes: number) => {
    if (minutes < 5) return 'from-green-600 to-green-700';
    if (minutes < 10) return 'from-yellow-500 to-yellow-600';
    return 'from-red-600 to-red-700';
  };

  // Show all non-delivered orders in KDS — they only leave when explicitly delivered from Ventana
  const activeOrders = orders.filter(o => o.status !== 'delivered');

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      {/* Header — light bg for logo contrast */}
      <header className="bg-white border-b-4 border-primary px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-100 text-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <img src={logo} alt="Don de Chuy" className="h-14 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">Cocina (KDS)</h1>
            <p className="text-sm text-muted-foreground">Don de Chuy Business</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-primary">
            {currentTime.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString('es-HN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      <div className="p-6">
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <CheckCircle className="w-24 h-24 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-400">No hay pedidos pendientes</h2>
            <p className="text-gray-500">Los nuevos pedidos aparecerán aquí automáticamente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeOrders.map(order => {
              const elapsed = getTimeElapsed(order.timestamp);
              const checkedCount = order.deliveredItems.length;
              const totalItems = order.items.length;
              const allChecked = checkedCount === totalItems;

              return (
                <div
                  key={order.id}
                  className={`rounded-xl border-2 ${getUrgencyBorder(elapsed)} shadow-lg overflow-hidden flex flex-col`}
                >
                  {/* Card Header */}
                  <div className={`bg-gradient-to-br ${getUrgencyHeader(elapsed)} p-4`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-bold text-white">Pedido {order.id}</h3>
                      <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full">
                        <Clock className="w-4 h-4 text-white" />
                        <span className="font-bold text-white text-sm">{elapsed} min</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {/* Sent by */}
                      <div className="flex items-center gap-1 text-white/80 text-xs">
                        <User className="w-3 h-3" />
                        <span>{order.sentBy || 'Ventana'}</span>
                        <span className="mx-1">·</span>
                        <span>{new Date(order.timestamp).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white`}>
                        {order.status === 'pending' ? 'Pendiente' : order.status === 'preparing' ? 'Preparando' : 'Listo'}
                      </span>
                    </div>
                  </div>

                  {/* Items — individually checkable */}
                  <div className="flex-1 p-3 bg-[#2a2a2a] space-y-2">
                    {order.items.map(item => {
                      const done = order.deliveredItems.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => markItemReady(order.id, item.id)}
                          className={`w-full flex items-center gap-3 rounded-lg p-3 transition-all text-left ${done ? 'bg-green-900/40 opacity-60' : 'bg-[#1A1A1A] hover:bg-[#111]'}`}
                        >
                          {done
                            ? <CheckSquare className="w-5 h-5 text-green-400 shrink-0" />
                            : <Square className="w-5 h-5 text-gray-400 shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-base leading-tight ${done ? 'line-through text-gray-500' : 'text-white'}`}>
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">{item.category}</p>
                          </div>
                          <div className="bg-primary text-primary-foreground font-bold rounded-full w-8 h-8 flex items-center justify-center text-base shrink-0">
                            {item.quantity}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="bg-[#2a2a2a] px-3 pb-2">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Preparados</span>
                      <span>{checkedCount}/{totalItems}</span>
                    </div>
                    <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Status footer — never shows "mark as delivered" from KDS; that's ventana's job */}
                  <div className={`py-3 px-5 flex items-center justify-center gap-2 text-sm font-bold ${
                    allChecked ? 'bg-green-700 text-white' :
                    checkedCount > 0 ? 'bg-yellow-600 text-white' :
                    'bg-[#333] text-gray-400'
                  }`}>
                    <CheckCircle className="w-4 h-4" />
                    {allChecked ? '✓ Listo — esperando entrega en Ventana' :
                     checkedCount > 0 ? `En preparación (${checkedCount}/${totalItems})` :
                     'Pendiente de preparar'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats Footer */}
        <footer className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-[#2a2a2a] rounded-xl p-4 text-center">
            <p className="text-gray-400 mb-1 text-sm">Pedidos Activos</p>
            <p className="text-3xl font-bold text-primary">{activeOrders.length}</p>
          </div>
          <div className="bg-[#2a2a2a] rounded-xl p-4 text-center">
            <p className="text-gray-400 mb-1 text-sm">Listos</p>
            <p className="text-3xl font-bold text-green-500">{orders.filter(o => o.status === 'ready').length}</p>
          </div>
          <div className="bg-[#2a2a2a] rounded-xl p-4 text-center">
            <p className="text-gray-400 mb-1 text-sm">Entregados Hoy</p>
            <p className="text-3xl font-bold text-white">{orders.filter(o => o.status === 'delivered').length}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
