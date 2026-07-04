import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";

function compressImage(file, maxDimension = 1080, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
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
    img.src = objectUrl;
  });
}

export const useCreateStory = (currentUserId, onSuccess) => {
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");

  const createStory = useCallback(async ({ type, file, textContent, textBg }) => {
    if (!currentUserId) return;
    setUploading(true);
    setError("");

    try {
      if (type === "photo") {
        if (!file) throw new Error("No se seleccionó ninguna foto");

        const storyId = crypto.randomUUID();
        const path    = `${currentUserId}/${storyId}.jpg`;
        const blob    = await compressImage(file);

        const { error: upErr } = await supabase.storage
          .from("stories")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw new Error("Error al subir la foto");

        const { error: dbErr } = await supabase.from("stories").insert({
          user_id:    currentUserId,
          type:       "photo",
          photo_path: path,
        });
        if (dbErr) throw new Error("Error al guardar la historia");

      } else {
        if (!textContent?.trim()) throw new Error("El texto no puede estar vacío");

        const { error: dbErr } = await supabase.from("stories").insert({
          user_id:      currentUserId,
          type:         "text",
          text_content: textContent.trim(),
          text_bg:      textBg || "#1c1409",
        });
        if (dbErr) throw new Error("Error al guardar la historia");
      }

      onSuccess?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }, [currentUserId, onSuccess]);

  // Borrar historia propia (DB + Storage si tiene foto)
  const deleteStory = useCallback(async (story) => {
    if (story.photo_path) {
      await supabase.storage.from("stories").remove([story.photo_path]);
    }
    await supabase.from("stories").delete().eq("id", story.id);
    onSuccess?.();
  }, [onSuccess]);

  return { createStory, deleteStory, uploading, error, setError };
};
