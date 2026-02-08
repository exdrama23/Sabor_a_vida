import Logo from '../assets/logos/Logo2.png';

const Footer = () => {
  return (
    <footer className="bg-stone-950 text-stone-400">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              
              <button
            onClick={() => ('home')}
            className="relative flex items-center gap-3 group">

            <div className="w-12 h-12 rounded-xl" />
            <img
              src={Logo}
              alt="Logo Sabor à Vida"
              className="w-12 h-12 scale-[5] relative left-10 object-contain"
            />

          </button>
            </div>
            <p className="text-stone-500 text-sm">
              Transformando momentos em memórias através da confeitaria de excelência.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">NAVEGAÇÃO</h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-stone-400 hover:text-white transition-colors text-sm">
                  Início
                </a>
              </li>
              <li>
                <a href="#" className="text-stone-400 hover:text-white transition-colors text-sm">
                  Produtos
                </a>
              </li>
              <li>
                <a href="#" className="text-stone-400 hover:text-white transition-colors text-sm">
                  Sobre Nós
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">INFORMAÇÕES</h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-stone-400 hover:text-white transition-colors text-sm">
                  Política de Entrega
                </a>
              </li>
              <li>
                <a href="#" className="text-stone-400 hover:text-white transition-colors text-sm">
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="#" className="text-stone-400 hover:text-white transition-colors text-sm">
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a href="#" className="text-stone-400 hover:text-white transition-colors text-sm">
                  Trabalhe Conosco
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">NEWSLETTER</h4>
            <p className="text-stone-500 text-sm mb-4">Receba nossas novidades e ofertas exclusivas.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Seu e-mail"
                className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-rose-600"
              />
              <button className="px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium">
                Inscrever
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-800 mt-16 pt-8 text-center">
          <p className="text-stone-500 text-sm">© 2024 Sabor à Vida Confeitaria. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
