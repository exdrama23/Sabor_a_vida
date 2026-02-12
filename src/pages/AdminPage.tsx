import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, Edit } from 'lucide-react';
import HeaderFixo from '../components/HeaderFixo';
import type { Product } from '../types';
import { getProductImageUrl } from '../types';
import api from '../axiosInstance';

interface AdminPageProps {
  products: Product[];
  setProducts: (p: Product[]) => void;
}

const AdminPage = ({ products, setProducts }: AdminPageProps) => {
  console.log(products)
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('chocolate');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [featured, setFeatured] = useState(false);
  const [size, setSize] = useState<'PEQUENO' | 'MEDIO' | 'GRANDE'>('PEQUENO');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File>();
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCategory('chocolate');
    setSize('PEQUENO');
    setPrice('');
    setImage('');
    setImageFile(undefined);
    setFeatured(false);
    setDescription('');
    setMessage('');
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setCategory(product.category ?? 'chocolate');
    setPrice(String(product.price));
    setSize(product.size ?? 'PEQUENO');
    setDescription(product.description ?? '');
    setFeatured(!!product.featured);
    setImage(getProductImageUrl(product.id));
    setImageFile(undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async(e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !price.trim()) {
      setMessage(' Nome e preço são obrigatórios');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('featured', featured?'true':'false');
    formData.append('size', size);
    if(description) formData.append('description', description);

    // For creation, allow image URL fallback; for editing, only send file if provided
    if (imageFile) {
      formData.append('image_file', imageFile);
    } else if (!editingId && image) {
      formData.append('image', image);
    }

    try {
      if (editingId) {
        const response = await api.put(`/product/${editingId}`, formData) as {data: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          price: string;
          featured: boolean;
          image: string;
          size?: 'PEQUENO' | 'MEDIO' | 'GRANDE';
        }};
        const {data} = response;
        setProducts(products.map(p => p.id === editingId ? {...data, price: Number(data.price), description: data.description ?? '', size: data.size ?? size} : p));
        setMessage(' Produto atualizado com sucesso!');
        resetForm();
      } else {
        const response = await api.post('/product', formData) as {data: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          price: string;
          featured: boolean;
          image: string;
          size?: 'PEQUENO' | 'MEDIO' | 'GRANDE';
        }};
        const {data} = response;
        setProducts([ {...data, price: Number(data.price), description: data.description ?? '', size: data.size ?? size}, ...products]);
        setMessage(' Produto adicionado com sucesso!');

        setName('');
        setCategory('chocolate');
        setSize('PEQUENO');
        setPrice('');
        setImage('');
        setFeatured(false);
        setDescription('');

        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error('Erro ao cadastrar/atualizar produto:', err)
    }
  };

  const handleDelete = async (id: string) => {
    const prods = products;
    setProducts(prods.filter((p) => p.id !== id));
    try {
      await api.delete(`/product/${id}`)
    } catch (err) {
      console.log('Erro ao deletar produto', err)
      setProducts(prods);
    }
  };

  return (
    <>
      <HeaderFixo />
      <div className="pt-32 pb-16 px-6 bg-stone-50 min-h-screen">
      <div className="container mx-auto max-w-6xl">
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-8 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-stone-200">
              <h1 className="text-2xl font-semibold mb-6 text-stone-800">Adicionar Produto</h1>
              
              {message && (
                <div className="mb-4 p-3 rounded-lg bg-stone-100 text-sm text-stone-700">
                  {message}
                </div>
              )}

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Nome *</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-stone-200 px-3 py-2 rounded-lg focus:outline-none focus:border-rose-500"
                    placeholder="Ex: Vulcão de Chocolate"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1">Categoria *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-stone-200 px-3 py-2 rounded-lg focus:outline-none focus:border-rose-500"
                    >
                      <option value="chocolate">Chocolates</option>
                      <option value="frutas">Frutas</option>
                      <option value="especiais">Especiais</option>
                      <option value="tradicionais">Tradicionais</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1">Preço (R$) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full border border-stone-200 px-3 py-2 rounded-lg focus:outline-none focus:border-rose-500"
                      placeholder="99.90"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Tamanho</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value as 'PEQUENO' | 'MEDIO' | 'GRANDE')}
                    className="w-full border border-stone-200 px-3 py-2 rounded-lg focus:outline-none focus:border-rose-500"
                  >
                    <option value="PEQUENO">Pequeno</option>
                    <option value="MEDIO">Médio</option>
                    <option value="GRANDE">Grande</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Imagem</label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full border border-stone-200 px-3 py-2 rounded-lg focus:outline-none focus:border-rose-500"
                    />
                    <input
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      className="w-full border border-stone-200 px-3 py-2 rounded-lg focus:outline-none focus:border-rose-500"
                      placeholder="Ou cole uma URL..."
                    />
                    {image && (
                      <div className="mt-2">
                        <img
                          src={image}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Descrição</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-stone-200 px-3 py-2 rounded-lg focus:outline-none focus:border-rose-500 resize-none"
                    rows={3}
                    placeholder="Descreva o produto..."
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-stone-600">Destaque</span>
                </label>

                <div className="flex gap-3 pt-4">
                  {editingId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 px-4 py-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors font-medium cursor-pointer"
                    >
                      Cancelar edição
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('/products')}
                      className="flex-1 px-4 py-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}

                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
                  >
                    {editingId ? 'Salvar alterações' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-stone-200">
              <h2 className="text-2xl font-semibold mb-6 text-stone-800">Produtos ({products.length})</h2>

              {products.length === 0 ? (
                <p className="text-center text-stone-500 py-8">Nenhum produto adicionado ainda</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <img
                        src={getProductImageUrl(product.id)}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-stone-800 truncate">{product.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-stone-500">
                          <span className="text-rose-600 font-medium">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                          <span className="text-xs bg-stone-200 px-2 py-1 rounded capitalize">
                            {product.category}
                          </span>
                          {product.size && (
                            <span className="text-xs bg-stone-200 px-2 py-1 rounded capitalize">
                              {product.size}
                            </span>
                          )}
                          {product.featured && <span className="text-xs bg-rose-100 text-rose-600 px-2 py-1 rounded"> Destaque</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-stone-100 text-stone-600 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default AdminPage;
