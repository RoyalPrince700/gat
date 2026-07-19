const SOCIAL_MEDIA_PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter / X' },
];

const SOCIAL_MEDIA_PLATFORM_VALUES = SOCIAL_MEDIA_PLATFORMS.map((p) => p.value);

module.exports = {
  SOCIAL_MEDIA_PLATFORMS,
  SOCIAL_MEDIA_PLATFORM_VALUES,
};
