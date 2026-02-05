import { supabase } from './supabase';

// Subir imagen de cerveza a Supabase Storage
export const uploadBeerImage = async (file, beerId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${beerId}_${Math.random()}.${fileExt}`;
  const filePath = `beer-images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('beer-images')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('beer-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Eliminar imagen de cerveza de Supabase Storage
export const deleteBeerImage = async (url) => {
  const path = url.split('/').pop();
  const { error } = await supabase.storage
    .from('beer-images')
    .remove([`beer-images/${path}`]);

  if (error) throw error;
};
