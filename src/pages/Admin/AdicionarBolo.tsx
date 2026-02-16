// pages/admin/AdicionarBolo.tsx
import { useState } from 'react';
import { Upload } from 'lucide-react';
import api from '../../axiosInstance';

interface BoloForm {
  name: string;
  category: string;
  price: string;
  size: 'PEQUENO' | 'MEDIO' | 'GRANDE' | '';
  description: string;
  featured: boolean;
  image: string;
}

interface AdicionarBoloProps {
  onNavigate?: (panel: string) => void;
}

const AdicionarBolo = ({ onNavigate }: AdicionarBoloProps) => {
  const [formData, setFormData] = useState<BoloForm>({
    name: '',
    category: 'chocolate',
    price: '',
    size: '',
    description: '',
    featured: false,
    image: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price.trim()) {
      setMessage('Nome e preço são obrigatórios');
      return;
    }

    if (!formData.size) {
      setMessage('Tamanho é obrigatório');
      return;
    }

    if (!imageFile) {
      setMessage('Imagem é obrigatória');
      return;
    }

    setLoading(true);
    const submitData = new FormData();
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== '' && key !== 'image') {
        submitData.append(key, String(value));
      }
    });
    
    if (imageFile) {
      submitData.append('image_file', imageFile);
    } else if (formData.image) {
      submitData.append('image', formData.image);
    }

    try {
      await api.post('/product', submitData);
      setMessage('✅ Produto adicionado com sucesso!');
      setTimeout(() => {
        setFormData({
          name: '',
          category: 'chocolate',
          price: '',
          size: '',
          description: '',
          featured: false,
          image: '',
        });
        setImageFile(null);
        setPreview('');
        setMessage('');
        if (onNavigate) {
          onNavigate('lista');
        }
      }, 2000);
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      setMessage('❌ Erro ao adicionar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-stone-200 p-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">Adicionar Novo Bolo</h1>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Nome do Bolo *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Ex: Vulcão de Chocolate"
            />
          </div>

          {/* Categoria e Preço */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Categoria *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              >
                <option value="chocolate">Chocolate</option>
                <option value="frutas">Frutas</option>
                <option value="especiais">Especiais</option>
                <option value="tradicionais">Tradicionais</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Preço (R$) *
              </label>
              <input
                type="number"
                name="price"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                placeholder="99.90"
              />
            </div>
          </div>

          {/* Tamanho */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Tamanho
            </label>
            <select
              name="size"
              value={formData.size}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500"
            >
              <option value="">Selecione o tamanho</option>
              <option value="PEQUENO">Pequeno</option>
              <option value="MEDIO">Médio</option>
              <option value="GRANDE">Grande</option>
            </select>
          </div>

          {/* Imagem */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Imagem do Bolo
            </label>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex items-center gap-2 text-rose-600 hover:text-rose-700"
                >
                  <Upload className="w-5 h-5" />
                  Escolher arquivo
                </label>
                <p className="text-sm text-stone-500 mt-2">ou arraste e solte</p>
              </div>

              <input
                type="text"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                placeholder="Ou cole uma URL da imagem..."
              />

              {preview && (
                <div className="mt-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Descrição
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 resize-none"
              placeholder="Descreva os detalhes do bolo..."
            />
          </div>

          {/* Destaque */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="featured"
              checked={formData.featured}
              onChange={handleInputChange}
              className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
            />
            <span className="text-stone-700">Marcar como produto em destaque</span>
          </label>

          {/* Botões */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => onNavigate?.('dashboard')}
              className="flex-1 px-6 py-3 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Adicionar Bolo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarBolo;