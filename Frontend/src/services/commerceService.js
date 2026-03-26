import api from './api';

export const getPremiumCatalog = async () => {
  const response = await api.get('/commerce/premium-catalog');
  return response.data;
};

export const getPaymentGatewayStatus = async () => {
  const response = await api.get('/commerce/payment-gateways');
  return response.data;
};

export const createStripeCheckoutSession = async (payload) => {
  const response = await api.post('/commerce/stripe/create-checkout-session', payload);
  return response.data;
};

export const completeStripeCheckout = async (payload) => {
  const response = await api.post('/commerce/stripe/complete-checkout', payload);
  return response.data;
};
