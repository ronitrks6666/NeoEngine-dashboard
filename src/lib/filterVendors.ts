import type { VendorContact, VendorType } from '@/api/vendor';

function vendorContactMatchesSearch(contact: VendorContact, term: string, searchDigits: string) {
  if (contact.name.toLowerCase().includes(term)) return true;
  if (contact.note && contact.note.toLowerCase().includes(term)) return true;
  if (searchDigits) {
    return (contact.phones || []).some((p) => String(p).includes(searchDigits));
  }
  return (contact.phones || []).some((p) => p.toLowerCase().includes(term));
}

export function filterVendorTypes(types: VendorType[], search: string): VendorType[] {
  const q = search.trim();
  if (!q) return types;

  const term = q.toLowerCase();
  const searchDigits = q.replace(/\D/g, '');

  return types
    .map((type) => {
      const typeNameMatches = type.name.toLowerCase().includes(term);
      if (typeNameMatches) return type;

      const matchingVendors = type.vendors.filter((vendor) =>
        vendorContactMatchesSearch(vendor, term, searchDigits)
      );
      if (matchingVendors.length === 0) return null;
      return { ...type, vendors: matchingVendors };
    })
    .filter((type): type is VendorType => type !== null);
}
