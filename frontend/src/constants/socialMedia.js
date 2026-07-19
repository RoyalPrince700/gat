export const SOCIAL_MEDIA_PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter / X' },
];

export const PLATFORM_COLORS = {
  facebook: '#1877F2',
  linkedin: '#0A66C2',
  instagram: '#E4405F',
  twitter: '#1D9BF0',
};

export const platformLabel = (value) =>
  SOCIAL_MEDIA_PLATFORMS.find((p) => p.value === value)?.label || value;
