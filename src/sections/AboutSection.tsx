import { ChefHat, Clock, Star, Truck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { gsap } from '../lib/gsap';
import type { Feature } from '../types';

const AboutSection = () => {
  const aboutRef = useRef<HTMLElement | null>(null);

  //aqui são os textos que estão dentro de um retangulo no sobre
  const features: Feature[] = [
    { icon: Star, title: 'Ingredientes Premium', desc: 'Seleção rigorosa de fornecedores' },
    { icon: Clock, title: 'Frescor Garantido', desc: 'Produzido e entregue no mesmo dia' },
    { icon: ChefHat, title: 'Técnica Avançada', desc: 'Métodos de confeitaria modernos' },
    { icon: Truck, title: 'Logística Refinada', desc: 'Entrega especializada e cuidadosa' },
  ];

  useEffect(() => {
    if (aboutRef.current) {
      gsap.fromTo(
        aboutRef.current.querySelectorAll('.about-item'),
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          stagger: 0.3,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: aboutRef.current,
            start: 'top 70%',
          },
        }
      );
    }
  }, []);

  return (
    <section ref={aboutRef} className="py-24 px-6 bg-white">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="hidden md:grid grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Essas imagens que ficam no sobre, as 4 imagens de demonstração */}
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1626803775151-61d756612f97?auto=format&fit=crop&w=800&q=80"
                  alt="Preparo artesanal"
                  className="w-full h-80 object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80"
                  alt="Ingredientes selecionados"
                  className="w-full h-64 object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
            <div className="pt-12 space-y-6">
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80"
                  alt="Atendimento personalizado"
                  className="w-full h-64 object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=800&q=80"
                  alt="Ambiente da confeitaria"
                  className="w-full h-80 object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
          </div>
          {/*Aqui é onde fica os modificadores do sobre*/}
            <div className="space-y-8">
            <div className="about-item">
              <span className="text-rose-600 font-bold text-sm tracking-widest uppercase">Nossa Filosofia</span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mt-4 mb-6">
                Excelência em <br />
                <span className="text-rose-600">Cada Detalhe</span>
              </h2>
            </div>

            <div className="space-y-6 about-item">
              <p className="text-stone-600 text-base md:text-lg leading-relaxed">
                Na <span className="font-semibold text-rose-700">Sabor à Vida</span>, transformamos ingredientes
                selecionados em experiências memoráveis. Cada bolo é cuidadosamente planejado por nossa chef
                especialista, garantindo perfeição técnica e sabor incomparável.
              </p>
              <p className="text-stone-600 text-base md:text-lg leading-relaxed">
                Nossa missão é criar momentos especiais através da confeitaria, oferecendo produtos que superam
                expectativas e criam memórias duradouras.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 pt-4 about-item">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4 p-4 hover:bg-stone-50 rounded-xl transition-colors">
                  <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                    <feature.icon className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 mb-1">{feature.title}</h4>
                    <p className="text-sm text-stone-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
