import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HeaderProps } from '../types';
import Logo from '../assets/logos/Logo2.png';
import Logo2 from '../assets/logos/Logo2Preta.png';
import LogoMarrom from '../assets/logos/LogoMarrom.png';

const Header = ({ isMenuOpen, setIsMenuOpen, cartItems = [] }: HeaderProps) => {
  const navigate = useNavigate();
  const cartCount = cartItems.length;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-sm' : 'bg-transparent'
      }`}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="relative flex items-center gap-3 group cursor-pointer"
          >
            {/* Área base do header (tamanho normal) */}
            <div className="w-12 h-12 rounded-xl" />

            {/* Logo gigante (fora do fluxo) */}
            <img
              src={isScrolled ? Logo2 : Logo}
              alt="Logo Sabor à Vida"
              className="hidden md:block w-12 h-12 scale-[5] origin-left object-contain"
            />

            {/* mobile */}
            <img
              src={LogoMarrom}
              alt="Logo Sabor à Vida"
              className="block md:hidden w-12 h-12 scale-[3.5] origin-left object-contain"
            />

          </button>

          <div className="hidden lg:flex items-center space-x-10">
            <button
              onClick={() => navigate('/')}
              className={`transition-colors font-medium text-sm tracking-wide ${isScrolled ? 'text-stone-800 hover:text-rose-600' : 'text-white hover:text-rose-300'
                } cursor-pointer`}
            >
              INÍCIO
            </button>
            <button
              onClick={() => navigate('/products')}
              className={`transition-colors font-medium text-sm tracking-wide ${isScrolled ? 'text-stone-800 hover:text-rose-600' : 'text-white hover:text-rose-300'
                } cursor-pointer`}
            >
              PRODUTOS
            </button>
            <button
              onClick={() => navigate('/about')}
              className={`transition-colors font-medium text-sm tracking-wide ${isScrolled ? 'text-stone-800 hover:text-rose-600' : 'text-white hover:text-rose-300'
                } cursor-pointer`}
            >
              SOBRE
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/cart')}
              className="relative p-3 hover:bg-stone-50 rounded-xl transition-all group cursor-pointer"
            >
              <ShoppingBag className={`w-6 h-6 transition-colors ${isScrolled ? 'text-stone-800 group-hover:text-rose-600' : 'text-white group-hover:text-rose-300'
                }`} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-xs font-bold rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              className={`lg:hidden p-2 hover:bg-stone-50 rounded-lg transition-colors ${isScrolled ? 'text-stone-800' : 'text-white'
                }`}
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
              className="text-left py-4 text-stone-600 hover:text-rose-600 transition-colors font-medium cursor-pointer"
            >
              SOBRE
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;