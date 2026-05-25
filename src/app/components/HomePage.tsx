import { useNavigate } from 'react-router';
import { TrendingUp, ShoppingCart, ChefHat, Wifi, WifiOff } from 'lucide-react';
import { useOrders } from './OrderContext';
import logo from '../../imports/image-1.png';

export default function HomePage() {
  const navigate = useNavigate();
  const { connected } = useOrders();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-primary/10 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="bg-white rounded-2xl p-6 inline-block mb-6 shadow-md">
            <img src={logo} alt="Don de Chuy" className="w-48 h-auto" />
          </div>
          <h1 className="text-5xl font-bold mb-3 text-foreground">Don de Chuy Business</h1>
          <p className="text-xl text-muted-foreground">Sistema de Gestión de Restaurante</p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={() => navigate('/admin')}
            className="group bg-card border-2 border-border hover:border-primary rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-primary rounded-full p-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-12 h-12 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Administración</h2>
                <p className="text-muted-foreground">Panel de control, ventas, gastos y facturación</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/pos')}
            className="group bg-card border-2 border-border hover:border-primary rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-primary rounded-full p-6 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-12 h-12 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Ventana</h2>
                <p className="text-muted-foreground">Terminal de pedidos y punto de venta</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/kitchen')}
            className="group bg-card border-2 border-border hover:border-primary rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-primary rounded-full p-6 group-hover:scale-110 transition-transform">
                <ChefHat className="w-12 h-12 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Cocina (KDS)</h2>
                <p className="text-muted-foreground">Sistema de visualización de pedidos para cocina</p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-xl px-6 py-3 shadow-sm">
            {connected
              ? <><Wifi className="w-4 h-4 text-green-500" /><span className="text-sm text-green-700 font-medium">Conectado — Sincronización en tiempo real</span></>
              : <><WifiOff className="w-4 h-4 text-yellow-500" /><span className="text-sm text-muted-foreground">Conectando al servidor...</span></>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
