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
  
  // Ocultar header/footer no admin e login
  const isAdminOrLogin = location.pathname.startsWith('/admin') || location.pathname === '/login';

  return (
    <div className="min-h-screen bg-white text-stone-800 antialiased">
      {!isAdminOrLogin && (
        showFixoHeader ? (
          <HeaderFixo isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} cartItems={cartItems} />
        ) : (
          <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} cartItems={cartItems} />
        )
      )}

      <main>
        <Outlet />
      </main>

      {!isAdminOrLogin && <Footer />}
    </div>
  );
};

export default AppLayout;
