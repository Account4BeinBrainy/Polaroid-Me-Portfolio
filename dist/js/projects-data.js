const slides = (folder, count) => Array.from({ length: count }, (_, i) => ({
  src: `/assets/projects/${folder}/slides/slide-${String(i + 1).padStart(2, '0')}.jpg`, alt: `Presentation page ${i + 1}`
}));
const photos = (folder, extensions) => extensions.map((extension, i) => ({
  src: `/assets/projects/${folder}/gallery/${String(i + 1).padStart(2, '0')}.${extension}`, alt: '', caption: ''
}));

export const projects = [
  {
    id: 'project-01', website: 'https://dallasaurora.com', title: 'AURORA Dallas — Audience & Social Media Strategy', coverUrl: '/assets/projects/covers-srgb/aurora-square-srgb-v2.png',
    slides: slides('01-aurora', 12), photos: [...photos('01-aurora', Array(5).fill('jpg')).map(photo=>({ ...photo, fit:'cover', position:'center bottom' })), ...['aurora.JPG','auroroa2.JPG'].map(name=>({src:`/assets/projects/01-aurora/gallery/${name}`,alt:'AURORA Dallas',caption:''}))],
    description: `AURORA Dallas is a nonprofit arts organization that produces large-scale public exhibitions and immersive experiences at the intersection of art, technology, and the urban environment.

I worked on AURORA Dallas’s audience and social media strategy, with a focus on understanding who the event was trying to reach and how its digital presence could work harder. My role covered customer journey mapping, competitor SWOT analysis, and a full social media audit across key platforms. Based on those findings, I helped shape a clearer content and channel strategy for Instagram, TikTok, and LinkedIn.

After the strategy was put into use, AURORA’s social media following and content views increased by around 20%.

I also volunteered at the AURORA Biennial, which gave me direct exposure to the event experience and attendee behavior. That helped me connect the digital customer journey with what people were actually seeing and doing on site.`
  },
  {
    id: 'project-02', website: 'https://www.artsmissionoc.org', title: 'Arts Mission Oak Cliff — Brand Refresh & Fundraising Campaign', coverUrl: '/assets/projects/covers-srgb/amoc-srgb-v2.png',
    slides: slides('02-amoc', 7), photos: photos('02-amoc', ['jpg','jpg','jpg','jpg','jpg','jpg','jpg','png']),
    description: `I served as the Artistic Director for this project with Arts Mission Oak Cliff (AMOC), a Dallas-based nonprofit arts organization.

I independently redesigned AMOC’s institutional brochure from the ground up, including the visual direction, layout, and overall presentation. I was also responsible for the full visual identity of Play It Forward, a fundraising event created for AMOC.

Beyond the visual work, I helped shape the event flow and took part in on-site execution. The event raised more than $1,000 for the organization.

This project brought together brand communication, visual design, event planning, and fundraising in one practical campaign.`
  },
  {
    id: 'project-03', pdf: {src:'/assets/projects/03-galerie/documents/fy2024-statements-fy2025-budget.pdf', title:'FY2024 Financial Statements and FY2025 Budget'}, title: 'La Galerie Éphémère — Financial & Marketing Planning', coverUrl: '/assets/projects/covers-srgb/galerie-srgb-v2.png',
    slides: slides('03-galerie/la-20260923', 8), photos: [],
    description: `For La Galerie Éphémère, I worked on a financial and operating plan for a nonprofit installation-art gallery concept in Shanghai.

I reviewed the gallery’s revenue structure, program expenses, fundraising performance, and financial ratios, then used that analysis to build a FY2025 budget and growth plan. The proposal included a 10% increase in program spending and a 25% increase in marketing investment, together with higher targets for sponsorship, foundation support, fundraising events, and in-kind contributions.

The project gave me experience turning financial data into practical decisions about marketing spend, resource allocation, and organizational growth.`
  },
  {
    id: 'project-04', website: 'https://www.quartierdesspectacles.com', title: 'Quartier des Spectacles — SEO, SEM & Paid Media Strategy', coverUrl: '/assets/projects/covers-srgb/quartier-srgb-v2.png',
    slides: slides('04-glissade', 25), photos: [],
    description: `For a digital marketing project for Glissades Gamelin, a winter activation by Montréal’s Quartier des Spectacles, I was responsible for the SEO, SEM, paid media, and campaign timeline sections.

I developed on-site SEO recommendations around page titles, metadata, and search keywords, and built paid media scenarios across Google Ads, Facebook, and Instagram. The media plan considered audience intent, keyword competition, CPC/CPM, reach, and content format.

I also created the campaign timeline, covering pre-launch awareness, seasonal content, conversion activity, and post-event engagement. The plan was built around targets including 10,000 website visits through SEO, 10% Instagram follower growth, and a 15% increase in family attendance.`
  },
  {
    id: 'project-05', website: 'https://int.lesnereides.com', title: 'Les Néréides — TikTok Product Development & Go-to-Market', coverUrl: '/assets/projects/covers-srgb/nereides-srgb-v2.jpg',
    slides: slides('05-nereides', 1), photos: [...['IMG_8089', 'IMG_8091', '03', '04', '05'].map(name => ({ src:`/assets/projects/05-nereides/gallery/${name}.jpg`, alt:'', caption:'' })), { src:'/assets/projects/05-nereides/gallery/06.jpg', alt:'', caption:'', fit:'cover', position:'center top' }],
    description: `At Les Néréides China, I was one of the main people responsible on the local representative-office side for developing a TikTok-focused product.

I took part in questionnaire design, customer preference research, competitor analysis, product design decisions including color and style, pricing, and the e-commerce launch process. I also worked to keep the product aligned with the brand’s wider international positioning while adapting it to the Chinese social-commerce market.

The product is still one of the Top 3 styles in the brand’s TikTok store, with stable sales across TikTok sales channels.`
  }
];
