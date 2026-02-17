import { ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react'; 
import HeaderFixo from '../components/HeaderFixo';
import CheckoutModal from './CheckoutModal'; 
import type { CartItem, CheckoutFormData } from '../types';
import { getProductImageUrl } from '../types'; 

interface CartPageProps {
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void;
}

const CartPage = ({ cartItems, setCartItems }: CartPageProps) => {
  const navigate = useNavigate();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false); 
  
  // Verificar se há itens com preço inválido (0 ou undefined)
  const invalidPriceItems = cartItems.filter(item => !item.price || item.price <= 0);
  const hasInvalidPrices = invalidPriceItems.length > 0;
  
  const updateQuantity = (id: string, delta: number) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = 0;
  const total = subtotal;

  const handleConfirmPayment = async (checkoutData: CheckoutFormData) => {
    console.log('Dados do checkout:', checkoutData);
    
    try {
      const mercadoPagoPayload = {
        items: cartItems.map(item => ({
          id: item.id,
          title: item.name,
          description: `${item.size || ''} ${item.flavor || ''}`.trim(),
          quantity: item.quantity,
          unit_price: item.price,
          picture_url: getProductImageUrl(item.productId || item.id),
        })),
        payer: {
          name: checkoutData.etapa1.nomeCompleto,
          email: checkoutData.etapa1.email,
          phone: {
            number: checkoutData.etapa1.telefone.replace(/\D/g, '')
          },
          identification: {
            type: 'CPF',
            number: checkoutData.etapa1.cpf.replace(/\D/g, '')
          },
          address: {
            street_name: checkoutData.etapa2.rua,
            street_number: checkoutData.etapa2.numero,
            zip_code: checkoutData.etapa2.cep.replace(/\D/g, '')
          }
        },
        shipments: {
          cost: 0,
          mode: 'custom'
        },
        back_urls: {
          success: `${window.location.origin}/order-success`,
          failure: `${window.location.origin}/order-error`,
          pending: `${window.location.origin}/order-pending`
        },
        auto_return: 'approved',
        payment_methods: {
          excluded_payment_methods: checkoutData.etapa3.metodo === 'pix' 
            ? [{ id: 'credit_card' }] 
            : [{ id: 'pix' }],
          excluded_payment_types: [],
          installments: checkoutData.etapa3.metodo === 'cartao' && checkoutData.etapa3.cartao
            ? checkoutData.etapa3.cartao.parcelas
            : 1
        },
        notification_url: 'https://seu-backend.com/mercadopago/webhook',
        statement_descriptor: 'Sabor à Vida',
        external_reference: `order_${Date.now()}`,
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 30 * 60000).toISOString() 
      };

      console.log('Payload para Mercado Pago:', mercadoPagoPayload);
      
      // const response = await fetch('/api/create-preference', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(mercadoPagoPayload)
      // });
      // 
      // const data = await response.json();
      // 
      // if (data.init_point) {
      //   window.location.href = data.init_point;
      // }
      setCartItems([]);
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    }
  };

  return (
    <>
      <HeaderFixo />
      <div className="pt-28 sm:pt-32 md:pt-40 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6 bg-white min-h-screen">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900">
              Sua Sacola
            </h1>
            <button
              onClick={() => navigate('/products')}
              className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-2 cursor-pointer text-sm sm:text-base"
            >
              Continuar Comprando
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {hasInvalidPrices && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-medium mb-2">⚠️ Alguns itens estão com preço inválido</p>
              <p className="text-amber-700 text-sm mb-3">
                Por favor, remova os itens abaixo e adicione-os novamente selecionando o tamanho:
              </p>
              <ul className="text-amber-700 text-sm list-disc list-inside">
                {invalidPriceItems.map(item => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <p className="text-stone-600 text-base sm:text-lg mb-6">Sua sacola está vazia</p>
              <button
                onClick={() => navigate('/products')}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium cursor-pointer text-sm sm:text-base"
              >
                Voltar às Compras
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 md:gap-12">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row gap-4 bg-white border border-stone-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-md transition-shadow"
                  >
                    <img
                      src={getProductImageUrl(item.productId || item.id)}
                      alt={item.name}
                      className="w-full sm:w-28 md:w-32 h-40 sm:h-28 md:h-32 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-2">{item.name}</h3>
                      <div className="space-y-1 text-xs sm:text-sm text-stone-600 mb-3 sm:mb-4">
                        {item.size && <p><span className="font-medium">Tamanho:</span> {item.size}</p>}
                        {item.flavor && <p><span className="font-medium">Sabor:</span> {item.flavor}</p>}
                        {item.topping && <p><span className="font-medium">Cobertura:</span> {item.topping}</p>}
                        {item.extras && item.extras.length > 0 && (
                          <p><span className="font-medium">Adicionais:</span> {item.extras.join(', ')}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-lg sm:text-xl font-bold text-rose-600">
                          R$ {item.price.toFixed(2).replace('.', ',')}
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 bg-stone-100 rounded-lg p-1 sm:p-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-stone-200 rounded transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
                          </button>
                          <span className="w-8 text-center font-semibold text-stone-900 text-sm sm:text-base">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-stone-200 rounded transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 sm:p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <div className="bg-stone-50 border border-stone-200 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 sticky top-28 sm:top-32 md:top-40">
                  <h3 className="text-xl sm:text-2xl font-bold text-stone-900 mb-5 sm:mb-6 md:mb-8">
                    Resumo do Pedido
                  </h3>

                  <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6 md:mb-8">
                    <div className="flex justify-between text-stone-600 text-sm sm:text-base">
                      <span>Subtotal</span>
                      <span className="font-medium">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="border-t border-stone-200 pt-3 sm:pt-4 mt-3 sm:mt-4">
                      <div className="flex justify-between text-lg sm:text-xl font-bold text-stone-900">
                        <span>Total</span>
                        <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsCheckoutOpen(true)}
                    disabled={cartItems.length === 0 || hasInvalidPrices || total <= 0} 
                    className="w-full py-3 sm:py-4 bg-rose-600 text-white rounded-lg sm:rounded-xl font-semibold hover:bg-rose-700 transition-colors mb-4 sm:mb-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {hasInvalidPrices ? 'CORRIJA OS ITENS ACIMA' : 'FINALIZAR COMPRA'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        subtotal={subtotal}
        delivery={delivery}
        total={total}
        onConfirmPayment={handleConfirmPayment}
      />
    </>
  );
};

export default CartPage;