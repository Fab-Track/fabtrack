import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { placeId } = await req.json().catch(() => ({}));
    if (!placeId) return Response.json({ error: 'placeId is required' }, { status: 400 });

    const res = await base44.asServiceRole.connectors.callApi("google_maps", {
      method: "GET",
      host: "places",
      path: `/v1/places/${placeId}`,
      query: { fields: "formattedAddress,addressComponents,location" }
    });

    const place = res.data || {};
    const comps = place.addressComponents || [];

    const find = (type) => comps.find(c => c.types?.includes(type));
    const streetNumber = find("street_number");
    const route = find("route");
    const street = [streetNumber?.longText, route?.longText].filter(Boolean).join(" ");
    const city = find("locality")?.longText || find("administrative_area_level_3")?.longText || "";
    const state = find("administrative_area_level_1")?.shortText || "";
    const zip = find("postal_code")?.longText || "";
    const country = find("country")?.shortText || "";

    return Response.json({
      street,
      city,
      state,
      zip,
      country,
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      formatted: place.formattedAddress || ""
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}