import { useState, useEffect } from 'react';
import { Truck, MapPin, Plus, Trash2, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../axiosInstance';

interface DeliveryRange {
  id?: string;
  minKm: number;
  maxKm: number;
  price: number;
}

interface DeliveryConfig {
  id?: string;
  originCep: string;
  originAddress: string;
  originNumber: string;
  originNeighborhood: string;
  originCity: string;
  originState: string;
  originLat?: number;
  originLng?: number;
  delivery_ranges: DeliveryRange[];
}

const ConfigFrete = () => {
  const [config, setConfig] = useState<DeliveryConfig>({
    originCep: '49141-048',
    originAddress: 'Avenida Governador Marcelo Déda',
    originNumber: '520',
    originNeighborhood: 'Costa Paradiso',
    originCity: 'Barra dos Coqueiros',
    originState: 'SE',
    delivery_ranges: [
      { minKm: 0, maxKm: 2, price: 0 },
      { minKm: 2, maxKm: 4, price: 5 },
      { minKm: 4, maxKm: 6, price: 8 },
      { minKm: 6, maxKm: 10, price: 12 },
    ]
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testCep, setTestCep] = useState('');
  const [testResult, setTestResult] = useState<{ distance?: number; price?: number; message?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/delivery/config');
      
      if (response.data.config) {
        const existingConfig = response.data.config;
        setConfig({
          id: existingConfig.id,
          originCep: existingConfig.originCep || '',
          originAddress: existingConfig.originAddress || '',
          originNumber: existingConfig.originNumber || '',
          originNeighborhood: existingConfig.originNeighborhood || '',
          originCity: existingConfig.originCity || '',
          originState: existingConfig.originState || '',
          originLat: existingConfig.originLat,
          originLng: existingConfig.originLng,
          delivery_ranges: existingConfig.delivery_ranges?.length > 0 
            ? existingConfig.delivery_ranges.map((r: any) => ({
                id: r.id,
                minKm: Number(r.minKm),
                maxKm: Number(r.maxKm),
                price: Number(r.price)
              }))
            : [{ minKm: 0, maxKm: 2, price: 0 }]
        });
      }
    } catch (error) {
      console.error('Erro ao carregar config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setMessage(null);

      // Validações
      if (!config.originCep || !config.originAddress || !config.originCity || !config.originState) {
        setMessage({ type: 'error', text: 'Preencha todos os campos de endereço' });
        return;
      }

      if (config.delivery_ranges.length === 0) {
        setMessage({ type: 'error', text: 'Adicione pelo menos uma faixa de preço' });
        return;
      }

      // Validar faixas - não permitir minKm >= maxKm
      for (const range of config.delivery_ranges) {
        if (range.minKm >= range.maxKm) {
          setMessage({ type: 'error', text: `Faixa inválida: mínimo (${range.minKm}km) deve ser menor que máximo (${range.maxKm}km)` });
          return;
        }
      }

      const response = await api.post('/delivery/config', {
        originCep: config.originCep,
        originAddress: config.originAddress,
        originNumber: config.originNumber,
        originNeighborhood: config.originNeighborhood,
        originCity: config.originCity,
        originState: config.originState,
        ranges: config.delivery_ranges
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        setConfig(prev => ({
          ...prev,
          id: response.data.config.id,
          originLat: response.data.config.originLat,
          originLng: response.data.config.originLng
        }));
      }
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Erro ao salvar configurações' });
    } finally {
      setIsSaving(false);
    }
  };

  const addRange = () => {
    const lastRange = config.delivery_ranges[config.delivery_ranges.length - 1];
    const newMin = lastRange ? lastRange.maxKm : 0;
    
    setConfig(prev => ({
      ...prev,
      delivery_ranges: [
        ...prev.delivery_ranges,
        { minKm: newMin, maxKm: newMin + 2, price: 0 }
      ]
    }));
  };

  const removeRange = (index: number) => {
    if (config.delivery_ranges.length <= 1) return;
    
    setConfig(prev => ({
      ...prev,
      delivery_ranges: prev.delivery_ranges.filter((_, i) => i !== index)
    }));
  };

  const updateRange = (index: number, field: keyof DeliveryRange, value: number) => {
    setConfig(prev => ({
      ...prev,
      delivery_ranges: prev.delivery_ranges.map((range, i) => 
        i === index ? { ...range, [field]: value } : range
      )
    }));
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 5) {
      return numbers;
    } else {
      return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    }
  };

  const handleCepBlur = async (cep: string) => {
    const cepClean = cep.replace(/\D/g, '');
    if (cepClean.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setConfig(prev => ({
            ...prev,
            originAddress: data.logradouro || prev.originAddress,
            originNeighborhood: data.bairro || prev.originNeighborhood,
            originCity: data.localidade || prev.originCity,
            originState: data.uf || prev.originState
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const testDelivery = async () => {
    if (!testCep || testCep.replace(/\D/g, '').length !== 8) {
      setTestResult({ message: 'Digite um CEP válido' });
      return;
    }

    try {
      setIsTesting(true);
      const response = await api.post('/delivery/calculate', { cep: testCep });
      
      if (response.data.success) {
        setTestResult({
          distance: response.data.distance,
          price: response.data.deliveryPrice,
          message: response.data.message
        });
      }
    } catch (error: any) {
      setTestResult({ message: error.response?.data?.error || 'Erro ao calcular frete' });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-rose-100 rounded-xl">
          <Truck className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Configuração de Frete</h1>
          <p className="text-stone-500">Configure o endereço de origem e as faixas de preço por distância</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Endereço de Origem */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-rose-600" />
          <h2 className="text-lg font-bold text-stone-900">Endereço de Origem</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">CEP *</label>
            <input
              type="text"
              value={config.originCep}
              onChange={(e) => setConfig(prev => ({ ...prev, originCep: formatCEP(e.target.value) }))}
              onBlur={() => handleCepBlur(config.originCep)}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="00000-000"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">Endereço *</label>
            <input
              type="text"
              value={config.originAddress}
              onChange={(e) => setConfig(prev => ({ ...prev, originAddress: e.target.value }))}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Rua, Avenida..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Número</label>
            <input
              type="text"
              value={config.originNumber}
              onChange={(e) => setConfig(prev => ({ ...prev, originNumber: e.target.value }))}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Bairro</label>
            <input
              type="text"
              value={config.originNeighborhood}
              onChange={(e) => setConfig(prev => ({ ...prev, originNeighborhood: e.target.value }))}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Bairro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Cidade *</label>
            <input
              type="text"
              value={config.originCity}
              onChange={(e) => setConfig(prev => ({ ...prev, originCity: e.target.value }))}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Cidade"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Estado *</label>
            <select
              value={config.originState}
              onChange={(e) => setConfig(prev => ({ ...prev, originState: e.target.value }))}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              <option value="AC">AC</option>
              <option value="AL">AL</option>
              <option value="AP">AP</option>
              <option value="AM">AM</option>
              <option value="BA">BA</option>
              <option value="CE">CE</option>
              <option value="DF">DF</option>
              <option value="ES">ES</option>
              <option value="GO">GO</option>
              <option value="MA">MA</option>
              <option value="MT">MT</option>
              <option value="MS">MS</option>
              <option value="MG">MG</option>
              <option value="PA">PA</option>
              <option value="PB">PB</option>
              <option value="PR">PR</option>
              <option value="PE">PE</option>
              <option value="PI">PI</option>
              <option value="RJ">RJ</option>
              <option value="RN">RN</option>
              <option value="RS">RS</option>
              <option value="RO">RO</option>
              <option value="RR">RR</option>
              <option value="SC">SC</option>
              <option value="SP">SP</option>
              <option value="SE">SE</option>
              <option value="TO">TO</option>
            </select>
          </div>
        </div>

        {config.originLat && config.originLng && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <strong>Coordenadas:</strong> {Number(config.originLat ?? 0).toFixed(6)}, {Number(config.originLng ?? 0).toFixed(6)}
          </div>
        )}
      </div>

      {/* Faixas de Preço */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-stone-900">Faixas de Preço por Distância</h2>
          </div>
          <button
            onClick={addRange}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Faixa
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-sm font-medium text-stone-600 px-2">
            <div className="col-span-3 md:col-span-2">De (km)</div>
            <div className="col-span-3 md:col-span-2">Até (km)</div>
            <div className="col-span-4 md:col-span-3">Preço (R$)</div>
            <div className="col-span-2 md:col-span-3">Descrição</div>
            <div className="col-span-1 md:col-span-2"></div>
          </div>

          {config.delivery_ranges.map((range, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center bg-stone-50 p-3 rounded-lg">
              <div className="col-span-3 md:col-span-2">
                <input
                  type="number"
                  value={range.minKm}
                  onChange={(e) => updateRange(index, 'minKm', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-stone-300 rounded-lg text-center"
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <input
                  type="number"
                  value={range.maxKm}
                  onChange={(e) => updateRange(index, 'maxKm', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-stone-300 rounded-lg text-center"
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="col-span-4 md:col-span-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">R$</span>
                  <input
                    type="number"
                    value={range.price}
                    onChange={(e) => updateRange(index, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 pl-10 border border-stone-300 rounded-lg"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>
              <div className="col-span-2 md:col-span-3 text-sm text-stone-600">
                {range.price === 0 ? (
                  <span className="text-green-600 font-medium">Grátis</span>
                ) : (
                  <span>Taxa: R$ {Number(range.price ?? 0).toFixed(2)}</span>
                )}
              </div>
              <div className="col-span-1 md:col-span-2 flex justify-end">
                <button
                  onClick={() => removeRange(index)}
                  disabled={config.delivery_ranges.length <= 1}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Dica:</strong> Configure faixas contínuas para evitar lacunas. 
            Exemplo: 0-2km, 2-4km, 4-6km... 
            Distâncias além da última faixa usarão o último preço configurado.
          </p>
        </div>
      </div>

      {/* Teste de Frete */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="text-lg font-bold text-stone-900 mb-4">Testar Cálculo de Frete</h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={testCep}
              onChange={(e) => setTestCep(formatCEP(e.target.value))}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Digite um CEP para testar..."
            />
          </div>
          <button
            onClick={testDelivery}
            disabled={isTesting}
            className="px-6 py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculando...
              </>
            ) : (
              'Calcular Frete'
            )}
          </button>
        </div>

        {testResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            testResult.price !== undefined 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-amber-50 border border-amber-200'
          }`}>
            {testResult.distance !== undefined && (
              <p className="text-stone-800">
                <strong>Distância:</strong> {Number(testResult.distance ?? 0).toFixed(2)} km
              </p>
            )}
            {testResult.price !== undefined && (
              <p className="text-stone-800 mt-1">
                <strong>Taxa de Entrega:</strong> {testResult.price === 0 ? (
                  <span className="text-green-600 font-bold">GRÁTIS!</span>
                ) : (
                  <span className="font-bold">R$ {Number(testResult.price ?? 0).toFixed(2)}</span>
                )}
              </p>
            )}
            {testResult.message && (
              <p className="text-sm text-stone-600 mt-1">{testResult.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salvar Configurações
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ConfigFrete;
