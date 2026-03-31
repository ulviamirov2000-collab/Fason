-- ============================================================
-- Fix notifications RLS so any authenticated user can INSERT
-- a notification for any other user (needed for offer events).
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- Drop the original catch-all policy that blocks cross-user inserts
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;

-- SELECT: users can only read their own notifications
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: any authenticated user can create a notification for anyone
--         (needed so buyer can notify seller, seller can notify buyer)
CREATE POLICY "Auth users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: users can only mark their own notifications as read
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own notifications
CREATE POLICY "Users delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);
