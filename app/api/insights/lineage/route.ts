import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getLineage, getRelatedInsights, getInsightTitles } from '@/lib/services/insights.service';

export const GET = withAuth(async (req, user) => {
  requireRole(user, 'analyst');
  const { searchParams } = new URL(req.url);
  const insightId = searchParams.get('insightId');
  if (!insightId) {
    return NextResponse.json({ titles: getInsightTitles(user.organizationId) });
  }
  const lineage = getLineage(user.organizationId, insightId);
  const related = getRelatedInsights(user.organizationId, insightId);
  return NextResponse.json({ lineage, related });
});
