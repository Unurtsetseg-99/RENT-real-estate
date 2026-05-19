"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { properties } from "@/data/mockData";

const HERO_SLIDES = [
  {
    image: "/img/bg1.jpg",
    headline: "Golden Horizon",
    subhead: "Sunset reflections and quiet resort energy in one unforgettable address.",
    alt: "Luxury waterside residence at sunset",
  },
  {
    image: "/img/bg2.jpg",
    headline: "Modern Escape",
    subhead: "Clean lines, warm light, and a home that feels calm from the first look.",
    alt: "Modern luxury home exterior",
  },
  {
    image: "/img/bg3.jpg",
    headline: "Skyline Grace",
    subhead: "Elevated views and refined spaces designed for slow, beautiful evenings.",
    alt: "Elegant home with skyline view",
  },
  {
    image: "/img/bg4.jpg",
    headline: "Private Retreat",
    subhead: "A serene setting for focused mornings, soft interiors, and easy living.",
    alt: "Private luxury property surrounded by landscape",
  },
  {
    image: "/img/bg5.jpg",
    headline: "Coastal Glow",
    subhead: "Bright architecture, open air, and a gentle rhythm that feels instantly premium.",
    alt: "Bright premium house with open exterior",
  },
];

const stats = [
  { value: "1,200+", label: "Active listings" },
  { value: "840+", label: "Happy clients" },
  { value: "9", label: "Districts" },
  { value: "98%", label: "Satisfaction" },
];

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [scrollY, setScrollY] = useState(0);
  const [newsletterName, setNewsletterName] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection('next');
      setSlide((s) => (s + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setDirection(index > slide ? 'next' : 'prev');
    setSlide(index);
  };

  useEffect(() => {
    if (!mounted) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !entry.target.classList.contains("is-visible")) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    setTimeout(() => {
      document.querySelectorAll(".home-section, .home-stats-bar").forEach((el) => {
        observer.observe(el);
      });
    }, 100);
    return () => observer.disconnect();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const syncSectionStack = () => {
      const faqSection = document.querySelector(".home-faq-section");
      const advantagesSection = document.querySelector(".home-advantages-section");

      if (!faqSection || !advantagesSection) return;

      const faqTop = faqSection.getBoundingClientRect().top;
      advantagesSection.classList.toggle("is-released", faqTop < window.innerHeight * 0.92);
    };
    const onScroll = () => {
      setScrollY(window.scrollY);
      syncSectionStack();
    };
    syncSectionStack();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", syncSectionStack, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", syncSectionStack);
    };
  }, [mounted]);

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const heroProgress = Math.min(scrollY / vh, 1);
  const heroStyle = {
    transform: `translateY(${-scrollY * 0.3}px)`,
    opacity: Math.max(1 - heroProgress * 1.6, 0),
  };

  const requireAuth = (path: string) => {
    if (!isAuthenticated) router.push("/auth");
    else router.push(path);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newsletterConsent) {
      alert("Please accept the privacy policy to continue.");
      return;
    }
    
    if (!newsletterName || !newsletterEmail) {
      alert("Please fill in all required fields.");
      return;
    }
    
    try {
      // Check if user exists in database
      const checkResponse = await fetch("/api/auth/check-email", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      
      const checkData = await checkResponse.json();
      
      if (checkData.exists) {
        // User exists - redirect to login page with email pre-filled
        router.push(`/auth?email=${encodeURIComponent(newsletterEmail)}&tab=login`);
      } else {
        // User doesn't exist - redirect to register page with email and name pre-filled
        router.push(`/auth?email=${encodeURIComponent(newsletterEmail)}&name=${encodeURIComponent(newsletterName)}&tab=register`);
      }
    } catch (error) {
      console.error("Error checking email:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const featured = properties.filter((p) => p.featured).slice(0, 4);

const formatCompactPrice = (price: number) =>
    `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(price)} MNT`;

  const current = HERO_SLIDES[slide];

  return (
    <main style={{ position: "relative" }}>
      <section className="home-hero home-hero-slide" style={mounted ? heroStyle : undefined}>
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            className={`home-hero-slide-layer${
              i === slide ? " active" : ""
            }${direction === 'next' ? " from-right" : " from-left"}`}
            style={{ backgroundImage: `url(${s.image})` }}
          />
        ))}
        <div className="home-hero-overlay" />
        <div className="container home-hero-inner">
          <div className="home-hero-bottom">
            <div className="home-hero-copy-body">
              <h1 className="home-hero-title" style={{ color: "#fff" }}>{current.headline}</h1>
              <p className="home-hero-sub" style={{ color: "rgba(255,255,255,0.82)" }}>{current.subhead}</p>
            </div>
            <div className="home-hero-actions">
              {!mounted ? null : isAuthenticated ? (
                <>
                  <Link href="/properties?status=For+Sale" className="home-hero-cta primary">Browse listings</Link>
                  <Link href="/properties?status=For+Rent" className="home-hero-cta secondary">For Rent</Link>
                </>
              ) : (
                <HeroGetStartedBtn />
              )}
            </div>
            <div className="home-hero-dots">
              {HERO_SLIDES.map((_, i) => (
                <button key={i} type="button" className={`home-hero-dot${i === slide ? " active" : ""}`} onClick={() => goToSlide(i)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-luxury-section">
        <div className="container">
          <div className="home-luxury-inner">
            <h2 className="home-luxury-title">LUXURY LIVES HERE</h2>
            <p className="home-luxury-body">
              With over 25 years in the industry, Stewart &amp; Co Real Estate has a wealth of
              knowledge and experience in Barbados&apos; luxury real estate market. Known for
              delivering outstanding results, Stewart &amp; Co Real Estate has earned a reputation
              synonymous with reliability, honesty and transparency, helping clients buy and sell
              property with exceptional dedication and expertise.
            </p>
          </div>
        </div>
      </section>

      {/* Property Cards Section - Between Luxury and Exclusive */}
      <section className="home-section" style={{ padding: "10px 0", background: "var(--token-9c183037-09f5-4d93-9e94-f6ca955d1db0, #f4efeb)" }}>
        <div className="container">
          <div className="luxury-properties-grid">
            {featured.length === 0 ? (
              <p style={{ color: '#464646', padding: '20px' }}>No featured properties found</p>
            ) : (
              featured.slice(0, 4).map((property) => (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="luxury-property-card"
                >
                  <div className="luxury-property-image">
                    <Image
                      src={property.image}
                      alt={property.i18n?.en?.title || property.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className="luxury-property-img"
                    />
                    <div className="luxury-property-badges">
                      <span className="luxury-property-badge">{property.type}</span>
                      <span className="luxury-property-badge">{property.status}</span>
                    </div>
                  </div>
                  <div className="luxury-property-content">
                    <h3 className="luxury-property-title">
                      {property.i18n?.en?.title || property.title}
                    </h3>
                    <p className="luxury-property-price">
                      From USD {formatCompactPrice(property.price)}
                    </p>
                    <div className="luxury-property-meta">
                      {property.rooms && (
                        <span className="luxury-property-meta-item">
                          {property.rooms} Bedrooms
                        </span>
                      )}
                      {property.bathrooms && (
                        <span className="luxury-property-meta-item">
                          {property.bathrooms} Bathrooms
                        </span>
                      )}
                    </div>
                    <p className="luxury-property-location">
                      {property.district}, {property.city}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="home-section home-about-section">
        <div className="container">
          <div className="home-about-grid">
            <div className="home-about-content">
              <h2 className="home-about-title">About Us</h2>
              <p className="home-about-text">
                We stand out in Mongolia’s real estate market through quality, integrity, and deep local expertise. Our team understands the unique dynamics of Ulaanbaatar’s property landscape and is dedicated to helping every client find the perfect home or investment opportunity.x
              </p>
              <p className="home-about-text">
                We value personalized service, transparent communication, and reliable results. Whether you are buying, selling, or renting, we are committed to delivering solutions tailored to your needs and goals.
              </p>
            </div>
            <div className="home-about-stats">
              <div className="home-about-stat-card">
                <h3 className="home-about-stat-number">25+</h3>
                <p className="home-about-stat-label">Years of Experience</p>
              </div>
              <div className="home-about-stat-card">
                <h3 className="home-about-stat-number">1,200+</h3>
                <p className="home-about-stat-label">Properties Sold</p>
              </div>
              <div className="home-about-stat-card">
                <h3 className="home-about-stat-number">840+</h3>
                <p className="home-about-stat-label">Happy Clients</p>
              </div>
              <div className="home-about-stat-card">
                <h3 className="home-about-stat-number">98%</h3>
                <p className="home-about-stat-label">Satisfaction Rate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-advantages-section">
        <div className="container">
          <h2 className="home-advantages-title">The Advantage of Our System</h2>
          <div className="home-advantages-grid">
            <div className="home-advantage-card">
              <div className="home-advantage-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="home-advantage-card-title">Advanced Search Technology</h3>
              <p className="home-advantage-card-text">
                Our intelligent search system uses advanced filters and AI-powered recommendations 
                to help you find exactly what you're looking for in seconds.
              </p>
            </div>
            <div className="home-advantage-card">
              <div className="home-advantage-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
              </div>
              <h3 className="home-advantage-card-title">Verified Listings</h3>
              <p className="home-advantage-card-text">
                Every property is thoroughly verified by our team to ensure accuracy, authenticity, 
                and up-to-date information you can trust.
              </p>
            </div>
            <div className="home-advantage-card">
              <div className="home-advantage-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h3 className="home-advantage-card-title">Real-Time Updates</h3>
              <p className="home-advantage-card-text">
                Get instant notifications about new listings, price changes, and market trends 
                so you never miss an opportunity.
              </p>
            </div>
            <div className="home-advantage-card">
              <div className="home-advantage-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <h3 className="home-advantage-card-title">Expert Support</h3>
              <p className="home-advantage-card-text">
                Our dedicated team of real estate professionals is available to guide you through 
                every step of your property journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-newsletter-section">
        <div className="home-newsletter-overlay" />
        <div className="container">
          <div className="home-newsletter-content">
            <h2 className="home-newsletter-title">
              KEEP YOURSELF UPDATED ON THE<br />
              LATEST LUXURY PROPERTY AVAILABLE
            </h2>
            {newsletterSubmitted && (
              <div className="home-newsletter-success">
                ✓ Thank you for subscribing! We'll keep you updated.
              </div>
            )}
            <form className="home-newsletter-form" onSubmit={handleNewsletterSubmit}>
              <input 
                type="text" 
                placeholder="Name*" 
                className="home-newsletter-input"
                value={newsletterName}
                onChange={(e) => setNewsletterName(e.target.value)}
                required
              />
              <input 
                type="email" 
                placeholder="Email*" 
                className="home-newsletter-input"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
              />
              <button type="submit" className="home-newsletter-btn">
                SIGN UP
              </button>
            </form>
            <div className="home-newsletter-consent">
              <input 
                type="checkbox" 
                id="newsletter-consent" 
                className="home-newsletter-checkbox"
                checked={newsletterConsent}
                onChange={(e) => setNewsletterConsent(e.target.checked)}
              />
              <label htmlFor="newsletter-consent" className="home-newsletter-label">
                By providing Stewart&Co* your contact information, you acknowledge and agree to our{' '}
                <a href="/privacy" className="home-newsletter-link">Privacy Policy</a> and consent to receiving marketing communications, 
                including through automated calls, texts, and emails, some of which may use artificial or prerecorded voices. 
                This consent isn't necessary for purchasing any products or services and you may opt out at any time. 
                To opt out from texts, you can reply, stop at any time. To opt out from emails, you can click on the unsubscribe link in 
                the emails. Message and data rates may apply.
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-faq-section">
        <div className="container">
          <div className="home-faq-header">
            <h2 className="home-faq-title">
              YOUR QUESTIONS,<br />ANSWERED
            </h2>
          </div>
          <div className="home-faq-list">
            {[
              { n: "(1)", q: "What types of homes are available?", a: "We offer apartments, houses, villas, and commercial properties across all 9 districts of Ulaanbaatar." },
              { n: "(2)", q: "What makes UnurHome unique?", a: "Every listing is verified, our platform is fast and intuitive, and we provide local market intelligence to help you make informed decisions." },
              { n: "(3)", q: "What amenities are available to residents?", a: "Properties feature modern amenities including parking, security systems, high-speed internet, and proximity to schools, hospitals, and shopping centers." },
              { n: "(4)", q: "How private and secure is the platform?", a: "We use industry-standard encryption, secure authentication, and never share your personal information with third parties without consent." },
            ].map(({ n, q, a }) => (
              <FaqItem key={n} number={n} question={q} answer={a} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function FaqItem({ number, question, answer }: { number: string; question: string; answer: string }) {
  return (
    <div className="home-faq-item">
      <div className="home-faq-left">
        <span className="home-faq-number">{number}</span>
      </div>
      <div className="home-faq-content">
        <h3 className="home-faq-question">{question}</h3>
        <p className="home-faq-answer">{answer}</p>
      </div>
    </div>
  );
}

function HeroGetStartedBtn() {
  const router = useRouter();
  const [clicked, setClicked] = useState(false);
  const handleClick = () => {
    setClicked(true);
    setTimeout(() => router.push("/auth"), 250);
  };
  return (
    <button
      type="button"
      className={`hero-get-started-btn${clicked ? " clicked" : ""}`}
      onClick={handleClick}
    >
      <span className="hero-gs-label">Get started</span>
      <span className="hero-gs-arrow">→</span>
    </button>
  );
}
