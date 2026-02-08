import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from '../lib/gsap';
import type { Product } from '../types';
import CircularGallery from './CircularGallery';

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Vulcão de Chocolate Belga',
    description: 'Chocolate 70% cacau com recheio de ganache',
    price: 89.90,
    image: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    name: 'Vulcão de Morango Fresco',
    description: 'Com morangos selecionados e creme de baunilha',
    price: 94.90,
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62dadadf?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    name: 'Vulcão Red Velvet',
    description: 'Massa aveludada com cream cheese premium',
    price: 99.90,
    image: 'https://images.unsplash.com/photo-1574085733277-851d9d856a3a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    name: 'Vulcão Doce de Leite',
    description: 'Com doce de leite argentino e nozes',
    price: 84.90,
    image: 'https://images.unsplash.com/photo-1626803775027-53b7958d43c4?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 5,
    name: 'Vulcão de Pistache',
    description: 'Creme de pistache com toque de baunilha',
    price: 109.90,
    image: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=800&q=80',
  },
];

const ProductsSection = () => {
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
        image: product.image,
        text: `${product.name} - R$ ${product.price}`,
      })),
    [products]
  );

  return (
    <section ref={productsRef} className="py-24 px-6 bg-gradient-to-b from-stone-50 to-white">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-6xl font-bold text-stone-900 mb-6">
            Nossas <span className="text-rose-600">Criações</span>
          </h2>
          <p className="text-stone-600 text-lg max-w-2xl mx-auto">
            Cada bolo é uma obra de arte, feita com ingredientes selecionados e muita técnica.
          </p>
        </div>

        <div className="mb-16">
          <div className="h-[260px] sm:h-[320px] md:h-[420px] lg:h-[520px] relative touch-pan-y">
            <CircularGallery
              items={galleryItems}
              bend={isMobile ? 0.6 : 0}
              borderRadius={0.08}
              scrollSpeed={isMobile ? 1.4 : 2}
              scrollEase={0.06}
              textColor="#000000"
              font={isMobile ? 'bold 20px Figtree' : 'bold 26px Figtree'}
            />
          </div>
        </div>

        <div className="text-center mt-16">
          <button className="px-12 py-4 bg-white border-2 border-stone-300 text-stone-700 rounded-xl font-semibold hover:border-rose-400 hover:text-rose-700 transition-all duration-300 hover:shadow-lg cursor-pointer">
            Ver Todos os Produtos
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;