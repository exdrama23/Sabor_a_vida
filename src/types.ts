import type { ElementType } from 'react';

export interface HeaderProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  cartItems?: CartItem[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  featured?: boolean;
  size?: 'pequeno' | 'medio' | 'grande';
  image: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  flavor?: string;
  topping?: string;
  extras?: string[];
}

export interface Feature {
  icon: ElementType;
  title: string;
  desc: string;
}

export interface CustomerData {
  nomeCompleto: string;
  telefone: string;
  email: string;
  cpf: string;
}

export interface AddressData {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  pontoReferencia?: string;
  tipoEndereco: 'casa' | 'apartamento' | 'trabalho';
  observacoes?: string;
}

export interface CreditCardData {
  tipoCartao: string;
  nomeTitular: string;
  numeroCartao: string;
  validade: string;
  cvv: string;
  parcelas: number;
}

export interface PaymentMethodData {
  metodo: 'pix' | 'cartao' | 'whatsapp';
  cartao?: CreditCardData;
}

export interface CheckoutFormData {
  etapa1: CustomerData;
  etapa2: AddressData;
  etapa3: PaymentMethodData;
}

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  delivery: number;
  total: number;
  onConfirmPayment: (data: CheckoutFormData) => void;
}
