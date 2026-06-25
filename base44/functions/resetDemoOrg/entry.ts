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

    // Find the demo org
    const demoOrgs = await base44.asServiceRole.entities.Organization.filter({ is_demo: true });
    if (demoOrgs.length === 0) {
      return Response.json({ error: 'No demo organization exists to reset.' }, { status: 404 });
    }

    const org = demoOrgs[0];
    const orgId = org.id;

    // Wipe all demo data (same entity list as deleteOrganization, minus the org itself)
    const entitiesToClean = [
      'JobAttachment', 'MaterialReservation', 'InventoryDeductionLog',
      'PurchaseOrder', 'JobService', 'JobTodo', 'Message', 'MessageChannel',
      'ChannelMembership', 'CommMessage', 'Notification', 'ScheduledEvent',
      'TimeEntry', 'TimeAuditLog', 'CorrectionRequest', 'WriteUp',
      'EmployeeDocument', 'EmployeeGoal', 'EmployeeReview', 'OnboardingSurvey',
      'QCInspection', 'ChangeOrder', 'Estimate', 'Invoice',
      'Job', 'Customer', 'Employee', 'Vendor', 'InventoryItem',
      'ServiceCatalog', 'ProductServiceLibrary', 'LineItemCategory',
      'MaterialPriceList', 'RailingStyleLibrary', 'MessageTemplate',
      'TwilioPhoneNumber', 'AttachmentCategory', 'AppSettings', 'AdminActivityLog',
    ];

    for (const entityName of entitiesToClean) {
      const records = await base44.asServiceRole.entities[entityName].filter({ organization_id: orgId });
      const deletions = records.map((r) => base44.asServiceRole.entities[entityName].delete(r.id));
      await Promise.all(deletions);
    }

    const now = new Date().toISOString();
    const orgName = org.name;

    // Re-create the sample data
    // AppSettings
    await base44.asServiceRole.entities.AppSettings.create({
      organization_id: orgId,
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

    // Attachment Categories
    const attachmentCategories = [
      'Cut List', 'Shop Drawings', 'Site Photos', 'Inspiration Photos', 'POs / Receipts', 'Miscellaneous',
    ];
    for (let i = 0; i < attachmentCategories.length; i++) {
      await base44.asServiceRole.entities.AttachmentCategory.create({
        organization_id: orgId,
        name: attachmentCategories[i],
        sort_order: i,
        is_active: true,
      });
    }

    // Customers
    const customerData = [
      { name: 'Riverside Ranch Properties', type: 'Commercial Business', company: 'Riverside Ranch Properties', phone: '(720) 555-0188', email: 'kathy@riversideranch.co', address: '4400 River Ranch Rd, Boulder, CO 80301' },
      { name: 'Downtown Lofts LLC', type: 'Builder / Developer', company: 'Downtown Lofts LLC', phone: '(303) 555-0293', email: 'mike@downtownlofts.com', address: '1550 Wynkoop St, Denver, CO 80202' },
      { name: 'City of Denver Parks Dept', type: 'Commercial Business', company: 'City of Denver', phone: '(720) 913-1313', email: 'parks@denvergov.org', address: '201 W Colfax Ave, Denver, CO 80202' },
    ];
    const customers = {};
    for (const c of customerData) {
      customers[c.name] = await base44.asServiceRole.entities.Customer.create({ organization_id: orgId, ...c });
    }

    // Employees
    const employeeData = [
      { name: 'Alex Ruiz', role: 'shop_manager', work_center_primary: 'Fit', work_center_secondary: 'Weld', email: 'alex.demo@examplefabrication.com', phone: '(303) 555-0311', employment_status: 'Full Time', is_active: true, hourly_rate: 38 },
      { name: 'Jamie Torres', role: 'welder', work_center_primary: 'Weld', work_center_secondary: 'Grind', email: 'jamie.demo@examplefabrication.com', phone: '(303) 555-0312', employment_status: 'Full Time', is_active: true, hourly_rate: 32 },
      { name: 'Morgan Lee', role: 'estimator', work_center_primary: 'Design', email: 'morgan.demo@examplefabrication.com', phone: '(303) 555-0313', employment_status: 'Full Time', is_active: true, hourly_rate: 36 },
    ];
    const employees = {};
    for (const e of employeeData) {
      employees[e.name] = await base44.asServiceRole.entities.Employee.create({ organization_id: orgId, ...e });
    }

    // Jobs
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
        organization_id: orgId,
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

    // Update demo_reset_at
    await base44.asServiceRole.entities.Organization.update(orgId, { demo_reset_at: now });

    // Log audit entry
    await base44.asServiceRole.entities.SuperAdminAuditLog.create({
      admin_email: user.email,
      admin_name: user.full_name || user.email,
      action_type: 'demo_org_reset',
      organization_id: orgId,
      organization_name: orgName,
      action_detail: `Reset demo organization "${orgName}" — all sample data wiped and re-created.`,
      metadata: { is_demo: true },
    });

    return Response.json({
      success: true,
      message: `Demo organization "${orgName}" has been reset with fresh sample data.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});