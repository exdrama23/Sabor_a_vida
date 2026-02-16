import { useState } from 'react';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdicionarBolo from './AdicionarBolo';
import ListaBolos from './ListaBolos';
import AdminDashboard from './Dashboard';
import Logs from './Logs';
import Pedidos from './Pedidos';

type Panel = 'adicionar' | 'dashboard' | 'lista' | 'logs' | 'pedidos' | 'config' | `editar:${string}`;

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<Panel>('adicionar');

  const handleNavigate = (panel: string) => {
    setSelectedPanel(panel as Panel);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Botão do menu mobile */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-6 right-6 lg:hidden z-30 
                   bg-rose-600 text-white p-4 rounded-full shadow-lg
                   hover:bg-rose-700 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selected={selectedPanel}
        onSelect={handleNavigate}
      />

      <main className="lg:ml-72 pt-8 lg:pt-12 px-4 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {selectedPanel === 'dashboard' && <AdminDashboard />}
          {selectedPanel === 'adicionar' && <AdicionarBolo onNavigate={handleNavigate} />}
          {selectedPanel === 'lista' && <ListaBolos onNavigate={handleNavigate} />}
          {selectedPanel === 'pedidos' && <Pedidos onNavigate={handleNavigate} />}
          {selectedPanel === 'logs' && <Logs />}
          {selectedPanel === 'config' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-8">Configurações (em breve)</div>
          )}
          {typeof selectedPanel === 'string' && selectedPanel.startsWith('editar:') && (
            <div className="bg-white rounded-2xl border border-stone-200 p-8">Editar produto: {selectedPanel.split(':')[1]}</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;