import { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  CreditCard, 
  CheckCircle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import type { 
  CheckoutModalProps, 
  CheckoutFormData,
  CustomerData,
  AddressData,
  PaymentMethodData,
  CreditCardData 
} from '../types';
import api from '../axiosInstance';
import { tokenizeCard } from '../lib/mercadopago';

const CheckoutModal = ({ 
  isOpen, 
  onClose, 
  cartItems, 
  subtotal, 
  delivery, 
  total,
  onConfirmPayment 
}: CheckoutModalProps) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [customerData, setCustomerData] = useState<CustomerData>({
    nomeCompleto: '',
    telefone: '',
    email: '',
    cpf: ''
  });

  const [addressData, setAddressData] = useState<AddressData>({
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    pontoReferencia: '',
    tipoEndereco: 'casa',
    observacoes: ''
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData>({
    metodo: 'whatsapp',
    cartao: undefined
  });

  const [cardData, setCardData] = useState<CreditCardData>({
    tipoCartao: 'visa',
    nomeTitular: '',
    numeroCartao: '',
    validade: '',
    cvv: '',
    parcelas: 1
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Gerar mensagem para WhatsApp
  const generateWhatsAppMessage = () => {
    const itemsList = cartItems.map(item => 
      `• ${item.name} - Qtd: ${item.quantity} x R$ ${item.price.toFixed(2)} = R$ ${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const message = `
*NOVO PEDIDO - Sabor à Vida*

*DADOS PESSOAIS*
Nome: ${customerData.nomeCompleto}
Telefone: ${customerData.telefone}
Email: ${customerData.email}
CPF: ${customerData.cpf}

*ENDEREÇO DE ENTREGA*
Rua: ${addressData.rua}, ${addressData.numero}
${addressData.complemento ? `Complemento: ${addressData.complemento}\n` : ''}Bairro: ${addressData.bairro}
Cidade: ${addressData.cidade}/${addressData.estado}
CEP: ${addressData.cep}
Tipo: ${addressData.tipoEndereco}
${addressData.pontoReferencia ? `Ponto de Referência: ${addressData.pontoReferencia}\n` : ''}${addressData.observacoes ? `Observações: ${addressData.observacoes}\n` : ''}

*ITENS DO PEDIDO*
${itemsList}

*RESUMO DO PAGAMENTO*
Subtotal: R$ ${subtotal.toFixed(2)}
Entrega: R$ ${delivery.toFixed(2)}
*TOTAL: R$ ${total.toFixed(2)}*

Aguardando confirmação!
    `.trim();

    return message;
  };

  const sendToWhatsApp = async () => {
    setIsSubmitting(true);
    setPaymentError(null);
    
    try {
      if (!validateStep1() || !validateStep2()) {
        setIsSubmitting(false);
        return;
      }

      const message = generateWhatsAppMessage();
      const encodedMessage = encodeURIComponent(message);
      const whatsappNumber = '5579981468281'; // Com +55
      
      let whatsappUrl: string;
      
      if (isMobile()) {
        // Mobile
        whatsappUrl = `whatsapp://send?phone=${whatsappNumber}&text=${encodedMessage}`;
      } else {
        // Desktop
        whatsappUrl = `https://web.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMessage}`;
      }

      const formData: CheckoutFormData = {
        etapa1: customerData,
        etapa2: addressData,
        etapa3: {
          metodo: 'whatsapp',
          cartao: undefined
        }
      };

      onConfirmPayment(formData);

      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        setTimeout(() => {
          onClose();
        }, 500);
      }, 500);
    } catch (error) {
      console.error('Erro ao enviar para WhatsApp:', error);
      setPaymentError('Erro ao preparar mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!customerData.nomeCompleto.trim()) {
      newErrors.nomeCompleto = 'Nome completo é obrigatório';
    }
    
    if (!customerData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (!/^\(\d{2}\)\s\d{5}-\d{4}$/.test(customerData.telefone.trim())) {
      newErrors.telefone = 'Formato inválido. Use (99) 99999-9999';
    }
    
    if (!customerData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(customerData.email.trim())) {
      newErrors.email = 'E-mail inválido';
    }
    
    if (!customerData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(customerData.cpf.trim())) {
      newErrors.cpf = 'Formato inválido. Use 000.000.000-00';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!addressData.cep.trim()) {
      newErrors.cep = 'CEP é obrigatório';
    } else if (!/^\d{5}-\d{3}$/.test(addressData.cep.trim())) {
      newErrors.cep = 'Formato inválido. Use 00000-000';
    }
    
    if (!addressData.rua.trim()) {
      newErrors.rua = 'Rua é obrigatória';
    }
    
    if (!addressData.numero.trim()) {
      newErrors.numero = 'Número é obrigatório';
    }
    
    if (!addressData.bairro.trim()) {
      newErrors.bairro = 'Bairro é obrigatório';
    }
    
    if (!addressData.cidade.trim()) {
      newErrors.cidade = 'Cidade é obrigatória';
    }
    
    if (!addressData.estado.trim()) {
      newErrors.estado = 'Estado é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    if (paymentMethod.metodo === 'whatsapp' || paymentMethod.metodo === 'pix') {
      return true; 
    }
    
    const newErrors: Record<string, string> = {};
    
    if (!cardData.nomeTitular.trim()) {
      newErrors.nomeTitular = 'Nome no cartão é obrigatório';
    }
    
    if (!cardData.numeroCartao.trim()) {
      newErrors.numeroCartao = 'Número do cartão é obrigatório';
    } else if (!/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(cardData.numeroCartao.trim())) {
      newErrors.numeroCartao = 'Formato inválido. Use 0000 0000 0000 0000';
    }
    
    if (!cardData.validade.trim()) {
      newErrors.validade = 'Validade é obrigatória';
    } else if (!/^\d{2}\/\d{2}$/.test(cardData.validade.trim())) {
      newErrors.validade = 'Formato inválido. Use MM/AA';
    }
    
    if (!cardData.cvv.trim()) {
      newErrors.cvv = 'CVV é obrigatório';
    } else if (!/^\d{3,4}$/.test(cardData.cvv.trim())) {
      newErrors.cvv = 'CVV inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    let isValid = false;
    
    switch(currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
    }
    
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setPaymentError(null);
    
    try {
      const formData: CheckoutFormData = {
        etapa1: customerData,
        etapa2: addressData,
        etapa3: {
          ...paymentMethod,
          cartao: paymentMethod.metodo === 'cartao' ? cardData : undefined
        }
      };

      if (paymentMethod.metodo === 'whatsapp') {
        await sendToWhatsApp();
        return;
      } else if (paymentMethod.metodo === 'pix') {
        const pixPaymentData = {
          amount: total,
          description: 'Compra de produtos - Sabor à Vida',
          payer: {
            email: customerData.email,
            firstName: customerData.nomeCompleto.split(' ')[0],
            lastName: customerData.nomeCompleto.split(' ').slice(1).join(' '),
            cpf: customerData.cpf
          },
          externalReference: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        const pixResponse = await api.post('/payment/pix', pixPaymentData);
        
        if (pixResponse.data.success) {
          console.log('Pix gerado com sucesso:', pixResponse.data);
          
          onConfirmPayment(formData);
          
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          throw new Error(pixResponse.data.error || 'Erro ao gerar Pix');
        }
      } else {
        try {
          const tokenResponse = await tokenizeCard({
            number: cardData.numeroCartao.replace(/\s/g, ''),
            name: cardData.nomeTitular,
            expiration_month: parseInt(cardData.validade.split('/')[0]),
            expiration_year: parseInt(cardData.validade.split('/')[1]),
            security_code: cardData.cvv
          });

          const cardToken = tokenResponse?.id || tokenResponse?.token;
          
          if (!cardToken) {
            throw new Error('Falha ao obter token do cartão');
          }

          const cardPaymentData = {
            amount: total,
            token: cardToken,
            cardType: cardData.tipoCartao,
            cardHolder: cardData.nomeTitular,
            installments: cardData.parcelas,
            description: 'Compra de produtos - Sabor à Vida',
            payer: {
              email: customerData.email,
              firstName: customerData.nomeCompleto.split(' ')[0],
              lastName: customerData.nomeCompleto.split(' ').slice(1).join(' '),
              cpf: customerData.cpf
            }
          };

          const cardResponse = await api.post('/payment/card', cardPaymentData);
          
          if (cardResponse.data.success) {
            console.log('Cartão processado com sucesso:', cardResponse.data);
            
            onConfirmPayment(formData);
            
            setTimeout(() => {
              onClose();
            }, 1500);
          } else {
            throw new Error(cardResponse.data.error || 'Erro ao processar pagamento com cartão');
          }
        } catch (tokenError) {
          console.error('Erro ao tokenizar cartão:', tokenError);
          const errorMsg = tokenError instanceof Error ? tokenError.message : 'Erro ao processar cartão. Verifique os dados e tente novamente.';
          throw new Error(errorMsg);
        }
      }
    } catch (error) {
      console.error('Erro no pagamento:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as any)?.response?.data?.error || 'Erro ao processar pagamento. Tente novamente.';
      
      setPaymentError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCepBlur = async () => {
    const cepClean = addressData.cep.replace(/\D/g, '');
    if (cepClean.length === 8) {
      try {
        console.log('Buscando CEP:', cepClean);
        const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
        const data = await response.json();
        console.log('Resposta da API:', data);
        
        if (!data.erro) {
          setAddressData(prev => ({
            ...prev,
            rua: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          }));
          console.log('Endereço atualizado com sucesso');
        } else {
          console.error('CEP não encontrado');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  useEffect(() => {
    const cepClean = addressData.cep.replace(/\D/g, '');
    if (cepClean.length === 8) {
      handleCepBlur();
    }
  }, [addressData.cep, handleCepBlur]);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    } else if (numbers.length <= 9) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    } else {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 5) {
      return numbers;
    } else {
      return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    }
  };

  const formatCreditCard = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .slice(0, 19);
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 4) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1/$2')
        .slice(0, 5);
    }
    return numbers.slice(0, 4);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="sticky top-0 z-10 bg-white border-b border-stone-200 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-stone-900">Finalizar Compra</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-6 h-6 text-stone-500" />
              </button>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center justify-between">
                {[
                  { number: 1, label: 'Dados', icon: User },
                  { number: 2, label: 'Endereço', icon: MapPin },
                  { number: 3, label: 'Pagamento', icon: CreditCard },
                  { number: 4, label: 'Confirmação', icon: CheckCircle }
                ].map((step, index) => (
                  <div key={step.number} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${currentStep >= step.number 
                          ? 'bg-rose-600 text-white' 
                          : 'bg-stone-100 text-stone-400'
                        }
                        ${currentStep === step.number ? 'ring-4 ring-rose-100' : ''}
                      `}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <span className="mt-2 text-sm font-medium text-stone-600">
                        {step.label}
                      </span>
                    </div>
                    
                    {index < 3 && (
                      <div className={`
                        w-16 h-1 mx-4
                        ${currentStep > step.number 
                          ? 'bg-rose-600' 
                          : 'bg-stone-200'
                        }
                      `} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
            {paymentError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex gap-3">
                  <div className="shrink-0">
                    <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Erro no pagamento</h3>
                    <p className="mt-1 text-sm text-red-700">{paymentError}</p>
                    <button 
                      onClick={() => setPaymentError(null)}
                      className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                    >
                      Fechar mensagem
                    </button>
                  </div>
                </div>
              </div>
            )}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-stone-900">Dados do Destinatário</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Nome completo *
                    </label>
                    <input
                      type="text"
                      value={customerData.nomeCompleto}
                      onChange={(e) => setCustomerData({...customerData, nomeCompleto: e.target.value})}
                      className={`w-full p-3 border rounded-lg ${
                        errors.nomeCompleto ? 'border-red-500' : 'border-stone-300'
                      }`}
                      placeholder="Digite seu nome completo"
                    />
                    {errors.nomeCompleto && (
                      <p className="mt-1 text-sm text-red-600">{errors.nomeCompleto}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="text"
                      value={customerData.telefone}
                      onChange={(e) => setCustomerData({...customerData, telefone: formatPhone(e.target.value)})}
                      className={`w-full p-3 border rounded-lg ${
                        errors.telefone ? 'border-red-500' : 'border-stone-300'
                      }`}
                      placeholder="(00) 00000-0000"
                    />
                    {errors.telefone && (
                      <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                      className={`w-full p-3 border rounded-lg ${
                        errors.email ? 'border-red-500' : 'border-stone-300'
                      }`}
                      placeholder="seu@email.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      CPF *
                    </label>
                    <input
                      type="text"
                      value={customerData.cpf}
                      onChange={(e) => setCustomerData({...customerData, cpf: formatCPF(e.target.value)})}
                      className={`w-full p-3 border rounded-lg ${
                        errors.cpf ? 'border-red-500' : 'border-stone-300'
                      }`}
                      placeholder="000.000.000-00"
                    />
                    {errors.cpf && (
                      <p className="mt-1 text-sm text-red-600">{errors.cpf}</p>
                    )}
                    <p className="mt-1 text-sm text-stone-500">
                      Necessário para emissão da nota fiscal
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-stone-900">Endereço de Entrega</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      CEP *
                    </label>
                    <input
                      type="text"
                      value={addressData.cep}
                      onChange={(e) => setAddressData({...addressData, cep: formatCEP(e.target.value)})}
                      onBlur={handleCepBlur}
                      className={`w-full p-3 border rounded-lg ${
                        errors.cep ? 'border-red-500' : 'border-stone-300'
                      }`}
                      placeholder="00000-000"
                    />
                    {errors.cep && (
                      <p className="mt-1 text-sm text-red-600">{errors.cep}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Rua / Avenida *
                    </label>
                    <input
                      type="text"
                      value={addressData.rua}
                      readOnly
                      className={`w-full p-3 border rounded-lg bg-stone-100 cursor-not-allowed ${
                        errors.rua ? 'border-red-500' : 'border-stone-300'
                      }`}
                      placeholder="Nome da rua"
                    />
                    {errors.rua && (
                      <p className="mt-1 text-sm text-red-600">{errors.rua}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Número *
                    </label>
                    <input
                      type="text"
                      value={addressData.numero}
                      onChange={(e) => setAddressData({...addressData, numero: e.target.value})}
                      className={`w-full p-3 border rounded-lg ${
                        errors.numero ? 'border-red-500' : 'border-stone-300'
                      }`}
                      placeholder="123"
                    />
                    {errors.numero && (
                      <p className="mt-1 text-sm text-red-600">{errors.numero}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={addressData.complemento}
                      onChange={(e) => setAddressData({...addressData, complemento: e.target.value})}
                      className="w-full p-3 border border-stone-300 rounded-lg"
                      placeholder="Apto, bloco, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Bairro *
                    </label>
                    <input
                      type="text"
                      value={addressData.bairro}
                      readOnly
                      className={`w-full p-3 border rounded-lg bg-stone-100 cursor-not-allowed ${
                        errors.bairro ? 'border-red-500' : 'border-stone-300'
                      }`}
                      placeholder="Seu bairro"
                    />
                    {errors.bairro && (
                      <p className="mt-1 text-sm text-red-600">{errors.bairro}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={addressData.cidade}
                      readOnly
                      className={`w-full p-3 border rounded-lg bg-stone-100 cursor-not-allowed ${
                        errors.cidade ? 'border-red-500' : 'border-stone-300'
                      }`}
                      placeholder="Sua cidade"
                    />
                    {errors.cidade && (
                      <p className="mt-1 text-sm text-red-600">{errors.cidade}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Estado (UF) *
                    </label>
                    <select
                      value={addressData.estado}
                      disabled
                      className={`w-full p-3 border rounded-lg bg-stone-100 cursor-not-allowed ${
                        errors.estado ? 'border-red-500' : 'border-stone-300'
                      }`}
                    >
                      <option value="">Selecione</option>
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
                    {errors.estado && (
                      <p className="mt-1 text-sm text-red-600">{errors.estado}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Ponto de referência
                    </label>
                    <input
                      type="text"
                      value={addressData.pontoReferencia}
                      onChange={(e) => setAddressData({...addressData, pontoReferencia: e.target.value})}
                      className="w-full p-3 border border-stone-300 rounded-lg"
                      placeholder="Próximo a..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Tipo de endereço
                    </label>
                    <select
                      value={addressData.tipoEndereco}
                      onChange={(e) => setAddressData({...addressData, tipoEndereco: e.target.value as any})}
                      className="w-full p-3 border border-stone-300 rounded-lg"
                    >
                      <option value="casa">Casa</option>
                      <option value="apartamento">Apartamento</option>
                      <option value="trabalho">Trabalho</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Observações para entrega
                    </label>
                    <textarea
                      value={addressData.observacoes}
                      onChange={(e) => setAddressData({...addressData, observacoes: e.target.value})}
                      className="w-full p-3 border border-stone-300 rounded-lg"
                      rows={3}
                      placeholder="Instruções especiais para a entrega..."
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-stone-900">Método de Pagamento</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => setPaymentMethod({...paymentMethod, metodo: 'whatsapp'})}
                        className={`p-6 border-2 rounded-xl text-left transition-all cursor-pointer ${
                          paymentMethod.metodo === 'whatsapp' 
                            ? 'border-green-600 bg-green-50' 
                            : 'border-stone-200 hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            paymentMethod.metodo === 'whatsapp' ? 'bg-green-600' : 'bg-green-100'
                          }`}>
                            <svg className={`w-6 h-6 ${
                              paymentMethod.metodo === 'whatsapp' ? 'text-white' : 'text-green-600'
                            }`} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-3.1 2.057-5.108 5.209-5.124 8.602 0 1.534.375 3.036 1.09 4.413L1.07 23.196l4.555-1.196c1.343.744 2.856 1.135 4.406 1.135 4.902 0 8.935-3.992 8.951-8.884.004-2.368-.928-4.595-2.619-6.276-1.691-1.681-3.937-2.604-6.362-2.608z"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900">WhatsApp</h4>
                            <p className="text-sm text-stone-500 mt-1">
                              Envie seus dados via WhatsApp
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setPaymentMethod({...paymentMethod, metodo: 'pix'})}
                        className={`p-6 border-2 rounded-xl text-left transition-all cursor-pointer ${
                          paymentMethod.metodo === 'pix' 
                            ? 'border-rose-600 bg-rose-50' 
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            paymentMethod.metodo === 'pix' ? 'bg-rose-600' : 'bg-stone-100'
                          }`}>
                            <CreditCard className={`w-6 h-6 ${
                              paymentMethod.metodo === 'pix' ? 'text-white' : 'text-stone-400'
                            }`} />
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900">Pix</h4>
                            <p className="text-sm text-stone-500 mt-1">
                              Pagamento instantâneo
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setPaymentMethod({...paymentMethod, metodo: 'cartao'})}
                        className={`p-6 border-2 rounded-xl text-left transition-all cursor-pointer ${
                          paymentMethod.metodo === 'cartao' 
                            ? 'border-rose-600 bg-rose-50' 
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            paymentMethod.metodo === 'cartao' ? 'bg-rose-600' : 'bg-stone-100'
                          }`}>
                            <CreditCard className={`w-6 h-6 ${
                              paymentMethod.metodo === 'cartao' ? 'text-white' : 'text-stone-400'
                            }`} />
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900">Cartão de Crédito</h4>
                            <p className="text-sm text-stone-500 mt-1">
                              Parcele em até 12x
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {paymentMethod.metodo === 'pix' && (
                    <div className="md:col-span-2">
                      <div className="bg-stone-50 border border-stone-200 rounded-xl p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-rose-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900">Pagamento via Pix</h4>
                            <p className="text-stone-600 mt-1">
                              Após a confirmação, um QR Code será gerado para pagamento instantâneo.
                              A confirmação é automática após a aprovação.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod.metodo === 'pix' && (
                    <div className="md:col-span-2">
                      <div className="bg-stone-50 border border-stone-200 rounded-xl p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-rose-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900">Pagamento via Pix</h4>
                            <p className="text-stone-600 mt-1">
                              Após a confirmação, um QR Code será gerado para pagamento instantâneo.
                              A confirmação é automática após a aprovação.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod.metodo === 'cartao' && (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Tipo do cartão
                        </label>
                        <select
                          value={cardData.tipoCartao}
                          onChange={(e) => setCardData({...cardData, tipoCartao: e.target.value})}
                          className="w-full p-3 border border-stone-300 rounded-lg"
                        >
                          <option value="visa">Visa</option>
                          <option value="mastercard">Mastercard</option>
                          <option value="elo">Elo</option>
                          <option value="amex">American Express</option>
                          <option value="hipercard">Hipercard</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Nome impresso no cartão *
                        </label>
                        <input
                          type="text"
                          value={cardData.nomeTitular}
                          onChange={(e) => setCardData({...cardData, nomeTitular: e.target.value})}
                          className={`w-full p-3 border rounded-lg ${
                            errors.nomeTitular ? 'border-red-500' : 'border-stone-300'
                          }`}
                          placeholder="Como está escrito no cartão"
                        />
                        {errors.nomeTitular && (
                          <p className="mt-1 text-sm text-red-600">{errors.nomeTitular}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Número do cartão *
                        </label>
                        <input
                          type="text"
                          value={cardData.numeroCartao}
                          onChange={(e) => setCardData({...cardData, numeroCartao: formatCreditCard(e.target.value)})}
                          className={`w-full p-3 border rounded-lg ${
                            errors.numeroCartao ? 'border-red-500' : 'border-stone-300'
                          }`}
                          placeholder="0000 0000 0000 0000"
                        />
                        {errors.numeroCartao && (
                          <p className="mt-1 text-sm text-red-600">{errors.numeroCartao}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Validade (MM/AA) *
                        </label>
                        <input
                          type="text"
                          value={cardData.validade}
                          onChange={(e) => setCardData({...cardData, validade: formatExpiry(e.target.value)})}
                          className={`w-full p-3 border rounded-lg ${
                            errors.validade ? 'border-red-500' : 'border-stone-300'
                          }`}
                          placeholder="MM/AA"
                        />
                        {errors.validade && (
                          <p className="mt-1 text-sm text-red-600">{errors.validade}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          CVV *
                        </label>
                        <input
                          type="text"
                          value={cardData.cvv}
                          onChange={(e) => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, '')})}
                          className={`w-full p-3 border rounded-lg ${
                            errors.cvv ? 'border-red-500' : 'border-stone-300'
                          }`}
                          placeholder="000"
                          maxLength={4}
                        />
                        {errors.cvv && (
                          <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-stone-700 mb-2">
                          Número de parcelas
                        </label>
                        <select
                          value={cardData.parcelas}
                          onChange={(e) => setCardData({...cardData, parcelas: parseInt(e.target.value)})}
                          className="w-full p-3 border border-stone-300 rounded-lg"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                            <option key={num} value={num}>
                              {num}x {num > 1 ? `de R$ ${(total / num).toFixed(2).replace('.', ',')}` : `(à vista)`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                          <p className="text-sm text-rose-800">
                            <strong>Importante:</strong> Os dados do cartão são processados diretamente 
                            pelo Mercado Pago. Nós não armazenamos informações sensíveis do cartão.
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {paymentMethod.metodo === 'whatsapp' && (
                    <div className="md:col-span-2">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                        <div className="flex items-start gap-4">
                          <div>
                            <h4 className="font-bold text-green-900">Pagamento via WhatsApp</h4>
                            <p className="text-green-800 mt-2 text-sm leading-relaxed">
                              Todos os seus dados serão enviados para nosso WhatsApp. 
                              Você receberá as instruções de pagamento por lá e poderemos tirar suas dúvidas em tempo real!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900">Confirmação do Pedido</h3>
                  <p className="text-stone-600 mt-2">
                    Revise todas as informações antes de confirmar o pagamento
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-bold text-stone-900 mb-4">Resumo do Pedido</h4>
                    <div className="bg-stone-50 rounded-xl p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between text-stone-600">
                          <span>Subtotal</span>
                          <span className="font-medium">
                            R$ {subtotal.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-stone-600">
                          <span>Entrega</span>
                          <span className="font-medium">
                            R$ {delivery.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        
                        <div className="border-t border-stone-200 pt-4">
                          <div className="flex justify-between text-xl font-bold text-stone-900">
                            <span>Total</span>
                            <span>R$ {total.toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-stone-200">
                        <h5 className="font-bold text-stone-900 mb-3">Itens no carrinho</h5>
                        <div className="space-y-3">
                          {cartItems.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-stone-900">
                                  {item.name}
                                </p>
                                <p className="text-sm text-stone-500">
                                  {item.quantity} × R$ {item.price.toFixed(2).replace('.', ',')}
                                </p>
                              </div>
                              <div className="font-medium">
                                R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                              </div>
                            </div>
                          ))}
                          {cartItems.length > 3 && (
                            <p className="text-sm text-stone-500 text-center">
                              + {cartItems.length - 3} outros itens
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-stone-900 mb-4">Informações de Entrega</h4>
                    <div className="bg-stone-50 rounded-xl p-6 space-y-6">
                      <div>
                        <h5 className="font-medium text-stone-700 mb-2">Destinatário</h5>
                        <p className="text-stone-900">{customerData.nomeCompleto}</p>
                        <p className="text-sm text-stone-600">{customerData.telefone}</p>
                        <p className="text-sm text-stone-600">{customerData.email}</p>
                        <p className="text-sm text-stone-600">CPF: {customerData.cpf}</p>
                      </div>

                      <div>
                        <h5 className="font-medium text-stone-700 mb-2">Endereço</h5>
                        <p className="text-stone-900">
                          {addressData.rua}, {addressData.numero}
                          {addressData.complemento && `, ${addressData.complemento}`}
                        </p>
                        <p className="text-sm text-stone-600">
                          {addressData.bairro} - {addressData.cidade}/{addressData.estado}
                        </p>
                        <p className="text-sm text-stone-600">CEP: {addressData.cep}</p>
                        {addressData.observacoes && (
                          <p className="text-sm text-stone-600 mt-2">
                            <strong>Observações:</strong> {addressData.observacoes}
                          </p>
                        )}
                      </div>

                      <div>
                        <h5 className="font-medium text-stone-700 mb-2">Pagamento</h5>
                        <p className="text-stone-900">
                          {paymentMethod.metodo === 'pix' ? 'Pix' : paymentMethod.metodo === 'cartao' ? 'Cartão de Crédito' : 'WhatsApp'}
                        </p>
                        {paymentMethod.metodo === 'cartao' && cardData && (
                          <>
                            <p className="text-sm text-stone-600">
                              {cardData.tipoCartao.toUpperCase()} •••• {cardData.numeroCartao.slice(-4)}
                            </p>
                            <p className="text-sm text-stone-600">
                              {cardData.parcelas}x de R$ {(total / cardData.parcelas).toFixed(2).replace('.', ',')}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {paymentMethod.metodo !== 'whatsapp' && (
                      <div className="mt-6 bg-rose-50 border border-rose-200 rounded-xl p-4">
                        <p className="text-sm text-rose-800">
                          Ao confirmar, você será redirecionado para o ambiente seguro do 
                          <strong> Mercado Pago</strong> para finalizar o pagamento.
                        </p>
                      </div>
                    )}
                    
                    {paymentMethod.metodo === 'whatsapp' && (
                      <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-sm text-green-800">
                          Ao confirmar, você será redirecionado para o WhatsApp para prosseguir com o pagamento.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-stone-200 p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={currentStep === 1 ? onClose : handlePreviousStep}
                className="px-6 py-3 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
              >
                {currentStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              <div className="flex items-center gap-4">
                {currentStep < 4 ? (
                  <button
                    onClick={handleNextStep}
                    className="px-8 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    Próxima Etapa
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        Confirmar e Pagar
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;