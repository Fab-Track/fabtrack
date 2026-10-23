import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendOrgEmailViaResend, isEmailConfigured, getOrgEmailConfig } from '../../shared/email.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    const isAdmin = userRoles.includes('admin') || userRoles.includes('owner') || userRoles.includes('super_admin');
    if (!user || !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Find todos due today or overdue (past due date, not completed, no reminder sent yet)
    const todos = await base44.asServiceRole.entities.JobTodo.filter({
      is_completed: false,
      reminder_sent: false,
    }, 'created_date', 500);

    // Pre-fetch email config once
    let emailConfig = null;
    let orgId = user.organization_id;
    try {
      emailConfig = await getOrgEmailConfig(base44, orgId);
    } catch { /* non-fatal */ }

    let sentCount = 0;

    for (const todo of todos) {
      if (!todo.due_date || !todo.assignee_id) continue;

      const dueDate = todo.due_date;
      const shouldRemind = dueDate === todayStr || dueDate <= todayStr;

      if (!shouldRemind) continue;

      // Create in-app notification for the assignee
      const isOverdue = dueDate < todayStr;
      await base44.asServiceRole.entities.Notification.create({
        title: isOverdue ? 'Overdue To-Do' : 'To-Do Due Today',
        body: `${todo.description} — ${todo.job_number || ''} ${todo.job_name || ''}`,
        type: 'info',
        link: `/jobs/${todo.job_id}`,
        is_read: false,
        target_roles: [],
        assignee_id: todo.assignee_id,
      });

      // Send email reminder to the assignee (if email is configured)
      if (isEmailConfigured(emailConfig)) {
        try {
          const assignee = await base44.asServiceRole.entities.User.get(todo.assignee_id);
          if (assignee?.email) {
            const jobLink = todo.job_id ? `https://fab-track.base44.app/jobs/${todo.job_id}` : '';
            await sendOrgEmailViaResend(base44, orgId, {
              to: assignee.email,
              subject: isOverdue ? `Overdue To-Do: ${todo.description || ''}` : `To-Do Due Today: ${todo.description || ''}`,
              html: `<p>${isOverdue ? 'You have an <strong>overdue</strong> to-do' : 'You have a to-do <strong>due today</strong>'}.</p>` +
                    `<p><strong>${todo.description || '(no description)'}</strong></p>` +
                    `<p>Due: ${todo.due_date}</p>` +
                    (todo.job_name ? `<p>Job: ${todo.job_name} ${todo.job_number ? `(${todo.job_number})` : ''}</p>` : '') +
                    (jobLink ? `<p><a href="${jobLink}">View the job →</a></p>` : '') +
                    `<p style="color:#888;font-size:12px;">This is an automated reminder from FabTrack.</p>`,
              purpose: 'notification',
            });
          }
        } catch { /* non-fatal — in-app notification already created */ }
      }

      // Mark reminder as sent
      await base44.asServiceRole.entities.JobTodo.update(todo.id, {
        reminder_sent: true,
      });

      sentCount++;
    }

    return Response.json({ success: true, sentCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});