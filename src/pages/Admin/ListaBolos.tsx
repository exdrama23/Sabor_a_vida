// pages/admin/ListaBolos.tsx
import { useState, useEffect } from 'react';
import { Edit, Trash2, Search } from 'lucide-react';
import api from '../../axiosInstance';
import { getProductImageUrl } from '../../types';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  size?: 'PEQUENO' | 'MEDIO' | 'GRANDE';
  featured: boolean;
  description?: string;
}

interface ListaBolosProps {
  onNavigate?: (panel: string) => void;
}

const ListaBolos = ({ onNavigate }: ListaBolosProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/product');
      setProducts(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/product/${id}`);
      setProducts(products.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
    }
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      chocolate: 'Chocolate',
      frutas: 'Frutas',
      especiais: 'Especiais',
      tradicionais: 'Tradicionais',
    };
    return categories[category] || category;
  };

  const getSizeLabel = (size?: string) => {
    const sizes: Record<string, string> = {
      PEQUENO: 'Pequeno',
      MEDIO: 'Médio',
      GRANDE: 'Grande',
    };
    return size ? sizes[size] : '';
  };

  return (
    <div>
      <div className="bg-white rounded-2xl border border-stone-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-stone-800">Lista de Bolos</h1>
          <button
            onClick={() => onNavigate?.('adicionar')}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            + Novo Bolo
          </button>
        </div>

        {/* Busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar bolos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
            <p className="text-stone-500 mt-4">Carregando produtos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-500">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-4 px-4 text-stone-600 font-medium">Imagem</th>
                  <th className="text-left py-4 px-4 text-stone-600 font-medium">Nome</th>
                  <th className="text-left py-4 px-4 text-stone-600 font-medium">Categoria</th>
                  <th className="text-left py-4 px-4 text-stone-600 font-medium">Tamanho</th>
                  <th className="text-left py-4 px-4 text-stone-600 font-medium">Preço</th>
                  <th className="text-left py-4 px-4 text-stone-600 font-medium">Status</th>
                  <th className="text-left py-4 px-4 text-stone-600 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-4 px-4">
                      <img
                        src={getProductImageUrl(product.id)}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    </td>
                    <td className="py-4 px-4 font-medium text-stone-800">{product.name}</td>
                    <td className="py-4 px-4 text-stone-600">{getCategoryLabel(product.category)}</td>
                    <td className="py-4 px-4 text-stone-600">{getSizeLabel(product.size) || '-'}</td>
                    <td className="py-4 px-4 font-medium text-rose-600">
                      `R$ ${product.price.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    </td>
                    <td className="py-4 px-4">
                      {product.featured && (
                        <span className="px-2 py-1 text-xs bg-rose-100 text-rose-600 rounded-full">
                          Destaque
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigate?.(`editar:${product.id}`)}
                          className="p-2 hover:bg-stone-100 text-stone-600 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        {deleteConfirm === product.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-xs bg-stone-200 text-stone-600 rounded hover:bg-stone-300"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(product.id)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaBolos;