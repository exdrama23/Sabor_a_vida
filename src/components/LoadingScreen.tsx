import LogoLoading from '../assets/logos/logoLoading.png'
const LoadingScreen = () => (
  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
    <div className="relative">
      <div className="w-32 h-32 border-4 border-rose-100 rounded-full animate-spin">
        <div
          className="absolute inset-4 border-4 border-rose-300 rounded-full animate-spin"
          style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
        ></div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
         <img
          src={LogoLoading}
          alt="Logo carregando"
          className="w-48 h-48 animate-pulse scale[5]  object-contain"
          style={{ animationDuration: '2s' }}
        />
      </div>
    </div>
    <h2 className="mt-8 text-3xl font-bold text-rose-800 tracking-tight">Sabor à Vida</h2>
    <p className="text-rose-400 text-sm mt-3 tracking-wider">CARREGANDO EXPERIÊNCIA</p>
  </div>
);

export default LoadingScreen;
