import { useState, useMemo } from 'react';
import { CheckCircle, Search, Mail, Phone } from 'lucide-react';
import api from '../../axiosInstance';
import { useOrders } from '../../contexts/AdminCacheContext';

interface Order {
  id: string;
  externalReference?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  totalPrice: number;
  deliveryStatus?: string;
  paymentStatus: string;
  created_at?: string;
  items?: any[];
}

interface PedidosProps {
  onNavigate?: (panel: string) => void;
}

const Pedidos = ({  }: PedidosProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [completing, setCompleting] = useState<string | null>(null);

  const { orders, initialLoading, updateOrder } = useOrders();

  const pendingOrders = useMemo(() => {
    return orders.filter((order: Order) => order.deliveryStatus !== 'DELIVERED');
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return pendingOrders.filter((order: Order) =>
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.externalReference?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, pendingOrders]);

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
      updateOrder(orderId, { deliveryStatus: 'DELIVERED' });
    } catch (error) {
      console.error('Erro ao concluir pedido:', error);
      alert('Erro ao concluir pedido');
    } finally {
      setCompleting(null);
    }
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
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 md:p-8">
        {/* Cabeçalho fixo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-stone-800">Pedidos Pendentes</h1>
          <span className="text-sm text-stone-500 whitespace-nowrap">
            {pendingOrders.length} pedido(s) aguardando entrega
          </span>
        </div>

        {/* Busca fixa */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou número do pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 text-sm sm:text-base"
            />
          </div>
        </div>

        {initialLoading && orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
            <p className="text-stone-500 mt-4">Carregando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-500">Nenhum pedido encontrado</p>
          </div>
        ) : (
          /* Lista com scroll */
          <div 
            className="space-y-4 pr-1 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300"
            style={{ scrollbarWidth: 'thin' }}
          >
            {filteredOrders.map((order) => (
              <div key={order.id} className="border border-stone-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-4">
                  {/* Informações do cliente */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-stone-800 text-base sm:text-lg">{order.customerName}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-stone-500 mt-1">
                      <span className="flex items-center gap-1 break-all">
                        <Mail className="w-3 h-3 shrink-0" /> {order.customerEmail || '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 shrink-0" /> {order.customerPhone || '-'}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500 mt-2">
                      Pedido: <span className="font-mono text-xs sm:text-sm">{order.externalReference || order.id}</span>
                    </p>
                  </div>

                  {/* Preço e data */}
                  <div className="text-left md:text-right">
                    <p className="text-xl sm:text-2xl font-bold text-rose-600">
                      R$ {order.totalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>

                {/* Status do pagamento */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                    Pagamento: {order.paymentStatus}
                  </span>
                </div>

                {/* Itens do pedido */}
                {order.items && order.items.length > 0 && (
                  <div className="mb-4 p-3 bg-stone-50 rounded-lg">
                    <p className="text-xs font-semibold text-stone-600 mb-2">Itens do pedido:</p>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item, idx) => (
                        <span key={idx} className="text-xs bg-white border border-stone-200 px-2 py-1 rounded">
                          {item.quantity}x {item.name || 'Item'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botão de conclusão */}
                <button
                  onClick={() => handleCompleteOrder(order.id)}
                  disabled={completing === order.id}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <CheckCircle className="w-5 h-5" />
                  {completing === order.id ? 'Concluindo...' : 'Marcar como Entregue'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pedidos;