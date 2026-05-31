import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { askQuestion, analyzeFileData, isAIQueryAvailable } from '@/lib/ai-query';

export const POST = withAuth(async (request: NextRequest, user) => {
  const body = await request.json();
  const { question, fileContext } = body;
  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  if (fileContext?.rows?.length) {
    const result = await analyzeFileData(question, {
      filename: fileContext.filename,
      rows: fileContext.rows as Record<string, unknown>[],
      columns: (fileContext.columns as string[]) ?? Object.keys((fileContext.rows[0] as Record<string, unknown>) ?? {}),
    });
    return NextResponse.json({ question, ...result });
  }

  if (!isAIQueryAvailable()) {
    return NextResponse.json(
      { error: 'AI query is not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local' },
      { status: 503 }
    );
  }

  try {
    const result = await askQuestion(question, user.organizationId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI query failed';
    console.error('AI Query error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
