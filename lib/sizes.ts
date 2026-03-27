// Category-specific size systems for FASON
// Used in sell form, filter bar, and anywhere sizes are displayed

export const SELL_CATEGORIES = [
  'Geyim',
  'Şalvar / Ətək',
  'Ayaqqabı (Q)',
  'Ayaqqabı (K)',
  'Uşaq geyimi',
  'Çanta',
  'Aksesuar',
  'İdman geyimi',
]

export const SIZES_BY_CATEGORY: Record<string, string[]> = {
  'Geyim':         ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Universal'],
  'Şalvar / Ətək': ['24','25','26','27','28','29','30','31','32','33','34','36','38','40','42','44','Universal'],
  'Ayaqqabı (Q)':  ['35','36','37','38','39','40','41','42','43','44','45','46'],
  'Ayaqqabı (K)':  ['39','40','41','42','43','44','45','46'],
  'Uşaq geyimi':   ['68','74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164'],
  'Çanta':         ['Universal'],
  'Aksesuar':      ['Universal'],
  'İdman geyimi':  ['XS','S','M','L','XL','XXL','44','46','48','50','52','54'],
}

// For homepage FilterBar — broader categories map to their size ranges
export const FILTER_SIZES_BY_CATEGORY: Record<string, string[]> = {
  'Geyim':    ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Universal'],
  'Ayaqqabı': ['35','36','37','38','39','40','41','42','43','44','45','46'],
  'Aksesuar': ['Universal'],
  'Çanta':    ['Universal'],
}

export const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Universal']
