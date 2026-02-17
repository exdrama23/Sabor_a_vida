import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './App.css';
import LoadingScreen from './components/LoadingScreen';
import { gsap } from './lib/gsap';
import type { CartItem, Product } from './types';
import AppLayout from './AppLayout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import CartPage from './pages/CartPage';
import AdminLayout from './pages/Admin/AdminLayout';
import AdminLogin from './components/AdminLogin';
import AboutPage from './pages/AboutPage';
import api from './axiosInstance';
import AdicionarBolo from './pages/Admin/AdicionarBolo';
import Logs from './pages/Admin/Logs';
import ListaBolos from './pages/Admin/ListaBolos';

function App() {
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('cart');
      if (raw) {
        const items = JSON.parse(raw) as CartItem[];
        // Filtra itens com preço inválido
        return items.filter(item => item.price != null && item.price > 0);
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (err) {
      console.warn('Não foi possível salvar carrinho no localStorage', err);
    }
  }, [cart]);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isAdmin') === 'true';
    } catch {
      return false;
    }
  });

  const [jaBuscou, setJaBuscou] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);

  async function getProducts(){
    if(jaBuscou) return;
    setJaBuscou(true);
    try {
      const response = await api.get('/product') as {data: {
        id: string;
        name: string;
        category: string;
        description: string;
        price: string;
        featured: boolean;
        image: string;
      }[]};
      setProducts(response.data.map(prod=>({...prod, price: Number(prod.price)})));
    } catch (err) {
      console.error('Erro ao buscar produtos:', err)
    }
  }

  useEffect(() => {
    getProducts();
  }, [jaBuscou]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      gsap.to('body', { duration: 0.3, opacity: 1 });
    }
  }, [loading]);

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={<AppLayout cartItems={cart} isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />}
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage cart={cart} setCart={setCart} products={products} />} />
          <Route path="/cart" element={<CartPage cartItems={cart} setCartItems={setCart} />} />
          <Route
            path="/admin"
            element={
              isAdmin ? (
                <AdminLayout />
              ) : (
                <AdminLogin setIsAdmin={setIsAdmin} />
              )
            }
          />
          <Route path="bolos/adicionar" element={<AdicionarBolo />} />
          <Route path="bolos/lista" element={<ListaBolos />} />
          <Route path="logs" element={<Logs />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
