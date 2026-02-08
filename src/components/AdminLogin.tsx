import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Dispatch, SetStateAction } from 'react';

interface AdminLoginProps {
  setIsAdmin: Dispatch<SetStateAction<boolean>>;
}

const AdminLogin = ({ setIsAdmin }: AdminLoginProps) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const SECRET = 'saboradmin';
    if (password === SECRET) {
      try {
        localStorage.setItem('isAdmin', 'true');
      } catch (e) {}
      setIsAdmin(true);
      setError('');
      navigate('/admin');
    } else {
      setError('Senha incorreta');
    }
  };

  return (
    <div className="pt-24 pb-16 px-6 bg-white min-h-screen flex items-start justify-center">
      <div className="w-full max-w-md mt-12">
        <div className="bg-white border rounded-2xl p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Acesso Administrador</h2>
          <p className="text-sm text-stone-500 mb-4">Insira a senha para acessar o painel administrativo.</p>

          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full border px-3 py-2 rounded-lg"
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => navigate('/')} className="px-4 py-2 rounded border cursor-pointer hover:bg-stone-50">Voltar</button>
              <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded cursor-pointer hover:bg-rose-700">Entrar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
