import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Find todos due today or overdue (past due date, not completed, no reminder sent yet)
    const todos = await base44.asServiceRole.entities.JobTodo.filter({
      is_completed: false,
      reminder_sent: false,
    }, 'created_date', 500);

    let sentCount = 0;

    for (const todo of todos) {
      if (!todo.due_date || !todo.assignee_id) continue;

      const dueDate = todo.due_date;
      const shouldRemind = dueDate === todayStr || dueDate <= todayStr;

      if (!shouldRemind) continue;

      // Create notification for the assignee
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