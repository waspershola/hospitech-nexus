-- Add AI Concierge Settings to navigation
-- NAVIGATION-AI-CONCIERGE-V1: Add AI Concierge Settings page to platform navigation

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM platform_nav_items 
    WHERE path = '/dashboard/ai-concierge'
  ) THEN
    INSERT INTO platform_nav_items (
      name, 
      path, 
      icon, 
      roles_allowed, 
      departments_allowed, 
      order_index, 
      is_active,
      metadata
    )
    VALUES (
      'AI Concierge',
      '/dashboard/ai-concierge',
      'BotMessageSquare',
      ARRAY['owner', 'manager']::text[],
      ARRAY[]::text[],
      145,
      true,
      jsonb_build_object(
        'description', 'Configure AI translation and concierge settings',
        'category', 'settings'
      )
    );
  END IF;
END $$;