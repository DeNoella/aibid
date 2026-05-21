import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getModelHealth, retrainModel, getModelThreshold, setModelThreshold, getNlpMetrics } from '@/lib/services/admin.service';

export const GET = withAuth(async (_req, user) => {
  requireRole(user, 'admin');
  return NextResponse.json({
    models: getModelHealth(user.organizationId),
    threshold: getModelThreshold(user.organizationId),
    nlpMetrics: getNlpMetrics(user.organizationId),
  });
});

export const PUT = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const { threshold } = await req.json();
  setModelThreshold(user.organizationId, threshold, user.userId);
  return NextResponse.json({ success: true });
});

export const POST = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const { modelId } = await req.json();
  retrainModel(modelId);
  return NextResponse.json({ success: true });
});
