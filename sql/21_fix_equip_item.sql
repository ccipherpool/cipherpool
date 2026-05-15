-- Fix equip_item: scope unequip to same type, update profiles.avatar_url for avatar items

CREATE OR REPLACE FUNCTION public.equip_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_type     text;
  v_img      text;
BEGIN
  -- Look up the item
  SELECT type, image_url INTO v_type, v_img
  FROM public.store_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Check ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.user_items
    WHERE user_id = v_user_id AND item_id = p_item_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not owned');
  END IF;

  -- Unequip only items of the same type
  UPDATE public.user_items ui
  SET equipped = false
  FROM public.store_items si
  WHERE ui.user_id = v_user_id
    AND ui.item_id = si.id
    AND si.type = v_type;

  -- Equip the selected item
  UPDATE public.user_items
  SET equipped = true
  WHERE user_id = v_user_id AND item_id = p_item_id;

  -- Sync profile columns for visual types
  IF v_type = 'avatar' THEN
    UPDATE public.profiles
    SET avatar_url = v_img
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.equip_item(uuid) TO authenticated;
