import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { input } = await req.json().catch(() => ({}));
    if (!input || input.trim().length < 3) return Response.json({ suggestions: [] });

    const res = await base44.asServiceRole.connectors.callApi("google_maps", {
      method: "POST",
      host: "places",
      path: "/v1/places:autocomplete",
      query: {},
      body: { input: input.trim(), includedRegionCodes: ["US"] }
    });

    const preds = res.data?.suggestions || [];
    const suggestions = preds
      .map(s => s.placePrediction)
      .filter(Boolean)
      .map(p => ({
        placeId: p.placeId,
        description: p.text?.text || ""
      }));

    return Response.json({ suggestions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}