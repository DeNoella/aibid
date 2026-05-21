import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { initializeDatabase } from './db';

function seed() {
  const db = initializeDatabase();

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as count FROM organizations').get() as { count: number };
  if (existing.count > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  const orgId = uuid();
  const adminId = uuid();
  const analystId = uuid();
  const passwordHash = bcrypt.hashSync('password123', 10);

  const transaction = db.transaction(() => {
    // Organization
    db.prepare(`INSERT INTO organizations (id, name, domain, industry, size) VALUES (?, ?, ?, ?, ?)`).run(
      orgId, 'AUCA', 'auca.ac.rw', 'Education', '201-500'
    );

    // Users — admin is pre-created with premium; analyst starts on free_trial
    db.prepare(`INSERT INTO users (id, organization_id, email, password_hash, name, role, subscription_status) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      adminId, orgId, 'demo@auca.ac.rw', passwordHash, 'Ange De Noella MUTESI', 'admin', 'premium'
    );
    db.prepare(`INSERT INTO users (id, organization_id, email, password_hash, name, role, subscription_status) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      analystId, orgId, 'analyst@auca.ac.rw', passwordHash, 'John Doe', 'analyst', 'free_trial'
    );

    // User preferences
    for (const userId of [adminId, analystId]) {
      db.prepare(`INSERT INTO user_preferences (id, user_id) VALUES (?, ?)`).run(uuid(), userId);
    }

    // Pipeline stages
    const stageIds = {
      lead: uuid(),
      qualified: uuid(),
      proposal: uuid(),
      negotiation: uuid(),
      won: uuid(),
      lost: uuid(),
    };
    const stages = [
      [stageIds.lead, orgId, 'Lead', 0, 0.10, '#6b7280', 0, 0],
      [stageIds.qualified, orgId, 'Qualified', 1, 0.25, '#3b82f6', 0, 0],
      [stageIds.proposal, orgId, 'Proposal', 2, 0.50, '#8b5cf6', 0, 0],
      [stageIds.negotiation, orgId, 'Negotiation', 3, 0.75, '#f59e0b', 0, 0],
      [stageIds.won, orgId, 'Closed Won', 4, 1.00, '#22c55e', 1, 0],
      [stageIds.lost, orgId, 'Closed Lost', 5, 0.00, '#ef4444', 0, 1],
    ];
    const stageStmt = db.prepare(`INSERT INTO pipeline_stages (id, organization_id, name, position, probability, color, is_won, is_lost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const s of stages) stageStmt.run(...s);

    // Companies
    const companyIds: string[] = [];
    const companyData = [
      ['TechVentures Inc.', 'techventures.com', 'Technology', '51-200', '+1-555-0101', '123 Tech Ave', 'San Francisco', 'US', 'https://techventures.com'],
      ['Global Marketing Co.', 'globalmarketing.co', 'Marketing', '11-50', '+1-555-0102', '456 Market St', 'New York', 'US', 'https://globalmarketing.co'],
      ['DataDriven Analytics', 'datadriven.io', 'Analytics', '11-50', '+1-555-0103', '789 Data Blvd', 'Austin', 'US', 'https://datadriven.io'],
      ['CloudFirst Solutions', 'cloudfirst.com', 'Technology', '201-500', '+1-555-0104', '321 Cloud Way', 'Seattle', 'US', 'https://cloudfirst.com'],
      ['EcoGreen Enterprises', 'ecogreen.org', 'Sustainability', '51-200', '+1-555-0105', '654 Green Rd', 'Portland', 'US', 'https://ecogreen.org'],
      ['FinTech Innovations', 'fintechinno.com', 'Finance', '51-200', '+1-555-0106', '987 Finance Dr', 'Chicago', 'US', 'https://fintechinno.com'],
      ['HealthPlus Systems', 'healthplus.com', 'Healthcare', '201-500', '+1-555-0107', '111 Health St', 'Boston', 'US', 'https://healthplus.com'],
      ['EduLearn Platform', 'edulearn.io', 'Education', '11-50', '+1-555-0108', '222 Edu Lane', 'Kigali', 'RW', 'https://edulearn.io'],
    ];
    const companyStmt = db.prepare(`INSERT INTO companies (id, organization_id, name, domain, industry, size, phone, address, city, country, website, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const c of companyData) {
      const id = uuid();
      companyIds.push(id);
      companyStmt.run(id, orgId, ...c, adminId);
    }

    // Contacts
    const contactIds: string[] = [];
    const contactData = [
      ['Alice', 'Murenzi', 'alice.murenzi@techventures.com', '+1-555-1001', 'CTO', 'customer', 'organic', companyIds[0]],
      ['Bob', 'Kagame', 'bob.kagame@globalmarketing.co', '+1-555-1002', 'Marketing Director', 'sql', 'paid', companyIds[1]],
      ['Claire', 'Uwimana', 'claire.uwimana@datadriven.io', '+1-555-1003', 'Head of Analytics', 'opportunity', 'referral', companyIds[2]],
      ['David', 'Niyonzima', 'david.niyonzima@cloudfirst.com', '+1-555-1004', 'VP Engineering', 'mql', 'social', companyIds[3]],
      ['Emma', 'Habimana', 'emma.habimana@ecogreen.org', '+1-555-1005', 'Sustainability Lead', 'lead', 'email', companyIds[4]],
      ['Frank', 'Mugisha', 'frank.mugisha@fintechinno.com', '+1-555-1006', 'CFO', 'customer', 'direct', companyIds[5]],
      ['Grace', 'Ingabire', 'grace.ingabire@healthplus.com', '+1-555-1007', 'Product Manager', 'sql', 'organic', companyIds[6]],
      ['Henri', 'Bizimana', 'henri.bizimana@edulearn.io', '+1-555-1008', 'CEO', 'opportunity', 'referral', companyIds[7]],
      ['Irene', 'Mukiza', 'irene.mukiza@techventures.com', '+1-555-1009', 'Product Designer', 'lead', 'social', companyIds[0]],
      ['Jean', 'Ndayisaba', 'jean.ndayisaba@globalmarketing.co', '+1-555-1010', 'Content Strategist', 'mql', 'paid', companyIds[1]],
      ['Keza', 'Uwitonze', 'keza.uwitonze@datadriven.io', '+1-555-1011', 'Data Scientist', 'subscriber', 'organic', companyIds[2]],
      ['Louis', 'Nsengimana', 'louis.nsengimana@cloudfirst.com', '+1-555-1012', 'DevOps Lead', 'lead', 'direct', companyIds[3]],
      ['Marie', 'Uwase', 'marie.uwase@ecogreen.org', '+1-555-1013', 'Operations Manager', 'customer', 'referral', companyIds[4]],
      ['Nicolas', 'Hakizimana', 'nicolas.hakizimana@fintechinno.com', '+1-555-1014', 'Risk Analyst', 'mql', 'email', companyIds[5]],
      ['Olive', 'Nyirahabimana', 'olive.nyirahabimana@healthplus.com', '+1-555-1015', 'Research Lead', 'sql', 'organic', companyIds[6]],
    ];
    const contactStmt = db.prepare(`INSERT INTO contacts (id, organization_id, first_name, last_name, email, phone, job_title, lifecycle_stage, source, company_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const c of contactData) {
      const id = uuid();
      contactIds.push(id);
      contactStmt.run(id, orgId, c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], adminId);
    }

    // Deals
    const dealIds: string[] = [];
    const dealData = [
      ['Enterprise Analytics Platform', 85000, stageIds.won, contactIds[0], companyIds[0], '2025-12-15', '2025-12-10'],
      ['Marketing Suite License', 42000, stageIds.negotiation, contactIds[1], companyIds[1], '2026-02-28', null],
      ['Data Pipeline Integration', 65000, stageIds.proposal, contactIds[2], companyIds[2], '2026-03-15', null],
      ['Cloud Migration Project', 120000, stageIds.qualified, contactIds[3], companyIds[3], '2026-04-30', null],
      ['Sustainability Dashboard', 35000, stageIds.lead, contactIds[4], companyIds[4], '2026-05-15', null],
      ['Financial Analytics Module', 95000, stageIds.won, contactIds[5], companyIds[5], '2025-11-20', '2025-11-18'],
      ['Health Data Platform', 78000, stageIds.negotiation, contactIds[6], companyIds[6], '2026-03-01', null],
      ['EdTech Integration', 28000, stageIds.proposal, contactIds[7], companyIds[7], '2026-04-15', null],
      ['Security Audit Tools', 55000, stageIds.won, contactIds[8], companyIds[0], '2025-10-30', '2025-10-28'],
      ['Content Management System', 38000, stageIds.lost, contactIds[9], companyIds[1], '2025-12-01', '2025-12-05'],
      ['Predictive Analytics Suite', 92000, stageIds.qualified, contactIds[10], companyIds[2], '2026-06-30', null],
      ['Infrastructure Monitoring', 48000, stageIds.lead, contactIds[11], companyIds[3], '2026-07-15', null],
      ['Green Energy Tracker', 31000, stageIds.won, contactIds[12], companyIds[4], '2026-01-15', '2026-01-12'],
      ['Compliance Platform', 67000, stageIds.negotiation, contactIds[13], companyIds[5], '2026-03-30', null],
      ['Clinical Trial Manager', 110000, stageIds.proposal, contactIds[14], companyIds[6], '2026-05-30', null],
    ];
    const dealStmt = db.prepare(`INSERT INTO deals (id, organization_id, title, value, stage_id, contact_id, company_id, expected_close_date, actual_close_date, owner_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const d of dealData) {
      const id = uuid();
      dealIds.push(id);
      dealStmt.run(id, orgId, d[0], d[1], d[2], d[3], d[4], d[5], d[6], adminId, adminId);
    }

    // Campaigns
    const campaignIds: string[] = [];
    const campaignData = [
      ['Spring Product Launch', 'email', 'active', 15000, 8500, '2025-03-01', '2025-06-30'],
      ['Social Media Brand Awareness', 'social', 'active', 8000, 5200, '2025-04-01', '2025-09-30'],
      ['PPC Lead Generation', 'ppc', 'active', 25000, 18700, '2025-01-15', '2025-12-31'],
      ['Content Marketing Series', 'content', 'active', 5000, 3100, '2025-02-01', '2025-12-31'],
      ['Holiday Promotion', 'display', 'completed', 12000, 11800, '2025-11-15', '2025-12-31'],
      ['Partner Referral Program', 'referral', 'active', 6000, 2900, '2025-06-01', '2026-06-01'],
      ['Q1 2026 Email Blast', 'email', 'active', 4000, 1200, '2026-01-01', '2026-03-31'],
      ['Webinar Series', 'content', 'active', 7500, 4800, '2025-09-01', '2026-03-31'],
      ['Display Retargeting', 'display', 'paused', 10000, 6500, '2025-07-01', '2026-01-31'],
      ['Annual Conference', 'other', 'completed', 30000, 29500, '2025-10-01', '2025-10-15'],
      ['LinkedIn Ads Campaign', 'social', 'active', 9000, 5100, '2025-08-01', '2026-02-28'],
      ['SEO Content Push', 'content', 'active', 3500, 2100, '2025-05-01', '2025-12-31'],
      ['Customer Win-back', 'email', 'active', 4500, 2800, '2025-11-01', '2026-04-30'],
      ['Product Demo Campaign', 'ppc', 'active', 18000, 12300, '2025-06-15', '2026-06-15'],
      ['Community Building', 'social', 'active', 5500, 3200, '2025-07-01', '2026-07-01'],
      ['Black Friday Sale', 'display', 'completed', 20000, 19800, '2025-11-20', '2025-12-02'],
      ['New Year Promo', 'email', 'active', 6000, 3500, '2025-12-26', '2026-01-15'],
      ['Industry Report Launch', 'content', 'active', 8000, 4200, '2025-09-15', '2026-03-15'],
      ['Referral Bonus Drive', 'referral', 'active', 3000, 1500, '2026-01-15', '2026-06-15'],
      ['Video Ad Campaign', 'display', 'active', 15000, 7800, '2025-10-01', '2026-04-01'],
      ['Case Study Series', 'content', 'active', 4000, 2600, '2025-08-01', '2026-02-28'],
      ['Trade Show 2026', 'other', 'draft', 35000, 0, '2026-05-01', '2026-05-05'],
      ['Podcast Sponsorship', 'other', 'active', 12000, 8000, '2025-06-01', '2026-06-01'],
      ['App Store Promotion', 'ppc', 'active', 10000, 6700, '2025-09-01', '2026-03-31'],
    ];
    const campaignStmt = db.prepare(`INSERT INTO campaigns (id, organization_id, name, type, status, budget, spent, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const c of campaignData) {
      const id = uuid();
      campaignIds.push(id);
      campaignStmt.run(id, orgId, ...c, adminId);
    }

    // Campaign metrics - daily data for last 12 months
    const metricsStmt = db.prepare(`INSERT INTO campaign_metrics (id, campaign_id, date, impressions, clicks, conversions, revenue, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const today = new Date();

    for (const campId of campaignIds) {
      for (let dayOffset = 365; dayOffset >= 0; dayOffset--) {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);
        const dateStr = date.toISOString().split('T')[0];

        const baseImpressions = 800 + Math.floor(Math.random() * 1200);
        const baseClicks = Math.floor(baseImpressions * (0.015 + Math.random() * 0.035));
        const baseConversions = Math.floor(baseClicks * (0.02 + Math.random() * 0.08));
        const baseRevenue = baseConversions * (80 + Math.random() * 120);
        const baseCost = baseClicks * (0.5 + Math.random() * 2.5);

        const month = date.getMonth();
        const seasonMultiplier = month === 11 ? 1.8 : month === 10 ? 1.4 : month === 0 ? 1.3 : month >= 6 && month <= 8 ? 0.85 : 1.0;

        metricsStmt.run(
          uuid(),
          campId,
          dateStr,
          Math.floor(baseImpressions * seasonMultiplier),
          Math.floor(baseClicks * seasonMultiplier),
          Math.floor(baseConversions * seasonMultiplier),
          Math.round(baseRevenue * seasonMultiplier * 100) / 100,
          Math.round(baseCost * seasonMultiplier * 100) / 100
        );
      }
    }

    // Activities
    const activityData = [
      ['call', 'Initial discovery call', 'Discussed requirements and timeline', contactIds[0], dealIds[0], companyIds[0], adminId],
      ['email', 'Sent proposal document', 'Proposal v2 with updated pricing', contactIds[1], dealIds[1], companyIds[1], adminId],
      ['meeting', 'Product demo session', 'Full platform walkthrough with Q&A', contactIds[2], dealIds[2], companyIds[2], analystId],
      ['note', 'Competitor analysis note', 'Client comparing with Salesforce and HubSpot', contactIds[3], dealIds[3], companyIds[3], adminId],
      ['task', 'Prepare custom pricing', 'Build enterprise tier pricing for 500+ seats', contactIds[4], dealIds[4], companyIds[4], analystId],
      ['follow_up', 'Follow up on proposal', 'Check if client reviewed the proposal', contactIds[5], dealIds[5], companyIds[5], adminId],
      ['call', 'Negotiation call', 'Discussing contract terms and SLA', contactIds[6], dealIds[6], companyIds[6], adminId],
      ['email', 'Contract sent', 'Sent final contract for review', contactIds[7], dealIds[7], companyIds[7], analystId],
      ['meeting', 'Quarterly review', 'Review of platform usage and ROI', contactIds[0], dealIds[0], companyIds[0], adminId],
      ['task', 'Update CRM records', 'Clean up duplicate contacts', null, null, null, analystId],
    ];
    const activityStmt = db.prepare(`INSERT INTO activities (id, organization_id, type, subject, description, contact_id, deal_id, company_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const a of activityData) {
      activityStmt.run(uuid(), orgId, ...a);
    }

    // Report templates
    const templateData = [
      ['Weekly Performance', 'Key metrics and trends for the week', 'weekly', 1],
      ['Monthly Summary', 'Comprehensive monthly analytics report', 'monthly', 1],
      ['Quarterly Review', 'Strategic quarterly performance analysis', 'quarterly', 1],
      ['Campaign Analysis', 'Detailed campaign performance breakdown', 'campaign', 1],
      ['Custom Report', 'Build your own custom analytics report', 'custom', 1],
      ['Executive Summary', 'High-level business performance overview', 'executive', 1],
    ];
    const templateStmt = db.prepare(`INSERT INTO report_templates (id, organization_id, name, description, type, is_system) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const t of templateData) {
      templateStmt.run(uuid(), null, ...t);
    }

    // Reports
    const reportData = [
      ['Monthly Analytics Report - December 2025', 'Monthly Summary', 'ready', '2025-12-31T10:00:00'],
      ['Q4 2025 Performance Overview', 'Quarterly Review', 'ready', '2026-01-05T09:00:00'],
      ['Campaign Analysis - Holiday Season', 'Campaign Analysis', 'ready', '2026-01-10T14:30:00'],
      ['Weekly Analytics - Week 8', 'Weekly Performance', 'generating', null],
      ['Monthly Report - January 2026', 'Monthly Summary', 'scheduled', null],
      ['Executive Summary - Q1 2026', 'Executive Summary', 'scheduled', null],
    ];
    const reportStmt = db.prepare(`INSERT INTO reports (id, organization_id, title, type, status, generated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const r of reportData) {
      reportStmt.run(uuid(), orgId, ...r, adminId);
    }

    // Data sources
    const dsData = [
      ['Marketing Campaigns', 'csv', 12500, 'active', 'daily'],
      ['Sales Transactions', 'database', 8750, 'active', 'realtime'],
      ['Customer Analytics', 'api', 15200, 'active', 'hourly'],
      ['Social Media Metrics', 'api', 6800, 'syncing', 'hourly'],
      ['Email Campaign Data', 'json', 3200, 'active', 'daily'],
      ['Web Analytics', 'api', 9400, 'active', 'realtime'],
    ];
    const dsStmt = db.prepare(`INSERT INTO data_sources (id, organization_id, name, type, record_count, status, sync_frequency, last_synced_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const d of dsData) {
      dsStmt.run(uuid(), orgId, d[0], d[1], d[2], d[3], d[4], new Date().toISOString(), adminId);
    }

    // AI insights
    const insightData = [
      ['trend', 'Revenue Growth Acceleration', 'Revenue has grown 23% month-over-month, driven primarily by enterprise deals in the technology sector.', 0.89, 'high'],
      ['anomaly', 'Unusual Campaign Activity Detected', 'PPC campaign click-through rates spiked 340% on Feb 15-17 without corresponding conversion increases.', 0.92, 'medium'],
      ['prediction', 'Q1 2026 Revenue Forecast', 'Based on current pipeline velocity and historical close rates, projected Q1 2026 revenue is $342,000.', 0.76, 'high'],
      ['recommendation', 'Optimize Ad Spend Allocation', 'Shifting 15% of display ad budget to content marketing could improve ROI by 12%.', 0.84, 'high'],
      ['trend', 'Mobile Conversion Improvement', 'Mobile conversions have increased 23% since the responsive redesign.', 0.91, 'medium'],
      ['anomaly', 'Customer Acquisition Cost Spike', 'CPA increased 28% during Jan 15-17. Seasonal competition increase in PPC channels.', 0.87, 'medium'],
    ];
    const insightStmt = db.prepare(`INSERT INTO ai_insights (id, organization_id, type, title, description, confidence, impact) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const i of insightData) {
      insightStmt.run(uuid(), orgId, ...i);
    }

    // Audit logs
    const userNames = ['Ange De Noella MUTESI', 'John Doe'];
    const userIdArr = [adminId, analystId];
    const actions = ['Viewed dashboard', 'Generated report', 'Updated settings', 'Exported data', 'Created campaign', 'Modified deal stage', 'Added contact', 'Logged in'];
    const logModules: string[] = ['Dashboard', 'Reports', 'Settings', 'Data Management', 'CRM', 'CRM', 'CRM', 'Auth'];
    const auditStmt = db.prepare(`INSERT INTO audit_logs (id, organization_id, user_id, user_name, action, module, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (let i = 0; i < 50; i++) {
      const userIdx = Math.floor(Math.random() * 2);
      const actionIdx = Math.floor(Math.random() * actions.length);
      const hoursAgo = Math.floor(Math.random() * 720);
      const timestamp = new Date(today.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();
      auditStmt.run(
        uuid(), orgId, userIdArr[userIdx], userNames[userIdx],
        actions[actionIdx], logModules[actionIdx],
        `${actions[actionIdx]} by ${userNames[userIdx]}`,
        timestamp
      );
    }
  });

  transaction();
  console.log('Database seeded successfully!');
  console.log(`  Organization: AUCA (${orgId})`);
  console.log(`  Admin: demo@auca.ac.rw (password: password123)`);
  console.log(`  Analyst: analyst@auca.ac.rw (password: password123)`);
}

seed();
