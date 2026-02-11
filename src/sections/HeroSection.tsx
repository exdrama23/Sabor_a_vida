import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import cake from '../assets/backgroundCake.png'
import cakeMobile from '../assets/backgroundMobile.png'
import LoadingScreen from '../components/LoadingScreen'

const HeroSection = () => {
  const heroRef = useRef<HTMLElement | null>(null)
  const desktopImgRef = useRef<HTMLImageElement | null>(null)
  const mobileImgRef = useRef<HTMLImageElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 768px)').matches
  })

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

  useEffect(() => {
    // If the relevant image is already cached/loaded, clear loading.
    const checkLoaded = () => {
      const targetRef = isDesktop ? desktopImgRef.current : mobileImgRef.current
      if (targetRef && targetRef.complete) {
        setLoading(false)
      }
    }

    checkLoaded()
    // don't add resize listeners aggressively; we only care initial view
  }, [isDesktop])

  return (
  <>
    {loading && <LoadingScreen />}
    <section
      ref={heroRef}
      className={`relative min-h-screen pt-32 pb-20 px-6 overflow-hidden`}
    >
    {/* Desktop */}
    <img
      ref={desktopImgRef}
      src={cake}
      alt=""
      aria-hidden
      loading="eager"
      fetchPriority="high"
      onLoad={() => { if (isDesktop) setLoading(false) }}
      className="hidden md:block absolute inset-0 w-full h-full object-cover"
    />

    {/* Mobile */}
    <img
      ref={mobileImgRef}
      src={cakeMobile}
      alt=""
      aria-hidden
      loading="eager"
      fetchPriority="high"
      onLoad={() => { if (!isDesktop) setLoading(false) }}
      className="block md:hidden absolute inset-0 w-full h-full object-cover object-right-top"
    />
  </section>
  </>
)
}

export default HeroSection
