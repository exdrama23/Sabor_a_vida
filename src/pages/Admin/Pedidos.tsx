// pages/admin/Pedidos.tsx
import { useState, useEffect } from 'react';
import { CheckCircle, Search } from 'lucide-react';
import api from '../../axiosInstance';

interface Order {
  id: string;
  externalReference?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  totalPrice: number;
  deliveryStatus: string;
  paymentStatus: string;
  created_at?: string;
  items?: any[];
}

interface PedidosProps {
  onNavigate?: (panel: string) => void;
}

const Pedidos = ({  }: PedidosProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    // Polling a cada 30 segundos
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const filtered = orders.filter(order =>
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.externalReference?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    setCompleting(orderId);
    try {
      const token = localStorage.getItem('accessToken');
      await api.put(
        `/order/${orderId}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      // Atualizar lista localmente
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, deliveryStatus: 'COMPLETED' } : order
      ));
    } catch (error) {
      console.error('Erro ao concluir pedido:', error);
      alert('Erro ao concluir pedido');
    } finally {
      setCompleting(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status?.toLowerCase()] || 'bg-stone-100 text-stone-700';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      approved: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
      refunded: 'bg-orange-100 text-orange-700',
    };
    return colors[status?.toLowerCase()] || 'bg-stone-100 text-stone-700';
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

  return (
    <div>
      <div className="bg-white rounded-2xl border border-stone-200 p-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">Pedidos</h1>

        {/* Busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou número do pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
            <p className="text-stone-500 mt-4">Carregando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-500">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border border-stone-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-stone-800">{order.customerName}</h3>
                    <p className="text-sm text-stone-500">📧 {order.customerEmail || '-'}</p>
                    <p className="text-sm text-stone-500">📱 {order.customerPhone || '-'}</p>
                    <p className="text-sm text-stone-500 mt-2">
                      Pedido: <span className="font-mono">{order.externalReference || order.id}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-rose-600">
                      R$ {order.totalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-stone-500 mt-2">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(order.deliveryStatus)}`}>
                    {order.deliveryStatus === 'COMPLETED' ? '✓ Concluído' : '⏳ Pendente'}
                  </span>
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                    {order.paymentStatus}
                  </span>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="mb-4 p-3 bg-stone-50 rounded-lg">
                    <p className="text-xs font-semibold text-stone-600 mb-2">Itens do pedido:</p>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item, idx) => (
                        <span key={idx} className="text-xs bg-white border border-stone-200 px-2 py-1 rounded">
                          {item.name || item.quantity}x
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {order.deliveryStatus !== 'COMPLETED' && (
                  <button
                    onClick={() => handleCompleteOrder(order.id)}
                    disabled={completing === order.id}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {completing === order.id ? 'Concluindo...' : 'Concluir Pedido'}
                  </button>
                )}

                {order.deliveryStatus === 'COMPLETED' && (
                  <div className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg text-center font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Pedido Concluído
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pedidos;
