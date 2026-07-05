import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export const useDM = () => {
  const navigate = useNavigate();

  const openDM = useCallback(async (otherUserId) => {
    const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
      other_user_id: otherUserId,
    });
    if (!error && data) navigate(`/chats/${data}`);
  }, [navigate]);

  return { openDM };
};
