import { 
  LayoutDashboard, 
  Cake, 
  List, 
  Logs,
  Settings,
  LogOut,
  Home,
  Package,
  Info,
  ShoppingBag
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (panel: string) => void;
}

const AdminSidebar = ({ isOpen, onClose, selected, onSelect }: AdminSidebarProps) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'adicionar', icon: Cake, label: 'Adicionar Bolos' },
    { id: 'lista', icon: List, label: 'Lista de Bolos' },
    { id: 'pedidos', icon: ShoppingBag, label: 'Pedidos' },
    { id: 'logs', icon: Logs, label: 'Logs' },
    { id: 'config', icon: Settings, label: 'Configurações' },
  ];

  const publicNavItems = [
    { id: 'home', icon: Home, label: 'Início', divider: true },
    { id: 'produtos', icon: Package, label: 'Produtos' },
    { id: 'sobre', icon: Info, label: 'Sobre' },
    { id: 'carrinho', icon: ShoppingBag, label: 'Carrinho' },
  ];

  const handleItemClick = (itemId: string) => {
    if (itemId === 'home') {
      window.location.href = '/';
    } else if (itemId === 'produtos') {
      window.location.href = '/products';
    } else if (itemId === 'sobre') {
      window.location.href = '/about';
    } else if (itemId === 'carrinho') {
      window.location.href = '/cart';
    } else {
      onSelect(itemId);
    }
    onClose();
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-stone-200 
        transition-transform duration-300 z-50
        w-64 lg:w-72
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        overflow-y-auto
      `}>
        <div className="p-6 border-b border-stone-200">
          <h2 className="text-2xl font-bold text-stone-800">Admin</h2>
          <p className="text-sm text-stone-500 mt-1">Painel de Controle</p>
        </div>

        <nav className="p-4">
          {/* Admin Navigation */}
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200 text-left
                    ${selected === item.id
                      ? 'bg-rose-50 text-rose-600' 
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="my-4 border-t border-stone-200" />

          {/* Public Navigation */}
          <ul className="space-y-2">
            {publicNavItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200 text-left
                    text-stone-600 hover:bg-stone-50 hover:text-stone-900
                  `}
                  title={`Ir para ${item.label}`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-200 bg-white">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-stone-600 hover:bg-stone-50 transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;