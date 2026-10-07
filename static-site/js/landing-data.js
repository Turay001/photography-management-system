/* ================================================================== */
/*  Critical Shot — landing page content data                          */
/* ================================================================== */
window.LANDING_DATA = {
  aboutFeatures: [
    'Professional equipment', 'Creative direction', 'Professional editing', 'Event coverage', 'Drone production'
  ],
  aboutPoints: [
    { icon: 'camera', label: 'Photography' },
    { icon: 'video', label: 'Videography' },
    { icon: 'spark', label: 'Creative Direction' },
    { icon: 'building', label: 'Business Content' }
  ],
  services: [
    {
      title: 'Photography', tagline: 'Stills that speak',
      description: 'Professional photography for individuals, businesses and events — composed, lit and edited to a premium standard.',
      icon: 'camera', gradient: 'linear-gradient(135deg,#1a1a1f,#000)', image: 'images/pic.jpg',
      items: ['Portraits', 'Studio Photography', 'Weddings', 'Birthdays', 'Corporate Events', 'Product Photography', 'Fashion Photography', 'Creative Concepts']
    },
    {
      title: 'Videography', tagline: 'Stories in motion',
      description: 'Professional video production for people, brands and events — from cinematic wedding films to corporate promos.',
      icon: 'video', gradient: 'linear-gradient(135deg,#141419,#000)', image: 'images/imgp.jpg',
      items: ['Wedding Films', 'Event Videography', 'Corporate Videos', 'Documentary Production', 'Promotional Videos', 'Social Media Content']
    },
    {
      title: 'Drone', tagline: 'A new perspective',
      description: 'Aerial photography and videography that adds scale, drama and a cinematic edge to any production.',
      icon: 'drone', gradient: 'linear-gradient(135deg,#1c0e1e,#000)',
      items: ['Aerial Photography', 'Aerial Videography', 'Property & Real Estate', 'Event Flyovers', 'Landscape & Travel']
    },
    {
      title: 'Creative Media', tagline: 'Post-production power',
      description: 'Professional editing and digital content production — color grading, retouching, motion graphics and more.',
      icon: 'edit', gradient: 'linear-gradient(135deg,#141020,#000)',
      items: ['Photo Retouching', 'Color Grading', 'Video Editing', 'Motion Graphics', 'Content Packages']
    }
  ],
  photoStyles: [
    { title: 'Classic Portrait', description: 'Timeless, clean and refined', gradient: 'linear-gradient(135deg,#1b1b22,#0d0d11,#000)', image: 'images/pic.jpg' },
    { title: 'Cinematic Portrait', description: 'Dramatic light, film-like color', gradient: 'linear-gradient(135deg,#1b1b20,#0d0d11,#000)', image: 'images/hero-background.jpg' },
    { title: 'Luxury', description: 'Editorial polish, premium feel', gradient: 'linear-gradient(135deg,#17171b,#0d0d11,#000)', image: 'images/imgp.jpg' },
    { title: 'Lifestyle', description: 'Candid, natural, human', gradient: 'linear-gradient(135deg,#131319,#0d0d11,#000)', image: 'images/wedding.jpg' },
    { title: 'Fashion Editorial', description: 'Bold, styled, runway energy', gradient: 'linear-gradient(135deg,#18181d,#0d0d11,#000)', image: 'images/port placeholder.jpg' },
    { title: 'Creative Concept', description: 'Art-directed, imaginative', gradient: 'linear-gradient(135deg,#14141a,#0d0d11,#000)', image: 'images/album-placeholder.jpg' }
  ],
  videoStyles: [
    { title: 'Cinematic', description: 'Film-grade storytelling', gradient: 'linear-gradient(135deg,#1b1b20,#0d0d11,#000)', image: 'images/hero-background.jpg' },
    { title: 'Documentary', description: 'Raw, authentic, real', gradient: 'linear-gradient(135deg,#131319,#0d0d11,#000)', image: 'images/imgp.jpg' },
    { title: 'Event Highlight', description: 'The best moments, cut tight', gradient: 'linear-gradient(135deg,#18181d,#0d0d11,#000)', image: 'images/portfolo placeholder.jpg' },
    { title: 'Commercial', description: 'Brand-focused production', gradient: 'linear-gradient(135deg,#17171b,#0d0d11,#000)', image: 'images/album-placeholder.jpg' },
    { title: 'Social Media', description: 'Vertical-first, scroll-stopping', gradient: 'linear-gradient(135deg,#121218,#0d0d11,#000)', image: 'images/port placeholder.jpg' }
  ],
  portfolioFilters: ['ALL', 'PORTRAITS', 'WEDDINGS', 'EVENTS', 'FASHION', 'COMMERCIAL', 'VIDEOS'],
  portfolio: [
    { id: 'p1', title: 'Studio Portrait Series', category: 'PORTRAITS', location: 'Freetown', note: 'Studio Session', image: 'images/pic.jpg' },
    { id: 'p2', title: 'City Bride Collection', category: 'WEDDINGS', location: 'Lumley', note: 'Wedding Photography', image: 'images/wedding.jpg' },
    { id: 'p3', title: 'Corporate Gala', category: 'EVENTS', location: 'Freetown', note: 'Event Coverage', image: 'images/imgp.jpg' },
    { id: 'p4', title: 'Fashion Editorial', category: 'FASHION', location: 'Goderich', note: 'Stlyed Shoot', image: 'images/port placeholder.jpg' },
    { id: 'p5', title: 'Product Campaign', category: 'COMMERCIAL', location: 'Studio', note: 'Commercial Production', image: 'images/album-placeholder.jpg' },
    { id: 'p6', title: 'Brand Film', category: 'VIDEOS', location: 'Freetown', note: 'Cinematic Video', image: 'images/hero-background.jpg' },
    { id: 'p7', title: 'Documentary Stills', category: 'EVENTS', location: 'Across Sierra Leone', note: 'Documentary', image: 'images/portfolo placeholder.jpg' },
    { id: 'p8', title: 'Portrait — Creative Concept', category: 'PORTRAITS', location: 'Studio', note: 'Creative Concept', image: 'images/portfolo placeholder.jpg' },
    { id: 'p9', title: 'Event Highlight Film', category: 'VIDEOS', location: 'Freetown', note: 'Event Highlight', image: 'images/imgp.jpg' }
  ],
  aspects: {
    p1: '4/5', p2: '3/4', p3: '4/3', p4: '3/4', p5: '1/1', p6: '16/10', p7: '4/3', p8: '4/5', p9: '16/9'
  },
  pricingGroups: [
    { key: 'photography', label: 'Stills', tag: 'Photography' },
    { key: 'video', label: 'Motion', tag: 'Videography' },
    { key: 'drone', label: 'Air', tag: 'Drone' }
  ],
  pricing: [
    { name: 'Personal Portrait', price: 'Le 800', type: 'photography', includes: ['1-hour session', 'Professional lighting', '10 edited photos'] },
    { name: 'Studio Session', price: 'Le 1,500', type: 'photography', includes: ['Studio session', 'Multiple poses', '15 edited photos'] },
    { name: 'Couple Session', price: 'Le 2,000', type: 'photography', includes: ['Studio or location', '20 edited photos'] },
    { name: 'Birthday / Private Event', price: 'Le 3,000', note: 'From', type: 'photography' },
    { name: 'Corporate Event', price: 'Le 5,000', note: 'From', type: 'photography' },
    { name: 'Wedding Photography', price: 'Le 5,000', note: 'From', type: 'photography', includes: ['Full-day packages: Le 8,000 – Le 12,000'] },
    { name: 'Event Videography', price: 'Le 5,000', note: 'From', type: 'video', includes: ['Premium: Le 10,000 – Le 15,000'] },
    { name: 'Wedding Videography', price: 'Le 8,000', note: 'From', type: 'video', includes: ['Cinematic: Le 15,000 – Le 25,000'] },
    { name: 'Corporate Video', price: 'Le 10,000', note: 'From', type: 'video' },
    { name: 'Documentary', price: 'Le 15,000', note: 'From', type: 'video' },
    { name: 'Social Media Content', price: 'Le 2,000', note: 'From', type: 'video', includes: ['Monthly packages: from Le 10,000'] },
    { name: 'Drone Coverage', price: 'Le 3,000', note: 'From', type: 'drone' }
  ],
  faqs: [
    { q: 'What photography services do you offer?', a: 'We offer portraits, studio photography, weddings, birthdays, corporate events, product photography, fashion photography and creative concepts — all captured and edited to a professional standard.' },
    { q: 'How much does a photoshoot cost?', a: 'Our packages start from Le 800 for personal portraits. Final pricing depends on the type of shoot, duration, location and production complexity. Use our rule-based booking assistant or booking form for a tailored estimate.' },
    { q: 'Do you cover weddings?', a: 'Yes. Wedding photography starts from Le 5,000 and full-day packages range from Le 8,000 to Le 12,000. Cinematic wedding films start from Le 8,000.' },
    { q: 'Do you provide videography?', a: 'Yes — wedding films, event videography, corporate videos, documentaries, promotional videos and social media content.' },
    { q: 'Do you offer drone coverage?', a: 'Yes. Aerial photography and videography is available for events, real estate, landscapes and commercial productions from Le 3,000.' },
    { q: 'Can I request a custom package?', a: 'Absolutely. Almost every project is tailored. Share your plans with us and we will design a package around your needs and budget.' },
    { q: 'How do I book?', a: 'Talk to the Critical Shot assistant on this page, or send a booking request through our form. We will confirm availability, pricing and details with you directly.' },
    { q: 'How long does delivery take?', a: 'Edited photos are typically delivered within a few days to two weeks depending on the project. Video delivery depends on the edit\'s complexity — we\'ll confirm a timeline with your quote.' },
    { q: 'Do you cover events outside the studio?', a: 'Yes. We travel for location shoots, weddings and events across Freetown and the wider region for covered events.' }
  ],
  aiFeatures: ['Instant answers', 'Package guidance', 'Booking assistance', 'Custom quote requests'],
  whyPoints: [
    { title: 'PROFESSIONAL QUALITY', description: 'High-quality photography and video production, delivered consistently.' },
    { title: 'CREATIVE DIRECTION', description: 'Creative concepts designed around your vision and story.' },
    { title: 'MODERN PRODUCTION', description: 'Professional cameras, lighting, editing and production tools.' },
    { title: 'PERSONAL SERVICE', description: 'We work closely with clients from planning to final delivery.' }
  ]
};