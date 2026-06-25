import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = user.roles || [];
    if (!userRoles.includes('super_admin')) {
      return Response.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
    }

    // Check if a demo org already exists
    const existingDemo = await base44.asServiceRole.entities.Organization.filter({ is_demo: true });
    if (existingDemo.length > 0) {
      return Response.json({
        error: 'A demo organization already exists. Reset it instead of creating a new one.',
        existing_org_id: existingDemo[0].id,
      }, { status: 409 });
    }

    const orgName = 'Example Fabrication Co.';
    const slug = 'example-fabrication-co';
    const now = new Date().toISOString();

    // 1. Create the demo organization
    const org = await base44.asServiceRole.entities.Organization.create({
      name: orgName,
      slug,
      is_active: true,
      plan: 'trial',
      subscription_status: 'active',
      onboarding_completed: true,
      is_demo: true,
      demo_created_at: now,
      demo_reset_at: now,
      primary_trade: 'Miscellaneous Metals',
      shop_size: '6-15 employees',
      default_hourly_rate: 85,
      address: '1450 Industrial Blvd, Denver, CO 80202',
      phone: '(303) 555-0142',
      email: 'info@examplefabrication.com',
    });

    // 2. Create AppSettings
    await base44.asServiceRole.entities.AppSettings.create({
      organization_id: org.id,
      setting_key: 'main',
      system_sender_status: 'disconnected',
      session_timeout_mobile_hours: 8,
      session_timeout_desktop_hours: 4,
      require_2fa_roles: [],
      payroll_workweek_start_day: 1,
      estimate_contract_text: '',
      estimate_approval_email_enabled: false,
      stripe_is_connected: false,
      stripe_mode: '',
    });

    // 3. Create default Attachment Categories
    const attachmentCategories = [
      'Cut List', 'Shop Drawings', 'Site Photos', 'Inspiration Photos', 'POs / Receipts', 'Miscellaneous',
    ];
    for (let i = 0; i < attachmentCategories.length; i++) {
      await base44.asServiceRole.entities.AttachmentCategory.create({
        organization_id: org.id,
        name: attachmentCategories[i],
        sort_order: i,
        is_active: true,
      });
    }

    // 4. Create Customers
    const customerData = [
      { name: 'Riverside Ranch Properties', type: 'Commercial Business', company: 'Riverside Ranch Properties', phone: '(720) 555-0188', email: 'kathy@riversideranch.co', address: '4400 River Ranch Rd, Boulder, CO 80301' },
      { name: 'Downtown Lofts LLC', type: 'Builder / Developer', company: 'Downtown Lofts LLC', phone: '(303) 555-0293', email: 'mike@downtownlofts.com', address: '1550 Wynkoop St, Denver, CO 80202' },
      { name: 'City of Denver Parks Dept', type: 'Commercial Business', company: 'City of Denver', phone: '(720) 913-1313', email: 'parks@denvergov.org', address: '201 W Colfax Ave, Denver, CO 80202' },
    ];
    const customers = {};
    for (const c of customerData) {
      customers[c.name] = await base44.asServiceRole.entities.Customer.create({
        organization_id: org.id,
        ...c,
      });
    }

    // 5. Create Employees (no user accounts, no invites)
    const employeeData = [
      { name: 'Alex Ruiz', role: 'shop_manager', work_center_primary: 'Fit', work_center_secondary: 'Weld', email: 'alex.demo@examplefabrication.com', phone: '(303) 555-0311', employment_status: 'Full Time', is_active: true, hourly_rate: 38 },
      { name: 'Jamie Torres', role: 'welder', work_center_primary: 'Weld', work_center_secondary: 'Grind', email: 'jamie.demo@examplefabrication.com', phone: '(303) 555-0312', employment_status: 'Full Time', is_active: true, hourly_rate: 32 },
      { name: 'Morgan Lee', role: 'estimator', work_center_primary: 'Design', email: 'morgan.demo@examplefabrication.com', phone: '(303) 555-0313', employment_status: 'Full Time', is_active: true, hourly_rate: 36 },
    ];
    const employees = {};
    for (const e of employeeData) {
      employees[e.name] = await base44.asServiceRole.entities.Employee.create({
        organization_id: org.id,
        ...e,
      });
    }

    // 6. Create Jobs
    const jobData = [
      {
        job_name: 'Riverside Ranch — Entry Gate',
        job_type: 'Gate',
        customer: customers['Riverside Ranch Properties'],
        pipeline_board: 'Shop',
        stage: 'Fabricate',
        estimate_total: 4200,
        site_address: '4400 River Ranch Rd, Boulder, CO 80301',
        design_details: '20 ft single-swing driveway gate with cedar inlay and solar keypad entry. Posts: 4" sch 40 steel, set 36" deep in concrete.',
        powder_coat_color: 'Textured Black',
        powder_coat_code: 'RAL 9005',
        assigned_crew_names: ['Alex Ruiz', 'Jamie Torres'],
      },
      {
        job_name: 'Downtown Lofts — Interior Stair Rail',
        job_type: 'Railing',
        customer: customers['Downtown Lofts LLC'],
        pipeline_board: 'Sales',
        stage: 'Estimate in Progress',
        estimate_total: 8750,
        site_address: '1550 Wynkoop St, Denver, CO 80202',
        design_details: '3-story interior stair rail with 1-1/2" round pickets and 1-1/2" square posts. 42" tall, painted matte black. Approx 95 lnft total.',
        powder_coat_color: 'Matte Black',
        powder_coat_code: 'RAL 9004',
        assigned_estimator_name: 'Morgan Lee',
      },
      {
        job_name: 'Morrison Residence — Driveway Gate',
        job_type: 'Gate',
        customer: customers['Riverside Ranch Properties'],
        pipeline_board: 'Shop',
        stage: 'Ready for Install',
        estimate_total: 3100,
        site_address: '2871 Bear Creek Dr, Morrison, CO 80465',
        design_details: '14 ft sliding driveway gate with solar operator. Posts: 6" sch 40 steel. Matched to existing fence style.',
        powder_coat_color: 'Textured Black',
        powder_coat_code: 'RAL 9005',
        assigned_crew_names: ['Alex Ruiz', 'Jamie Torres'],
      },
      {
        job_name: 'Skyline Brewery — Mezzanine Guard Rail',
        job_type: 'Railing',
        customer: customers['Downtown Lofts LLC'],
        pipeline_board: 'Billing',
        stage: '2nd Half Invoice Sent',
        estimate_total: 11400,
        site_address: '2415 Brighton Blvd, Denver, CO 80216',
        design_details: 'Industrial-style mezzanine guard rail, 42" tall, with 1-1/2" square pickets and horizontal mid-rail. 2" square posts. 120 lnft total.',
        powder_coat_color: 'Galvanized + Clear',
        powder_coat_code: 'Galv',
        assigned_crew_names: ['Jamie Torres'],
      },
      {
        job_name: 'City Park Pavilion — Structural Framing',
        job_type: 'Custom Structure',
        customer: customers['City of Denver Parks Dept'],
        pipeline_board: 'Shop',
        stage: 'Fabricate',
        estimate_total: 22000,
        site_address: '1700 N York St, Denver, CO 80206',
        design_details: 'Structural steel shade canopy framing for outdoor pavilion. 8 columns (W8x31), perimeter beams, cross-bracing. Galvanized finish.',
        powder_coat_color: 'Hot-Dip Galvanized',
        powder_coat_code: 'Galv',
        assigned_crew_names: ['Alex Ruiz', 'Jamie Torres', 'Morgan Lee'],
      },
    ];

    let jobCounter = 1;
    for (const j of jobData) {
      const jobNumber = `DEM-${new Date().getFullYear()}-${String(jobCounter).padStart(3, '0')}`;
      jobCounter++;
      await base44.asServiceRole.entities.Job.create({
        organization_id: org.id,
        job_number: jobNumber,
        job_name: j.job_name,
        job_type: j.job_type,
        customer_id: j.customer?.id,
        customer_name: j.customer?.name,
        pipeline_board: j.pipeline_board,
        stage: j.stage,
        stage_entered_at: now,
        status: j.pipeline_board === 'Shop' ? (j.stage === 'Ready for Install' ? 'Install Scheduled' : j.stage === 'Fabricate' ? 'In Fabrication' : 'Approved') : (j.pipeline_board === 'Billing' ? 'Invoiced' : 'Estimate'),
        estimate_total: j.estimate_total,
        site_address: j.site_address,
        design_details: j.design_details,
        powder_coat_color: j.powder_coat_color,
        powder_coat_code: j.powder_coat_code,
        assigned_crew_names: j.assigned_crew_names || [],
        last_activity_date: now,
        lead_source: 'Manual',
      });
    }

    // 7. Log audit entry
    await base44.asServiceRole.entities.SuperAdminAuditLog.create({
      admin_email: user.email,
      admin_name: user.full_name || user.email,
      action_type: 'demo_org_created',
      organization_id: org.id,
      organization_name: orgName,
      action_detail: `Created demo organization "${orgName}" with 5 jobs, 3 employees, 3 customers, and shop settings.`,
      metadata: { is_demo: true },
    });

    return Response.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        is_demo: true,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});