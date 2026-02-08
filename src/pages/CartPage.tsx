import { ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CartItem } from '../types';

interface CartPageProps {
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void;
}

const CartPage = ({ cartItems, setCartItems }: CartPageProps) => {
  const navigate = useNavigate();
  const updateQuantity = (id: number, delta: number) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const removeItem = (id: number) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = cartItems.length > 0 ? 15.9 : 0;
  const total = subtotal + delivery;

  return (
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

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl text-stone-500 mb-6">Seu carrinho está vazio</p>
                <button
                  onClick={() => navigate('/products')}
                  className="px-6 py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Continuar Comprando
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-stone-200 rounded-2xl p-6 flex items-center gap-6 hover:shadow-lg transition-shadow"
                >
                  <img src={item.image} alt={item.name} className="w-32 h-32 object-cover rounded-xl" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-stone-900 mb-2">{item.name}</h3>
                    <div className="text-sm text-stone-600 mb-3 space-y-1">
                      {item.size && <p>Tamanho: <span className="font-medium">{item.size}</span></p>}
                      {item.flavor && <p>Sabor: <span className="font-medium">{item.flavor}</span></p>}
                      {item.topping && <p>Cobertura: <span className="font-medium">{item.topping}</span></p>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-10 h-10 border border-stone-200 rounded-lg flex items-center justify-center hover:border-rose-300 transition-colors"
                        >
                          <Minus className="w-4 h-4 text-stone-500" />
                        </button>
                        <span className="text-lg font-semibold text-stone-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-10 h-10 border border-stone-200 rounded-lg flex items-center justify-center hover:border-rose-300 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-stone-500" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-rose-600">
                          R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-sm text-stone-400 hover:text-rose-600 transition-colors mt-2 flex items-center gap-1 justify-end"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
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

              <button disabled={cartItems.length === 0} className="w-full py-4 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed">
                FINALIZAR COMPRA
              </button>

              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
