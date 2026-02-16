// pages/admin/Dashboard.tsx
import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Package, RefreshCw } from 'lucide-react';
import api from '../../axiosInstance';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

interface Order {
  id: string;
  customerName: string;
  totalPrice: number;
  deliveryStatus: string;
  created_at?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  featured: boolean;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardData();
    // Polling a cada 30 segundos
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/product'),
        api.get('/orders')
      ]);

      const products = productsRes.data || [];
      const orders = ordersRes.data || [];

      const totalRevenue = orders.reduce((sum: number, order: any) => 
        sum + (Number(order.totalPrice) || 0), 0
      );

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue,
        pendingOrders: orders.filter((o: any) => o.deliveryStatus === 'PENDING').length,
      });

      // Últimas atividades (últimos 5 pedidos)
      setRecentOrders(orders.slice(0, 5));

      // Produtos em destaque
      const featured = products.filter((p: any) => p.featured).slice(0, 5);
      setFeaturedProducts(featured);

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const cards = [
    { 
      title: 'Total de Produtos', 
      value: stats.totalProducts, 
      icon: Package, 
      color: 'bg-blue-500' 
    },
    { 
      title: 'Total de Pedidos', 
      value: stats.totalOrders, 
      icon: ShoppingBag, 
      color: 'bg-green-500' 
    },
    { 
      title: 'Receita Total', 
      value: `R$ ${stats.totalRevenue.toFixed(2)}`, 
      icon: DollarSign, 
      color: 'bg-rose-500' 
    },
    { 
      title: 'Pedidos Pendentes', 
      value: stats.pendingOrders, 
      icon: TrendingUp, 
      color: 'bg-orange-500' 
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-stone-800">Dashboard</h1>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <button
            onClick={fetchDashboardData}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            title="Atualizar agora"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <span>Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
          <p className="text-stone-500 mt-4">Carregando dashboard...</p>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card, index) => (
              <div key={index} className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${card.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-stone-800">{card.value}</span>
                </div>
                <p className="text-stone-600">{card.title}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Últimas Atividades */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Últimas Atividades</h2>
              {recentOrders.length === 0 ? (
                <p className="text-stone-500 text-center py-8">Nenhum pedido ainda</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-stone-800 text-sm">{order.customerName}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.deliveryStatus === 'COMPLETED' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.deliveryStatus === 'COMPLETED' ? '✓ Concluído' : '⏳ Pendente'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        R$ {order.totalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Produtos em Destaque */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Produtos em Destaque</h2>
              {featuredProducts.length === 0 ? (
                <p className="text-stone-500 text-center py-8">Nenhum produto em destaque</p>
              ) : (
                <div className="space-y-3">
                  {featuredProducts.map((product) => (
                    <div key={product.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-stone-800 text-sm">{product.name}</p>
                        <span className="text-sm font-bold text-rose-600">
                          R$ {product.price?.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">⭐ Marcado como destaque</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;