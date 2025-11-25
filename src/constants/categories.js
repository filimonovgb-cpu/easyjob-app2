export const CATEGORIES = [
  { id: '1', name: 'plumber', icon: 'water', color: '#3498db' },
  { id: '2', name: 'electrician', icon: 'flash', color: '#f39c12' },
  { id: '3', name: 'cleaner', icon: 'brush', color: '#9b59b6' },
  { id: '4', name: 'carpenter', icon: 'hammer', color: '#e67e22' },
  { id: '5', name: 'painter', icon: 'color-palette', color: '#e74c3c' },
  { id: '6', name: 'locksmith', icon: 'key', color: '#34495e' }
];

export const getCategoryById = (id) => {
  return CATEGORIES.find(cat => cat.id === id);
};

export const getCategoryByName = (name) => {
  return CATEGORIES.find(cat => cat.name === name);
};
