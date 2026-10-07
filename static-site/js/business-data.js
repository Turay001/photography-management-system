/* ================================================================== */
/*  Critical Assistant — centralized business knowledge & configuration */
/*  Single place to edit studio facts, pricing, policies, and the      */
/*  Google Sheets endpoint. The rule-based assistant reads everything  */
/*  from here — there is no machine learning model involved.           */
/* ================================================================== */
window.CRITICAL_AI_CONFIG = {
  assistant: {
    name: 'Critical Assistant',
    tagline: 'Your rule-based photography assistant',
    greeting:
      "Hello! I'm Critical Assistant, Critical Shot's rule-based digital receptionist. " +
      "I answer from predefined responses and keyword matching — I can explain our services and packages, " +
      "share prices, check delivery times, or collect your details to book a shoot. What are you planning?",
    fallback:
      "I don't have that information available right now. Let me connect you with the Critical Shot team — " +
      "you can reach us at +232 99 738064 or kamaraabdulrahman547@gmail.com.",
    suggestedPrompts: [
      'I want to book a photoshoot',
      'What photography services do you offer?',
      'How much is a wedding photoshoot?',
      'I need coverage for an event',
      'Where is your studio?',
      'When will I receive my photos?',
      'I want to book a session'
    ],
    quickSuggestions: [
      'Services & pricing',
      'Wedding photography',
      'Videography',
      'Drone coverage',
      'Book a shoot',
      'Contact the team'
    ]
  },

  business: {
    name: 'Critical Shot',
    founder: 'Abdul Rahman Kamara',
    founderRole: 'Founder & CEO',
    about:
      'Critical Shot is a professional photography, videography and creative media studio in Freetown, Sierra Leone. ' +
      'We capture portraits, weddings, corporate events and brand content, and shape them into stories with real creative direction.',
    contact: {
      phone: '+232 99 738064',
      whatsapp: '+232 99 738064',
      email: 'kamaraabdulrahman547@gmail.com',
      callHref: 'tel:+23299738064',
      mailHref: 'mailto:kamaraabdulrahman547@gmail.com'
    },
    studio: {
      location: 'Freetown, Sierra Leone',
      travel: 'We travel across Freetown and the wider region for location shoots, weddings and events.'
    },
    hours: {
      office: 'Monday to Saturday, 9:00 AM – 6:00 PM',
      shoot: 'Shoots are scheduled around you — including weekends and early mornings.'
    },
    delivery: {
      photos: 'Edited photos are typically delivered within a few days to two weeks depending on the project.',
      video: 'Video delivery depends on the edit complexity and is confirmed with your quote.',
      guarantee: 'We confirm exact delivery timelines in writing with your booking confirmation.'
    },
    policies: {
      bookingWindow: 'Bookings can be made 1 to 30 days in advance of the shoot date.',
      confirmation: 'After you submit a request, our team confirms availability and locks the final price within 24 hours.',
      reschedule: 'Rescheduling is easy — just let us know at least 24 hours before your shoot.',
      cancellation: 'Cancellations should be made at least 24 hours before the scheduled time.'
    },
    payment: {
      quote: 'Every project starts with a transparent written quote — no hidden fees.',
      plans: 'Flexible payment plans are available and are confirmed with your booking.'
    }
  },

  /* The AI's source of truth for services + starting prices. */
  services: [
    {
      id: 'photography', name: 'Photography', icon: 'camera',
      keywords: ['photograph', 'photo shoot', 'photoshoot', 'pictures', 'photos', 'stills', 'shoot', 'session', 'portrait', 'camera'],
      description: 'Professional photography for individuals, businesses and events — composed, lit and edited to a premium standard.',
      includes: ['Portraits', 'Studio Photography', 'Weddings', 'Birthdays', 'Corporate Events', 'Product Photography', 'Fashion Photography', 'Creative Concepts'],
      startingPrice: 800,
      startingPriceLabel: 'Personal portraits from Le 800',
      pricingNote: 'Final pricing depends on the type of shoot, duration, location and production complexity.'
    },
    {
      id: 'videography', name: 'Videography', icon: 'video',
      keywords: ['video', 'videography', 'film', 'videograph', 'footage', 'movies', 'cinematic', 'documentary', 'vlog'],
      description: 'Professional video production for people, brands and events — from cinematic wedding films to corporate promos.',
      includes: ['Wedding Films', 'Event Videography', 'Corporate Videos', 'Documentary Production', 'Promotional Videos', 'Social Media Content'],
      startingPrice: 2000,
      startingPriceLabel: 'Social media content from Le 2,000',
      pricingNote: 'Wedding films from Le 8,000; event videography from Le 5,000; corporate video from Le 10,000; documentaries from Le 15,000.'
    },
    {
      id: 'wedding', name: 'Wedding Photography & Film', icon: 'camera',
      keywords: ['wedding', 'marriage', 'bride', 'groom', 'nuptial', 'traditional', 'engagement', 'wedding film'],
      description: 'Complete wedding coverage — stills and film — built around your big day.',
      includes: ['Wedding Photography (from Le 5,000)', 'Full-day packages (Le 8,000 – Le 12,000)', 'Cinematic Wedding Films (from Le 8,000, premium Le 15,000 – Le 25,000)'],
      startingPrice: 5000,
      startingPriceLabel: 'Wedding photography from Le 5,000',
      pricingNote: 'Full-day photography packages run Le 8,000 – Le 12,000; cinematic films Le 15,000 – Le 25,000.'
    },
    {
      id: 'event', name: 'Event Coverage', icon: 'calendar',
      keywords: ['event', 'coverage', 'party', 'birthday', 'concert', 'conference', 'graduation', 'corporate event', 'private event', 'gala'],
      description: 'Documenting occasions — corporate conferences, concerts, graduations, birthdays and private parties.',
      includes: ['Birthday / Private Events (from Le 3,000)', 'Corporate Events (from Le 5,000)', 'Conferences & Galas'],
      startingPrice: 3000,
      startingPriceLabel: 'Event coverage from Le 3,000',
      pricingNote: 'Corporate events from Le 5,000; add videography for full-day storytelling.'
    },
    {
      id: 'corporate', name: 'Corporate / Commercial', icon: 'dashboard',
      keywords: ['corporate', 'commercial', 'business', 'brand', 'advert', 'promo', 'company', 'office', 'product'],
      description: 'Business content — product photography, corporate video, brand campaigns and promotional content.',
      includes: ['Product Photography', 'Corporate Video (from Le 10,000)', 'Brand Campaigns', 'Social Media Content Packages (monthly from Le 10,000)'],
      startingPrice: 10000,
      startingPriceLabel: 'Corporate video from Le 10,000',
      pricingNote: 'Monthly social content packages start at Le 10,000.'
    },
    {
      id: 'drone', name: 'Drone / Aerial', icon: 'drone',
      keywords: ['drone', 'aerial', 'flyover', 'air', 'bird\'s eye', 'real estate', 'landscape', 'sky'],
      description: 'Aerial photography and videography that adds scale and drama to any production.',
      includes: ['Aerial Photography & Videography', 'Property & Real Estate', 'Event Flyovers', 'Landscape & Travel'],
      startingPrice: 3000,
      startingPriceLabel: 'Aerial coverage from Le 3,000',
      pricingNote: 'Pricing scales with flight time, area and production complexity.'
    },
    {
      id: 'creative', name: 'Creative Media / Editing', icon: 'edit',
      keywords: ['editing', 'edit', 'retouch', 'retouching', 'color grading', 'motion graphics', 'post production', 'post-production', 'photoshop'],
      description: 'Professional post-production — color grading, retouching, video editing and motion graphics.',
      includes: ['Photo Retouching', 'Color Grading', 'Video Editing', 'Motion Graphics', 'Content Packages'],
      startingPrice: 2000,
      startingPriceLabel: 'Editing and content packages from Le 2,000',
      pricingNote: 'Priced per project or per image/media asset.'
    }
  ],

  /* Simple price lookups for shoot types — used for estimates only. */
  priceGuide: [
    { type: 'portrait', label: 'Personal portrait session', price: 800 },
    { type: 'studio', label: 'Studio session', price: 1500 },
    { type: 'couple', label: 'Couple session', price: 2000 },
    { type: 'birthday', label: 'Birthday / private event', price: 3000 },
    { type: 'event', label: 'Event coverage', price: 3000 },
    { type: 'corporate', label: 'Corporate event', price: 5000 },
    { type: 'wedding', label: 'Wedding photography', price: 5000 },
    { type: 'wedding-full', label: 'Full-day wedding package', price: 8000 },
    { type: 'event-video', label: 'Event videography', price: 5000 },
    { type: 'wedding-video', label: 'Wedding videography', price: 8000 },
    { type: 'corporate-video', label: 'Corporate video', price: 10000 },
    { type: 'documentary', label: 'Documentary production', price: 15000 },
    { type: 'social', label: 'Social media content', price: 2000 },
    { type: 'drone', label: 'Aerial / drone coverage', price: 3000 }
  ],

  /* Currency */
  currency: 'Le',

  /* Booking flow configuration */
  booking: {
    /* The one canonical set of fields the assistant collects and submits. */
    fields: [
      { key: 'name', label: 'Customer Name' },
      { key: 'phone', label: 'Phone/WhatsApp' },
      { key: 'email', label: 'Email' },
      { key: 'service', label: 'Service' },
      { key: 'shootType', label: 'Shoot Type' },
      { key: 'eventDate', label: 'Event Date' },
      { key: 'time', label: 'Event Time' },
      { key: 'location', label: 'Location' },
      { key: 'people', label: 'Number of People' },
      { key: 'packageName', label: 'Package' },
      { key: 'price', label: 'Estimated Price' },
      { key: 'requirements', label: 'Requirements' }
    ],
    /* Google Sheet column headers (order matters). */
    sheetColumns: [
      'Booking ID',
      'Date Submitted',
      'Customer Name',
      'Phone/WhatsApp',
      'Email',
      'Service',
      'Shoot Type',
      'Event Date',
      'Event Time',
      'Location',
      'Package',
      'Price',
      'Requirements',
      'Status',
      'AI Conversation ID',
      'Notes'
    ],
    statuses: ['New', 'Pending', 'Confirmed', 'Completed', 'Cancelled']
  },

  /* ------------------------- integration config --------------------- */
  config: {
    /* Google Sheets web-app URL produced by deploying
       /google-apps-script/gs-sheet-submit.gs. When empty, the assistant
       only stores bookings locally and says so honestly. */
    sheetsEndpoint: 'https://script.google.com/macros/s/AKfycbyg1V0uL-4YkYxFstU9vXcVH2CoRPyH2bVffTAe9_-8BgwXmgy69uoaZonvSndf2S55/exec',
    /* Per-visitor cooldown between booking submissions (seconds). */
    rateLimitSeconds: 20,
    minMessageLength: 1,
    maxMessageLength: 500,
    /* Local draft + conversation storage keys. */
    storage: {
      draft: 'critical_ai_draft_v1',
      conversation: 'critical_ai_history_v1'
    },
    /* Show the floating "Ask the assistant" button on pages that have no
       inline chat widget mounted (#ai-mount). */
    launcher: true
  }
};