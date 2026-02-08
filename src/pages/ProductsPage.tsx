import { ShoppingCart, Minus, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CartItem, Product } from '../types';

type Size = 'pequeno' | 'medio' | 'grande';

interface ProductsPageProps {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  products: Product[];
}

const ProductsPage = ({ cart, setCart, products }: ProductsPageProps) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<Size>('medio');
  const [selectedFlavor, setSelectedFlavor] = useState('chocolate');
  const [selectedTopping, setSelectedTopping] = useState('chocolate');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showCartAdded, setShowCartAdded] = useState(false);


  const categories = [
    { id: 'todos', name: 'Todos' },
    { id: 'chocolate', name: 'Chocolates' },
    { id: 'frutas', name: 'Frutas' },
    { id: 'especiais', name: 'Especiais' },
    { id: 'tradicionais', name: 'Tradicionais' },
  ];

  const flavors = [
    { id: 'chocolate', name: 'Chocolate' },
    { id: 'ovos-amanteigada', name: 'Ovos Amanteigada' },
    { id: 'cenoura', name: 'Cenoura' },
  ];

  const toppings = [
    { id: 'chocolate', name: 'Chocolate' },
    { id: 'ninho', name: 'Ninho' },
    { id: 'paçoca', name: 'Paçoca' },
    { id: 'doce-de-leite', name: 'Doce de Leite' },
    { id: 'castanha', name: 'Castanha' },
  ];

  const extras = [
    { id: 'granulado', name: 'Granulado' },
    { id: 'gotas-chocolate', name: 'Gotas de Chocolate' },
    { id: 'castanha', name: 'Castanha' },
    { id: 'amendoim', name: 'Amendoim' },
    { id: 'nenhum', name: 'Sem acompanhamento' },
  ];

  const sizeOptions: Array<{ id: Size; label: string; desc: string }> = [
    { id: 'pequeno', label: 'Pequeno', desc: '4-6 porções' },
    { id: 'medio', label: 'Médio', desc: '8-10 porções' },
    { id: 'grande', label: 'Grande', desc: '12-14 porções' },
  ];

  const calculateTotal = (productPrice: number) => {
    const sizeMultiplier = {
      pequeno: 0.7,
      medio: 1,
      grande: 1.4,
    };
    const extraToppingPrice = selectedExtras.includes('extra') ? 2 : 0;
    return (productPrice * sizeMultiplier[selectedSize] + extraToppingPrice) * quantity;
  };

  const filteredProducts =
    selectedCategory === 'todos'
      ? products
      : products.filter((product) => product.category === selectedCategory);

  const addToCart = (product: Product, isCustomized: boolean = false) => {
    let newCartItem: CartItem;
    
    if (isCustomized && customizingProduct) {
      const totalPrice = calculateTotal(product.price);
      newCartItem = {
        id: product.id,
        name: customizingProduct.name,
        price: totalPrice / quantity,
        quantity: quantity,
        image: customizingProduct.image,
        size: selectedSize,
        flavor: selectedFlavor,
        topping: selectedTopping,
        extras: selectedExtras.filter(e => e !== 'nenhum'),
      };
    } else {
      newCartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
        size: 'medio',
        flavor: 'chocolate',
        topping: 'chocolate',
        extras: [],
      };
    }
    
    // Check if item with same ID and customization already exists
    const existingIndex = cart.findIndex(
      (item) =>
        item.id === newCartItem.id &&
        item.size === newCartItem.size &&
        item.flavor === newCartItem.flavor &&
        item.topping === newCartItem.topping &&
        JSON.stringify(item.extras) === JSON.stringify(newCartItem.extras)
    );
    
    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += newCartItem.quantity;
      setCart(updatedCart);
    } else {
      setCart([...cart, newCartItem]);
    }
    
    setShowCartAdded(true);
    
    setTimeout(() => {
      setShowCartAdded(false);
    }, 3000);
    
    if (isCustomized && customizingProduct) {
      setCustomizingProduct(null);
      resetCustomization();
    }
  };

  const resetCustomization = () => {
    setSelectedSize('medio');
    setSelectedFlavor('chocolate');
    setSelectedTopping('chocolate');
    setSelectedExtras([]);
    setQuantity(1);
  };

  const handleCustomizeFirstProduct = () => {
    if (filteredProducts.length > 0) {
      setCustomizingProduct(filteredProducts[0]);
    }
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2).replace('.', ',');
  };

  return (
    <>
      <div className="pt-24 pb-16 px-4 bg-white min-h-screen">
        <div className="container mx-auto max-w-7xl">
          {showCartAdded && (
            <div className="fixed top-24 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in flex items-center gap-4">
              <span>Produto adicionado ao carrinho!</span>
              <button
                onClick={() => navigate('/cart')}
                className="underline hover:opacity-80 font-semibold cursor-pointer"
              >
                Ver Carrinho
              </button>
            </div>
          )}

          <div className="mb-12 text-center">
            <h1 className="text-5xl font-light text-stone-800 mb-4 tracking-tight">Nossos Produtos</h1>
          </div>

          <div className="flex justify-center items-center gap-4 mb-16">
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-6 py-3 rounded-full font-medium transition-all cursor-pointer ${
                    selectedCategory === category.id
                      ? 'bg-stone-800 text-white'
                      : 'text-stone-600 hover:text-stone-800 hover:bg-stone-100'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <button
              onClick={handleCustomizeFirstProduct}
              className="px-6 py-3 bg-white border-2 border-rose-500 text-rose-600 rounded-full font-medium hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Personalizar</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group relative bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {product.featured && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-medium backdrop-blur-sm">
                      DESTAQUE
                    </div>
                  )}
                  
                </div>
                <div className="p-3 md:p-5">
                  <h3 className="text-sm md:text-base lg:text-xl font-normal text-stone-800 mb-2 md:mb-3 truncate">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg md:text-2xl font-light text-rose-600">R$ {formatPrice(product.price)}</span>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      className="w-10 h-10 md:w-12 md:h-12 bg-stone-800 text-white rounded-lg flex items-center justify-center hover:bg-stone-700 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {customizingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 flex items-center justify-between border-b border-stone-100">
              <div>
                <h2 className="text-2xl font-light text-stone-800">Personalizar</h2>
                <p className="text-stone-600">{customizingProduct.name}</p>
              </div>
              <button
                onClick={() => {
                  setCustomizingProduct(null);
                  resetCustomization();
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-8">
                <img
                  src={customizingProduct.image}
                  alt={customizingProduct.name}
                  className="w-full h-72 object-cover rounded-xl"
                />
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-stone-800 mb-4">Tamanho</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {sizeOptions.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size.id)}
                        className={`p-4 border rounded-xl text-center transition-all cursor-pointer ${
                          selectedSize === size.id
                            ? 'border-rose-500 bg-rose-50 text-rose-600'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-medium">{size.label}</div>
                        <div className="text-sm text-stone-500 mt-1">{size.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-stone-800 mb-4">Sabor da Massa</h3>
                  <div className="flex gap-3">
                    {flavors.map((flavor) => (
                      <button
                        key={flavor.id}
                        onClick={() => setSelectedFlavor(flavor.id)}
                        className={`px-4 py-3 border rounded-lg transition-all flex-1 cursor-pointer ${
                          selectedFlavor === flavor.id
                            ? 'border-rose-500 bg-rose-50 text-rose-600'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-medium">{flavor.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-stone-800 mb-4">Cobertura</h3>
                  <div className="flex flex-wrap gap-2">
                    {toppings.map((topping) => (
                      <button
                        key={topping.id}
                        onClick={() => setSelectedTopping(topping.id)}
                        className={`px-4 py-2.5 border rounded-lg transition-all cursor-pointer ${
                          selectedTopping === topping.id
                            ? 'border-rose-500 bg-rose-50 text-rose-600'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{topping.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-stone-800 mb-4">Acompanhamentos</h3>
                  <div className="flex flex-wrap gap-2">
                    {extras.map((extra) => (
                      <button
                        key={extra.id}
                        onClick={() => {
                          if (extra.id === 'nenhum') {
                            setSelectedExtras(['nenhum']);
                          } else {
                            setSelectedExtras((prev) =>
                              prev.includes('nenhum')
                                ? [extra.id]
                                : prev.includes(extra.id)
                                  ? prev.filter((e) => e !== extra.id)
                                  : [...prev, extra.id]
                            );
                          }
                        }}
                        className={`px-4 py-2.5 border rounded-lg transition-all cursor-pointer ${
                          selectedExtras.includes(extra.id)
                            ? 'border-rose-500 bg-rose-50 text-rose-600'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{extra.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-stone-800">Cobertura Extra</div>
                      <div className="text-sm text-stone-500">+ R$ 2,00</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={selectedExtras.includes('extra')}
                        onChange={(e) => {
                          setSelectedExtras((prev) =>
                            e.target.checked ? [...prev, 'extra'] : prev.filter((item) => item !== 'extra')
                          );
                        }}
                      />
                      <div className="w-12 h-6 bg-stone-300 rounded-full peer peer-checked:bg-rose-500 transition-colors">
                        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-b border-stone-100">
                  <div>
                    <div className="font-medium text-stone-800 mb-3">Quantidade</div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-lg border border-stone-300 flex items-center justify-center hover:bg-stone-100 transition-colors cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-medium text-2xl text-stone-800 min-w-8 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-10 h-10 rounded-lg border border-stone-300 flex items-center justify-center hover:bg-stone-100 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-stone-500 mb-1">Valor total</div>
                    <div className="text-3xl font-light text-rose-600">
                      R$ {formatPrice(calculateTotal(customizingProduct?.price ?? 0))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 flex justify-end gap-4">
                <button
                  onClick={() => {
                    setCustomizingProduct(null);
                    resetCustomization();
                  }}
                  className="px-8 py-3 text-stone-600 rounded-lg font-medium hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => addToCart(customizingProduct, true)}
                  className="px-8 py-3 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Adicionar ao Carrinho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductsPage;