import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Dispatch, SetStateAction } from 'react';
import { login } from '../axiosInstance';

interface AdminLoginProps {
  setIsAdmin: Dispatch<SetStateAction<boolean>>;
}

const AdminLogin = ({ setIsAdmin }: AdminLoginProps) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="pt-24 pb-16 px-6 bg-white min-h-screen flex items-start justify-center">
      <div className="w-full max-w-md mt-12">
        <div className="bg-white border rounded-2xl p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Acesso Administrador</h2>
          <p className="text-sm text-stone-500 mb-4">Insira o seu usuário e senha acessar o painel administrativo.</p>

          <form onSubmit={async(e)=>{
            e.preventDefault();
            setIsLoading(true);
            setError('');
            
            try {
              await login(email, password);
              setIsAdmin(true);
              navigate('/admin');
            } catch (err: any) {
              console.error('Erro ao fazer login:', err);

              if (err.response?.status === 429) {
                const blockedFor = err.response.data?.blockedFor || 30;
                setError(`Muitas tentativas. Tente novamente em ${blockedFor} minutos.`);
              } else {
                setError('Credenciais inválidas.');
              }
            } finally {
              setIsLoading(false);
            }
          }} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border px-3 py-2 rounded-lg"
              disabled={isLoading}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full border px-3 py-2 rounded-lg"
              disabled={isLoading}
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => navigate('/')} 
                className="px-4 py-2 rounded border cursor-pointer hover:bg-stone-50"
                disabled={isLoading}
              >
                Voltar
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 bg-rose-600 text-white rounded cursor-pointer hover:bg-rose-700 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
