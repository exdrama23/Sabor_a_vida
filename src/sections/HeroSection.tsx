import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import cake from '../assets/backgroundCake.png'

const HeroSection = () => {
  const heroRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.querySelectorAll('.hero-item'),
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power2.out',
        }
      )
    }
  }, [])

  return (
    <section
      ref={heroRef}
      className={
        `relative min-h-screen pt-32 pb-20 px-6 overflow-hidden`
      }
    >
      {/* Desktop */}
      <div
        className="hidden md:block absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${cake})` }}
        aria-hidden
      />

      {/* Mobile */}
      <div
        className="block md:hidden absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${cake})` }}
        aria-hidden
      />

    </section>
  )
}

export default HeroSection
