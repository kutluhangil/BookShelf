export interface CatalogBook {
  id: string;
  title: string;
  author: string;
  category: string;
  coverColor: string;
  description: string;
}

export const RECOMMENDATION_CATALOG: CatalogBook[] = [
  {
    id: 'rec-1',
    title: 'The Wind-Up Bird Chronicle',
    author: 'Haruki Murakami',
    category: 'Literary Fiction',
    coverColor: '#2B3A42',
    description: 'A mesmerizing, surreal journey into the subconscious, involving a missing cat, a disappearing wife, and a hidden well.'
  },
  {
    id: 'rec-2',
    title: 'Dune',
    author: 'Frank Herbert',
    category: 'Science Fiction',
    coverColor: '#D4A373',
    description: 'A stunning blend of adventure and mysticism, environmentalism and politics on the desert planet Arrakis.'
  },
  {
    id: 'rec-3',
    title: 'The Secret History',
    author: 'Donna Tartt',
    category: 'Literary Fiction',
    coverColor: '#4A4E69',
    description: 'Under the influence of their charismatic classics professor, a group of clever, eccentric misfits at an elite New England college discover a way of thinking and living that is a world away from the humdrum existence of their contemporaries.'
  },
  {
    id: 'rec-4',
    title: 'Beloved',
    author: 'Toni Morrison',
    category: 'Historical Fiction',
    coverColor: '#5C3A21',
    description: 'A spellbinding and innovative portrait of a woman haunted by the past.'
  },
  {
    id: 'rec-5',
    title: 'My Name is Red',
    author: 'Orhan Pamuk',
    category: 'Türk Edebiyatı',
    coverColor: '#8B2323',
    description: 'A brilliant murder mystery set among the miniaturists of the Ottoman Empire.'
  },
  {
    id: 'rec-6',
    title: 'The Name of the Rose',
    author: 'Umberto Eco',
    category: 'Historical Fiction',
    coverColor: '#2C251D',
    description: 'A murder mystery set in a 14th-century Italian monastery, combining semiotics, biblical analysis, medieval studies, and literary theory.'
  },
  {
    id: 'rec-7',
    title: 'Neuromancer',
    author: 'William Gibson',
    category: 'Science Fiction',
    coverColor: '#1A1A1A',
    description: 'The matrix has its roots here. A groundbreaking cyberpunk classic.'
  },
  {
    id: 'rec-8',
    title: 'The Left Hand of Darkness',
    author: 'Ursula K. Le Guin',
    category: 'Science Fiction',
    coverColor: '#4B6B7A',
    description: 'A groundbreaking exploration of gender and sociology on a frozen alien world.'
  },
  {
    id: 'rec-9',
    title: 'Kafka on the Shore',
    author: 'Haruki Murakami',
    category: 'Literary Fiction',
    coverColor: '#6B4C5A',
    description: 'Two remarkable characters, a teenage boy and an aging simpleton, are drawn into a world of talking cats and fish raining from the sky.'
  },
  {
    id: 'rec-10',
    title: 'The Shadow of the Wind',
    author: 'Carlos Ruiz Zafón',
    category: 'Historical Fiction',
    coverColor: '#3A332A',
    description: 'A boy discovers a mysterious book in the Cemetery of Forgotten Books in Barcelona.'
  },
  {
    id: 'rec-11',
    title: '1984',
    author: 'George Orwell',
    category: 'Classic Fiction',
    coverColor: '#2B2B2B',
    description: 'Among the seminal texts of the 20th century, a terrifying vision of a totalitarian future.'
  },
  {
    id: 'rec-12',
    title: 'Fahrenheit 451',
    author: 'Ray Bradbury',
    category: 'Classic Fiction',
    coverColor: '#A83232',
    description: 'A dystopian novel about a future American society where books are outlawed and "firemen" burn any that are found.'
  }
];
