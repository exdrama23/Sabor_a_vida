import { useState, useMemo } from 'react';
import { Calendar, CreditCard, ShoppingBag, User, MapPin, Phone } from 'lucide-react';
import { useLogsData } from '../../contexts/AdminCacheContext';

const Logs = () => {
  const [filter, setFilter] = useState<'all' | 'payments' | 'orders'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const { orders, payments, initialLoading } = useLogsData();

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

  const getStatusColor = (status?: string | null) => {
    const colors: Record<string, string> = {
      approved: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
      refunded: 'bg-orange-100 text-orange-700',
    };
    const key = status?.toLowerCase() || '';
    return colors[key] || 'bg-stone-100 text-stone-700';
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      if (!dateFilter) return true;
      const paymentDate = payment.created_at ? new Date(payment.created_at).toISOString().split('T')[0] : '';
      return paymentDate === dateFilter;
    });
  }, [payments, dateFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!dateFilter) return true;
      const orderDate = order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : '';
      return orderDate === dateFilter;
    });
  }, [orders, dateFilter]);

  const showLoading = initialLoading && orders.length === 0 && payments.length === 0;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 md:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-stone-800 mb-4 sm:mb-6">Logs do Sistema</h1>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 bg-stone-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base transition-colors ${
                filter === 'all' ? 'bg-white shadow text-rose-600' : 'text-stone-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('payments')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base transition-colors flex items-center justify-center gap-2 ${
                filter === 'payments' ? 'bg-white shadow text-rose-600' : 'text-stone-600'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Pagamentos</span>
              <span className="sm:hidden">Pagtos</span>
            </button>
            <button
              onClick={() => setFilter('orders')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base transition-colors flex items-center justify-center gap-2 ${
                filter === 'orders' ? 'bg-white shadow text-rose-600' : 'text-stone-600'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
              <span className="sm:hidden">Peds</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-5 h-5 text-stone-400 shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="px-3 py-2 text-sm text-rose-600 hover:text-rose-700 whitespace-nowrap"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {showLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
            <p className="text-stone-500 mt-4">Carregando logs...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pagamentos */}
            {(filter === 'all' || filter === 'payments') && (
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Pagamentos ({filteredPayments.length})
                </h2>
                <div 
                  className="space-y-4 pr-1 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300"
                  style={{ scrollbarWidth: 'thin' }} /* para Firefox */
                >
                  {filteredPayments.length === 0 ? (
                    <p className="text-stone-500 text-center py-8">Nenhum pagamento encontrado</p>
                  ) : (
                    filteredPayments.map((payment) => (
                      <div key={payment.id} className="border border-stone-200 rounded-xl p-3 sm:p-4 hover:shadow-sm transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-stone-800 text-sm sm:text-base">
                              {payment.orderExternalRef}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </div>
                          <span className="text-rose-600 font-bold text-sm sm:text-base">
                            R$ {Number(payment.transactionAmount).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-stone-500">
                          <span>{formatDate(payment.created_at)}</span>
                          <span>• {payment.paymentMethodId}</span>
                          <span className="text-xs text-stone-400">MP ID: {payment.mercadoPagoId}</span>
                          {payment.statusDetail && <span>• {payment.statusDetail}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Pedidos */}
            {(filter === 'all' || filter === 'orders') && (
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Pedidos ({filteredOrders.length})
                </h2>
                <div 
                  className="space-y-4 pr-1 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {filteredOrders.length === 0 ? (
                    <p className="text-stone-500 text-center py-8">Nenhum pedido encontrado</p>
                  ) : (
                    filteredOrders.map((order) => (
                      <div key={order.id} className="border border-stone-200 rounded-xl p-3 sm:p-4 hover:shadow-sm transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-stone-800 text-sm sm:text-base">
                              {order.externalReference}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.paymentStatus)}`}>
                              {order.paymentStatus}
                            </span>
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                              {order.paymentMethod}
                            </span>
                            {/* Status de Entrega */}
                            {order.deliveryStatus === 'DELIVERED' ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                                ✓ Entregue
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">
                                Pendente Entrega
                              </span>
                            )}
                          </div>
                          <span className="text-rose-600 font-bold text-sm sm:text-base">
                            R$ {Number(order.totalPrice).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {/* Informações do Cliente */}
                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-stone-600 mb-2">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {order.customerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {order.customerPhone}
                          </span>
                          <span className="text-stone-400 break-all">{order.customerEmail}</span>
                        </div>

                        {/* Endereço */}
                        <div className="flex items-start gap-1 text-xs sm:text-sm text-stone-500 mb-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                          <span className="break-words">
                            {order.addressStreet}, {order.addressNumber}
                            {order.addressComplement && ` - ${order.addressComplement}`}
                            {' • '}{order.addressNeighborhood}, {order.addressCity}/{order.addressState} - {order.addressZip}
                          </span>
                        </div>

                        {/* Data e valores */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-stone-500 mb-2">
                          <span>{formatDate(order.created_at)}</span>
                          <span>Subtotal: R$ {Number(order.subtotal).toFixed(2).replace('.', ',')}</span>
                          <span>Entrega: R$ {Number(order.deliveryPrice).toFixed(2).replace('.', ',')}</span>
                          {order.installments && order.installments > 1 && (
                            <span>{order.installments}x parcelas</span>
                          )}
                          {order.cardLastFour && (
                            <span>Cartão: ****{order.cardLastFour}</span>
                          )}
                        </div>

                        {/* Itens */}
                        {order.items && order.items.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-stone-100">
                            <p className="text-xs text-stone-500 mb-1">Itens:</p>
                            <div className="flex flex-wrap gap-2">
                              {(Array.isArray(order.items) ? order.items : []).map((item, idx) => (
                                <span key={idx} className="text-xs bg-stone-100 px-2 py-1 rounded">
                                  {item.quantity}x {item.name} {item.size && `(${item.size})`} - R$ {Number(item.price).toFixed(2).replace('.', ',')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Notas de entrega */}
                        {order.deliveryNotes && (
                          <div className="mt-2 pt-2 border-t border-stone-100">
                            <p className="text-xs text-stone-500">Obs: {order.deliveryNotes}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;