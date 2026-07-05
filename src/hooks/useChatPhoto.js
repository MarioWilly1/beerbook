import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";

function compressImage(file, maxDimension = 1080, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width  = maxDimension;
        } else {
          width  = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
    };
    img.src = url;
  });
}

export const useChatPhoto = () => {
  const [uploading, setUploading] = useState(false);

  const uploadChatPhoto = useCallback(async (file, userId) => {
    if (!file || !userId) return null;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("chat-media")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (error) return null;
      const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploadChatPhoto, uploading };
};
