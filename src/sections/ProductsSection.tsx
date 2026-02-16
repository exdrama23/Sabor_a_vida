import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from '../lib/gsap';
import type { Product } from '../types';
import CircularGallery from './CircularGallery';
import { useNavigate } from 'react-router-dom';
import boloPretoBranco from '../assets/Bolos/boloPretoBranco.jpeg';
import boloCaramelo from '../assets/Bolos/boloCaramelo.jpeg';
import Brigadeiro from '../assets/Bolos/Brigadeiro.png';
import Casadinho from '../assets/Bolos/Casadinho.png';
import castanha from '../assets/Bolos/Castanha.png';


//Aqui é os produtos que estão em destaque na home, não é a listagem completa. A listagem completa é feita na página /products
//É apenas os itens de demonstração
const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Chocolate Com Caramelo',
    description: 'Chocolate 70% cacau com recheio de ganache',
    price: 60.00,
    image: boloCaramelo,
  },
  {
    id: '2',
    name: 'Dois Amores',
    description: 'Com morangos selecionados e creme de baunilha',
    price: 60.00,
    image: boloPretoBranco,
  },
  {
    id: '3',
    name: 'Brigadeiro',
    description: 'Massa aveludada com cream cheese premium',
    price: 99.90,
    image: Brigadeiro,
  },
  {
    id: '4',
    name: 'Casa Dinho',
    description: 'Com doce de leite argentino e nozes',
    price: 84.90,
    image: Casadinho,
  },
  {
    id: '5',
    name: 'Castanha',
    description: 'Creme de pistache com toque de baunilha',
    price: 109.90,
    image: castanha,
  },
];

const ProductsSection = () => {
  const navigate = useNavigate();
  const productsRef = useRef<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const products = PRODUCTS;

  useEffect(() => {
    if (productsRef.current) {
      gsap.fromTo(
        productsRef.current.querySelectorAll('.product-card'),
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: productsRef.current,
            start: 'top 70%',
          },
        }
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const galleryItems = useMemo(
    () =>
      products.map((product) => ({
        image:  (product.image),
        text: `${product.name} - R$ ${product.price}`,
      })),
    [products]
  );

  return (
    <section ref={productsRef} className="py-24 px-6 bg-linear-to-b from-stone-50 to-white">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-6xl font-bold text-stone-900 mb-6">
            Nossas <span className="text-rose-600">Criações</span>
          </h2>
          <h3 className="text-stone-600 text-lg max-w-2xl mx-auto">
            bolo pequeno 12R$ | bolo médio 35R$ | bolo grande 60R$ 
          </h3>
          <p className="text-stone-600 text-lg max-w-2xl mx-auto">
            Cada bolo é uma obra de arte, feita com ingredientes selecionados e muita técnica.
          </p>
          
        </div>

        <div className="mb-16">
          <div className="h-72 sm:h-90 md:h-115 lg:h-140 relative touch-pan-y">
            <CircularGallery
              items={galleryItems}
              bend={isMobile ? 0.6 : 0}
              borderRadius={0.08}
              scrollSpeed={isMobile ? 1.4 : 2}
              scrollEase={0.06}
              textColor="#4e221a"
              font={isMobile ? '800 28px Nunito Sans' : '800 24px Nunito Sans'}
            />
          </div>
        </div>

        <div className="text-center mt-16">
          <button onClick={() => navigate('/products')} className="px-12 py-4 bg-white border-2 border-stone-300 text-stone-700 rounded-xl font-semibold hover:border-rose-400 hover:text-rose-700 transition-all duration-300 hover:shadow-lg cursor-pointer">
            Ver Todos os Produtos
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;