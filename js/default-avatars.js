// ============================================================
// FAMILYFLOW — Default Avatars (set img paths on first run)
// ============================================================

export function setDefaultAvatars() {
  // Use image files from /img/ folder — no heavy base64 needed
  const defaults = {
    1: 'img/avatar_1.png',
    2: 'img/avatar_2.png',
    3: 'img/avatar_3.png',
  };
  for (const [userId, path] of Object.entries(defaults)) {
    const key = `ff_avatar_photo_${userId}`;
    if (!localStorage.getItem(key)) {
      // Fetch the image and store as base64 in localStorage
      fetch(path)
        .then(r => r.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = () => localStorage.setItem(key, reader.result);
          reader.readAsDataURL(blob);
        })
        .catch(() => {}); // silently ignore if offline
    }
  }
}
