import { useMemo } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Package, RefreshCw } from 'lucide-react';
import { useDashboardData } from '../../contexts/AdminCacheContext';

interface Order {
  id: string;
  customerName: string;
  totalPrice: number;
  deliveryStatus?: string;
  created_at?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  featured: boolean;
}

const AdminDashboard = () => {
  const { products, orders, initialLoading, refetch, lastUpdate } = useDashboardData();

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum: number, order: Order) => 
      sum + (Number(order.totalPrice) || 0), 0
    );

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue,
      pendingOrders: orders.filter((o: Order) => o.deliveryStatus === 'PENDING').length,
    };
  }, [products, orders]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 5);
  }, [orders]);

  const featuredProducts = useMemo(() => {
    return products.filter((p: Product) => p.featured).slice(0, 5);
  }, [products]);

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

  const showLoading = initialLoading && products.length === 0 && orders.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-stone-800">Dashboard</h1>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          <button
            onClick={refetch}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            title="Atualizar agora"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <span>
            Atualizado: {lastUpdate.products?.toLocaleTimeString('pt-BR') || lastUpdate.orders?.toLocaleTimeString('pt-BR') || '-'}
          </span>
        </div>
      </div>

      {showLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
          <p className="text-stone-500 mt-4">Carregando dashboard...</p>
        </div>
      )}

      {!showLoading && (
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
                          order.deliveryStatus === 'DELIVERED' 
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.deliveryStatus === 'DELIVERED' ? 'Entregue' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        R$ {Number(order.totalPrice).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      <p className="text-xs text-stone-500 mt-1">Marcado como destaque</p>
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