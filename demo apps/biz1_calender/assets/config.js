/**
 * Biz1 Showcase — tenant connection
 *
 * Set `user` to your Bull36 subdomain only (no https, no .bull36.com).
 * All API / SDK calls use: https://{user}.bull36.com/app/...
 *
 * Example:
 *   user: 'eli'  →  https://eli.bull36.com/app/Login
 */
window.Biz1Config = {
  /** Bull36 account / subdomain name */
  user: 'demo',

  /**
   * Public Appointment Builder (Quick Booking slots / services)
   * Used by Public.AppointmentBuilder.Slots / .Submit
   */
  accountUserId: 47,
  builderPageId: 3001,
  builderId: null,
  appointmentTypeId: 8,

  /** Loyalty punch-card: visits needed for free reward */
  loyaltyPunchTarget: 10,

  /** App display name */
  brand: {
    he: 'Biz1 Bookings',
    en: 'Biz1 Bookings'
  }
};
