// Category / subcategory / size system for FASON (Azerbaijani terminology)

export const CATEGORIES = [
  'Üst geyim',
  'Alt geyim',
  'Bütöv geyim',
  'Alt paltarı və ev geyimi',
  'Ayaqqabı',
  'Aksesuar',
  'Çanta',
  'İdman geyimi',
]

export const CATEGORY_EMOJIS: Record<string, string> = {
  'Üst geyim': '👕',
  'Alt geyim': '👖',
  'Bütöv geyim': '👗',
  'Alt paltarı və ev geyimi': '🩲',
  'Ayaqqabı': '👟',
  'Aksesuar': '💍',
  'Çanta': '👜',
  'İdman geyimi': '🏃',
}

export const SUBCATEGORIES: Record<string, string[]> = {
  'Üst geyim': ['Qısaqol köynək', 'Köynək', 'Qadın köynəyi', 'Papaqlı üst', 'Toxunma üst', 'Düyməli toxunma üst', 'Kürdə', 'Pencək', 'Gödəkçə', 'Palto', 'Yağmurluq', 'İncə üstlük'],
  'Alt geyim': ['Şalvar', 'Cins şalvar', 'Qısa şalvar', 'Ətək', 'Dar şalvar', 'İdman şalvarı'],
  'Bütöv geyim': ['Don', 'Ziyafət libası', 'Bütöv geyim', 'Dəst şalvar-pencək', 'İdman dəsti'],
  'Alt paltarı və ev geyimi': ['Alt paltarı', 'Döşlük', 'Yataq geyimi', 'Gecəlik', 'Hamam geyimi', 'Corab', 'İncə corab'],
  'Ayaqqabı': ['İdman ayaqqabısı', 'Kətan ayaqqabı', 'Mokasin', 'Klassik ayaqqabı', 'Hündürdaban ayaqqabı', 'Uzunboğaz ayaqqabı', 'Sandal', 'Ev ayaqqabısı'],
  'Aksesuar': ['Qurşaq', 'Qalstuk', 'Şərf', 'Şal', 'Əlcək', 'Papaq', 'Günəş eynəyi', 'Qol saatı', 'Pul qabı', 'Zinət əşyaları'],
  'Çanta': ['Əl çantası', 'Sırt çantası', 'Kiçik əl çantası', 'Çətir'],
  'İdman geyimi': ['İdman üstü', 'İdman şalvarı', 'İdman dəsti', 'İdman ayaqqabısı'],
}

export const SIZES_BY_SUBCATEGORY: Record<string, string[]> = {
  // Üst geyim
  'Qısaqol köynək': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  'Köynək': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  'Qadın köynəyi': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Papaqlı üst': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Toxunma üst': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Düyməli toxunma üst': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Kürdə': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Pencək': ['44', '46', '48', '50', '52', '54', '56'],
  'Gödəkçə': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Palto': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Yağmurluq': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'İncə üstlük': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  // Alt geyim
  'Şalvar': ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42', '44'],
  'Cins şalvar': ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40'],
  'Qısa şalvar': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Ətək': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '34', '36', '38', '40', '42', '44'],
  'Dar şalvar': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'İdman şalvarı': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  // Bütöv geyim
  'Don': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '34', '36', '38', '40', '42', '44'],
  'Ziyafət libası': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Bütöv geyim': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Dəst şalvar-pencək': ['44', '46', '48', '50', '52', '54'],
  'İdman dəsti': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  // Alt paltar
  'Alt paltarı': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Döşlük': ['70A', '70B', '70C', '75A', '75B', '75C', '80A', '80B', '80C', '85A', '85B', '85C', '90B', '90C'],
  'Yataq geyimi': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Gecəlik': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Hamam geyimi': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Corab': ['36-38', '38-40', '40-42', '42-44'],
  'İncə corab': ['36-38', '38-40', '40-42'],
  // Ayaqqabı
  'İdman ayaqqabısı': ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
  'Kətan ayaqqabı': ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  'Mokasin': ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
  'Klassik ayaqqabı': ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
  'Hündürdaban ayaqqabı': ['35', '36', '37', '38', '39', '40', '41'],
  'Uzunboğaz ayaqqabı': ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  'Sandal': ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
  'Ev ayaqqabısı': ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
  // Aksesuar
  'Qurşaq': ['XS', 'S', 'M', 'L', 'XL'],
  'Qalstuk': ['Universal'],
  'Şərf': ['Universal'],
  'Şal': ['Universal'],
  'Əlcək': ['XS', 'S', 'M', 'L', 'XL'],
  'Papaq': ['XS', 'S', 'M', 'L', 'XL'],
  'Günəş eynəyi': ['Universal'],
  'Qol saatı': ['Universal'],
  'Pul qabı': ['Universal'],
  'Zinət əşyaları': ['Universal'],
  // Çanta
  'Əl çantası': ['Universal'],
  'Sırt çantası': ['Universal'],
  'Kiçik əl çantası': ['Universal'],
  'Çətir': ['Universal'],
  // İdman geyimi
  'İdman üstü': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
}

// For FilterBar — representative sizes per top-level category
export const FILTER_SIZES_BY_CATEGORY: Record<string, string[]> = {
  'Üst geyim': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  'Alt geyim': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38'],
  'Bütöv geyim': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '34', '36', '38', '40', '42', '44'],
  'Alt paltarı və ev geyimi': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Ayaqqabı': ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
  'Aksesuar': ['Universal'],
  'Çanta': ['Universal'],
  'İdman geyimi': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
}

export const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Universal']
