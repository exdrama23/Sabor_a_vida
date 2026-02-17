import { ShoppingCart, Minus, Plus, X, Filter, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CartItem, Product } from '../types';
import { getProductImageUrl } from '../types';

type Size = 'PEQUENO' | 'MEDIO' | 'GRANDE';

interface ProductsPageProps {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  products: Product[];
}

const ProductsPage = ({ cart, setCart, products }: ProductsPageProps) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<Size | ''>('');
  const [selectedFlavor, setSelectedFlavor] = useState('chocolate');
  const [selectedTopping, setSelectedTopping] = useState('chocolate');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showCartAdded, setShowCartAdded] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [productSizes, setProductSizes] = useState<Record<string, Size | ''>>({});

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
    { id: 'PEQUENO', label: 'Pequeno', desc: '4-6 porções' },
    { id: 'MEDIO', label: 'Médio', desc: '8-10 porções' },
    { id: 'GRANDE', label: 'Grande', desc: '12-14 porções' },
  ];

  const sizePrices: Record<Size, number> = {
    PEQUENO: 12,
    MEDIO: 35,
    GRANDE: 60,
  };

  useEffect(() => {
    if (selectedSize) {
      localStorage.setItem('boloTamanhoSelecionado', selectedSize);
    }
  }, [selectedSize]);

  const calculatePrice = (isCustomized: boolean = false) => {
    if (!isCustomized) return 0;

    if (customizingProduct && customizingProduct.price && customizingProduct.price > 0) {
      let price = customizingProduct.price;
      if (selectedExtras.includes('extra')) price += 2;
      return price;
    }

    if (!selectedSize) return 0;

    const sizePrices = {
      PEQUENO: 12,
      MEDIO: 35,
      GRANDE: 60,
    };

    let price = sizePrices[selectedSize as Size];
    if (selectedExtras.includes('extra')) price += 2;
    return price;
  };

  const filteredProducts =
    selectedCategory === 'todos'
      ? products
      : products.filter((product) => product.category === selectedCategory);

  const addToCart = (product: Product, isCustomized: boolean = false, defaultSize?: Size) => {
    let newCartItem: CartItem;
    
    if (isCustomized && customizingProduct && selectedSize) {
      const pricePerUnit = calculatePrice(true);
      newCartItem = {
        id: `${product.id}-${selectedSize}-${selectedFlavor}-${selectedTopping}`,
        productId: product.id,
        name: customizingProduct.name,
        price: pricePerUnit,
        quantity: quantity,
        image: customizingProduct.image,
        size: selectedSize as Size,
        flavor: selectedFlavor,
        topping: selectedTopping,
        extras: selectedExtras.filter(e => e !== 'nenhum'),
      };
    } else {
      const priceForSize = defaultSize ? sizePrices[defaultSize] : (product.price || 0);
      newCartItem = {
        id: defaultSize ? `${product.id}-${defaultSize}` : product.id,
        productId: product.id,
        name: product.name,
        price: priceForSize,
        quantity: 1,
        image: product.image,
        size: defaultSize,
        flavor: undefined,
        topping: undefined,
        extras: [],
      };
    }

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
    setSelectedSize('');
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
      <div className="pt-24 pb-16 px-4 md:px-6 bg-white min-h-screen">
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

          <div className="mb-8 md:mb-12 text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-stone-800 mb-3 md:mb-4 tracking-tight">
              Nossos Produtos
            </h1>
            <p className="text-stone-600 text-base md:text-lg max-w-2xl mx-auto">
              Escolha entre nossos deliciosos produtos ou personalize do seu jeito
            </p>
          </div>

          <div className="hidden md:flex justify-between items-center mb-10 lg:mb-16">
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-5 py-2.5 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap ${
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
              className="px-6 py-3 bg-white border-2 border-rose-500 text-rose-600 rounded-full font-medium hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
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

          <div className="md:hidden mb-8 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 text-stone-800 rounded-full font-medium cursor-pointer"
              >
                <Filter className="w-4 h-4" />
                <span>Categorias</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
              </button>

              <button
                onClick={handleCustomizeFirstProduct}
                className="px-4 py-2.5 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
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

            {showMobileFilters && (
              <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                <div className="flex gap-2 min-w-max">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setShowMobileFilters(false);
                      }}
                      className={`px-5 py-2.5 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap ${
                        selectedCategory === category.id
                          ? 'bg-stone-800 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group relative bg-white rounded-xl md:rounded-2xl overflow-hidden hover:shadow-lg md:hover:shadow-xl transition-all duration-300 border border-stone-100 flex flex-col"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={getProductImageUrl(product.id)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {product.featured && (
                    <div className="absolute top-3 left-3 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-medium backdrop-blur-sm">
                      DESTAQUE
                    </div>
                  )}
                </div>
                <div className="p-4 md:p-5 flex flex-col flex-1">
                  <h3 className="text-base md:text-lg font-normal text-stone-800 mb-2 md:mb-3 line-clamp-2 min-h-14">
                    {product.name}
                  </h3>
                  
                  {product.description && (
                    <p className="text-xs md:text-sm text-stone-600 mb-3 md:mb-4 line-clamp-2 grow">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Tamanho</label>
                      <select
                        value={productSizes[product.id] || ''}
                        onChange={(e) => setProductSizes({...productSizes, [product.id]: e.target.value as Size | ''})}
                        className="w-full border border-stone-200 px-2 py-2 rounded-lg text-sm focus:outline-none focus:border-rose-500 bg-white"
                      >
                        <option value="">Selecione o tamanho</option>
                        <option value="PEQUENO">Pequeno</option>
                        <option value="MEDIO">Médio</option>
                        <option value="GRANDE">Grande</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                      <span className="text-lg md:text-xl font-light text-rose-600">
                        {productSizes[product.id] ? (
                          `R$ ${formatPrice(sizePrices[productSizes[product.id] as Size])}`
                        ) : (
                          `R$ ${formatPrice(product.price || 0)}`
                        )}
                      </span>
                      <button
                        onClick={() => addToCart(product, false, productSizes[product.id] || undefined)}
                        className={`w-10 h-10 md:w-10 md:h-10 ${((product.price && product.price > 0) || productSizes[product.id]) ? 'bg-stone-800 text-white hover:bg-stone-700' : 'bg-stone-200 text-stone-400 cursor-not-allowed'} rounded-lg flex items-center justify-center transition-colors active:scale-95`}
                        aria-label={`Adicionar ${product.name} ao carrinho`}
                        disabled={!((product.price && product.price > 0) || productSizes[product.id])}
                      >
                        <ShoppingCart className="w-5 h-5 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-stone-600 text-lg">Nenhum produto encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </div>

      {customizingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-2 md:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl md:rounded-2xl max-w-3xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 md:p-6 flex items-center justify-between border-b border-stone-100 z-10">
              <div className="max-w-[70%]">
                <h2 className="text-lg md:text-2xl font-light text-stone-800 truncate">Personalizar</h2>
                <p className="text-stone-600 text-sm md:text-base truncate">{customizingProduct.name}</p>
              </div>
              <button
                onClick={() => {
                  setCustomizingProduct(null);
                  resetCustomization();
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6">
              <div className="mb-6 md:mb-8">
                <img
                  src={getProductImageUrl(customizingProduct.id)}
                  alt={customizingProduct.name}
                  className="w-full h-48 md:h-72 object-cover rounded-lg md:rounded-xl"
                />
              </div>

              <div className="space-y-6 md:space-y-8">
                <div>
                  <h3 className="text-base md:text-lg font-medium text-stone-800 mb-3 md:mb-4">Tamanho</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    {sizeOptions.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size.id)}
                        className={`p-3 md:p-4 border rounded-lg md:rounded-xl text-center transition-all cursor-pointer ${
                          selectedSize === size.id
                            ? 'border-rose-500 bg-rose-50 text-rose-600'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-medium text-sm md:text-base">{size.label}</div>
                        <div className="text-xs md:text-sm text-stone-500 mt-1">{size.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-base md:text-lg font-medium text-stone-800 mb-3 md:mb-4">Sabor da Massa</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {flavors.map((flavor) => (
                      <button
                        key={flavor.id}
                        onClick={() => setSelectedFlavor(flavor.id)}
                        className={`px-4 py-3 border rounded-lg transition-all cursor-pointer ${
                          selectedFlavor === flavor.id
                            ? 'border-rose-500 bg-rose-50 text-rose-600'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-medium text-sm md:text-base">{flavor.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-base md:text-lg font-medium text-stone-800 mb-3 md:mb-4">Cobertura</h3>
                  <div className="flex flex-wrap gap-2">
                    {toppings.map((topping) => (
                      <button
                        key={topping.id}
                        onClick={() => setSelectedTopping(topping.id)}
                        className={`px-3 py-2 md:px-4 md:py-2.5 border rounded-lg transition-all cursor-pointer ${
                          selectedTopping === topping.id
                            ? 'border-rose-500 bg-rose-50 text-rose-600'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-medium text-xs md:text-sm">{topping.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-base md:text-lg font-medium text-stone-800 mb-3 md:mb-4">Acompanhamentos</h3>
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
                        className={`px-3 py-2 md:px-4 md:py-2.5 border rounded-lg transition-all cursor-pointer ${
                          selectedExtras.includes(extra.id)
                            ? 'border-rose-500 bg-rose-50 text-rose-600'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-medium text-xs md:text-sm">{extra.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 md:p-4 bg-stone-50 rounded-lg md:rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-stone-800 text-sm md:text-base">Cobertura Extra</div>
                      <div className="text-xs md:text-sm text-stone-500">+ R$ 2,00</div>
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

                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-b border-stone-100 gap-4">
                  <div>
                    <div className="font-medium text-stone-800 mb-3 text-sm md:text-base">Quantidade</div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-lg border border-stone-300 flex items-center justify-center hover:bg-stone-100 transition-colors cursor-pointer"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-medium text-2xl text-stone-800 min-w-8 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-10 h-10 rounded-lg border border-stone-300 flex items-center justify-center hover:bg-stone-100 transition-colors cursor-pointer"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-center sm:text-right">
                    {!selectedSize ? (
                      <div className="text-stone-500">
                        <div className="text-sm mb-2">Selecione um tamanho</div>
                        <div className="text-2xl md:text-3xl font-light text-stone-400">R$ 0,00</div>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-stone-500 mb-1">Valor unitário</div>
                        <div className="text-lg md:text-xl font-light text-stone-700 mb-2">
                          R$ {formatPrice(calculatePrice(true))}
                        </div>
                        <div className="text-sm text-stone-500 mb-1">Valor total</div>
                        <div className="text-2xl md:text-3xl font-light text-rose-600">
                          R$ {formatPrice(calculatePrice(true) * quantity)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 md:mt-8 pt-4 md:pt-6 flex flex-col sm:flex-row justify-end gap-3 md:gap-4 border-t border-stone-100">
                <button
                  onClick={() => {
                    setCustomizingProduct(null);
                    resetCustomization();
                  }}
                  className="px-6 py-3 text-stone-600 rounded-lg font-medium hover:bg-stone-100 transition-colors cursor-pointer order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => addToCart(customizingProduct, true)}
                  disabled={!selectedSize}
                  className={`px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2 transition-colors ${
                    selectedSize
                      ? 'bg-stone-800 text-white hover:bg-stone-700'
                      : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Adicionar ao Carrinho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
};

export default ProductsPage;