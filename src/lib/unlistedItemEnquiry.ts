const WHATSAPP_NUMBER = '2349058977101';

export function unlistedItemEnquiryLink(searchTerm = '') {
  const item = searchTerm.trim();
  const message = item
    ? `Hi CodeTech Gadgets, I’m looking for ${item}, but I couldn’t find it listed on your website. Could you check availability or suggest an alternative?`
    : 'Hi CodeTech Gadgets, I’m looking for a device that I couldn’t find on your website. Could you help me check availability or suggest an alternative?';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
