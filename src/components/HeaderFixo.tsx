import { Menu, ShoppingBag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { HeaderProps } from '../types';
import Logo2 from '../assets/logos/Logo2Preta.png';
import LogoMarrom from '../assets/logos/LogoMarrom.png';

const Header = ({ isMenuOpen: externalMenuOpen, setIsMenuOpen: externalSetMenuOpen, cartItems = [] }: Partial<HeaderProps> = {}) => {
  const navigate = useNavigate();
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);

  const isMenuOpen = externalMenuOpen !== undefined ? externalMenuOpen : internalMenuOpen;
  const setIsMenuOpen = externalSetMenuOpen || setInternalMenuOpen;
  const cartCount = cartItems.length;

  return (
    <nav className="fixed w-full z-50 bg-white shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="relative flex items-center gap-3 group cursor-pointer"
          >
            {/* Área base do header (tamanho normal) */}
            <div className="w-12 h-12 rounded-xl" />

            {/* Logo - sempre versão preta */}
            <img
              src={Logo2}
              alt="Logo Sabor à Vida"
              className="hidden md:block w-12 h-12 scale-[5] origin-left object-contain"
            />

            {/* mobile */}
            <img
              src={Logo2}
              alt="Logo Sabor à Vida"
              className="block md:hidden w-12 h-12 scale-[3.5] origin-left object-contain"
            />
          </button>

          <div className="hidden lg:flex items-center space-x-10">
            <button
              onClick={() => navigate('/')}
              className="transition-colors font-medium text-sm tracking-wide text-stone-800 hover:text-rose-600 cursor-pointer"
            >
              INÍCIO
            </button>
            <button
              onClick={() => navigate('/products')}
              className="transition-colors font-medium text-sm tracking-wide text-stone-800 hover:text-rose-600 cursor-pointer"
            >
              PRODUTOS
            </button>
            <button
              onClick={() => navigate('/about')}
              className="transition-colors font-medium text-sm tracking-wide text-stone-800 hover:text-rose-600 cursor-pointer"
            >
              SOBRE
            </button>
            {/* Admin access removed from header; use /admin URL directly */}
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/cart')}
              className="relative p-3 hover:bg-stone-50 rounded-xl transition-all group cursor-pointer"
            >
              <ShoppingBag className="w-6 h-6 text-stone-800 group-hover:text-rose-600 transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-xs font-bold rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              className="lg:hidden p-2 hover:bg-stone-50 rounded-lg transition-colors text-stone-800 cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-stone-100">
          <div className="container mx-auto px-6 py-6 flex flex-col gap-1">
            <button
              onClick={() => {
                navigate('/');
                setIsMenuOpen(false);
              }}
              className="text-left py-4 text-stone-600 hover:text-rose-600 transition-colors font-medium border-b border-stone-50 cursor-pointer"
            >
              INÍCIO
            </button>
            <button
              onClick={() => {
                navigate('/products');
                setIsMenuOpen(false);
              }}
              className="text-left py-4 text-stone-600 hover:text-rose-600 transition-colors font-medium border-b border-stone-50 cursor-pointer"
            >
              PRODUTOS
            </button>
            <button
              onClick={() => {
                navigate('/about');
                setIsMenuOpen(false);
              }}
              className="text-left py-4 text-stone-600 hover:text-rose-600 transition-colors font-medium border-b border-stone-50 cursor-pointer"
            >
              SOBRE
            </button>
            {/* Admin access removed from mobile menu; reach via /admin manually */}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;