// Environment configuration - set via .env files
const env = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://dfy-be-staging.onrender.com/api/v1',
  signalRUrl: import.meta.env.VITE_SIGNALR_URL || '/taskHub',
  appName: import.meta.env.VITE_APP_NAME || 'DoForYou',
  whatsappNumber: import.meta.env.VITE_WHATSAPP || '27795258611',
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || 'info@doforyou.co.za',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '0795258611',
}

export default env
