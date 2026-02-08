import { Outlet, useLocation } from 'react-router-dom';
import Footer from './components/Footer';
import Header from './components/Header';
import HeaderFixo from './components/HeaderFixo';
import type { CartItem } from './types';

interface AppLayoutProps {
  cartItems: CartItem[];
  isMenuOpen: boolean;
  setIsMenuOpen: (v: boolean) => void;
}

const AppLayout = ({ cartItems, isMenuOpen, setIsMenuOpen }: AppLayoutProps) => {
  const location = useLocation();
  const showFixoHeader = location.pathname === '/products' || location.pathname === '/cart';

  return (
    <div className="min-h-screen bg-white text-stone-800 antialiased">
      {showFixoHeader ? (
        <HeaderFixo isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} cartItems={cartItems} />
      ) : (
        <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} cartItems={cartItems} />
      )}

      <main>
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default AppLayout;
