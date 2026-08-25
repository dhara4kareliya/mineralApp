/**
 * Payment Form — tenant connection
 *
 * Set `user` to your Bull36 subdomain only (no https, no .bull36.com).
 * All API / SDK calls use: https://{user}.bull36.com/app/...
 *
 * Each Biz1 account has its own apps — change `user` for this payment module.
 * COMPANY + GATEWAY dropdowns load live from the logged-in account (no shared seeds).
 */
window.Biz1Config = {
  /** Bull36 account / subdomain name */
  user: 'judoIL11',

  /**
   * Fallback PRODUCT/ITEM options when live ajaxPro returns empty for a type.
   * Prefer real account ids (created/verified on dharaKareliya1).
   */
  seedPaymentFormItems: {
    appointment_type: [
      { id: '1081', name: 'Consultation' },
      { id: '1082', name: 'Follow-up Visit' },
      { id: '1083', name: 'Therapy Session' }
    ],
    appointment_group: [
      { id: '538', name: 'Standard Package' }
    ],
    product: [
      { id: '200536', name: 'bag' },
      { id: '200199', name: 'penn' },
      { id: '200046', name: 'bottle' },
      { id: '200043', name: 'bike' },
      { id: '199790', name: 'toys' }
    ],
    order: [],
    subscription: []
  },

  guestTokenSecret: 'pf-payment-form-guest-v1',

  /** App display name — Hebrew + English */
  brand: {
    he: 'טופס תשלום',
    en: 'Payment Form'
  }
};
