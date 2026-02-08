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
  image: string;
}

export interface CartItem {
  id: number;
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
