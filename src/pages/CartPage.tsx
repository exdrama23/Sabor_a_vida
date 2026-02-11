import { ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react'; 
import HeaderFixo from '../components/HeaderFixo';
import CheckoutModal from './CheckoutModal'; 
import type { CartItem, CheckoutFormData } from '../types'; 

interface CartPageProps {
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void;
}

const CartPage = ({ cartItems, setCartItems }: CartPageProps) => {
  const navigate = useNavigate();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false); 
  
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
  const delivery = cartItems.length > 0 ? 15.9 : 0;
  const total = subtotal + delivery;

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
          picture_url: item.image,
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
          cost: delivery,
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
      // // Redireciona para o checkout do Mercado Pago
      // if (data.init_point) {
      //   window.location.href = data.init_point;
      // }
      
      // Limpa o carrinho após pagamento
      setCartItems([]);
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    }
  };

  return (
    <>
      <HeaderFixo />
      <div className="pt-40 pb-24 px-6 bg-white min-h-screen">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-12">
            <h1 className="text-4xl font-bold text-stone-900">Sua Sacola</h1>
            <button
              onClick={() => navigate('/products')}
              className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-2 cursor-pointer"
            >
              Continuar Comprando
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-600 text-lg mb-6">Sua sacola está vazia</p>
              <button
                onClick={() => navigate('/products')}
                className="px-8 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium cursor-pointer"
              >
                Voltar às Compras
              </button>
            </div>
          ) : (
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 bg-white border border-stone-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-32 h-32 object-cover rounded-lg shrink-0"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-stone-900 mb-2">{item.name}</h3>
                    <div className="space-y-1 text-sm text-stone-600 mb-4">
                      {item.size && <p><span className="font-medium">Tamanho:</span> {item.size}</p>}
                      {item.flavor && <p><span className="font-medium">Sabor:</span> {item.flavor}</p>}
                      {item.topping && <p><span className="font-medium">Cobertura:</span> {item.topping}</p>}
                      {item.extras && item.extras.length > 0 && (
                        <p><span className="font-medium">Adicionais:</span> {item.extras.join(', ')}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold text-rose-600">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                      <div className="flex items-center gap-3 bg-stone-100 rounded-lg p-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-stone-200 rounded transition-colors"
                        >
                          <Minus className="w-4 h-4 text-stone-600" />
                        </button>
                        <span className="w-8 text-center font-semibold text-stone-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-stone-200 rounded transition-colors"
                        >
                          <Plus className="w-4 h-4 text-stone-600" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors ml-4"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-8 sticky top-40">
                <h3 className="text-2xl font-bold text-stone-900 mb-8">Resumo do Pedido</h3>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span className="font-medium">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {cartItems.length > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>Entrega</span>
                      <span className="font-medium">R$ {delivery.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="border-t border-stone-200 pt-4 mt-4">
                    <div className="flex justify-between text-xl font-bold text-stone-900">
                      <span>Total</span>
                      <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setIsCheckoutOpen(true)}
                  disabled={cartItems.length === 0} 
                  className="w-full py-4 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  FINALIZAR COMPRA
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